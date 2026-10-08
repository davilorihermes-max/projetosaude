import { PrismaClient } from '@prisma/client';
import {
  CreateEvolutionInput,
  CopilotRecommendationInput,
  CopilotRecommendationContext,
  ProtocolSearchResult
} from './clinical-records.types';
import { ClinicalRagPromptBuilder, LongitudinalRecord, PatientAnamnesisContext } from './rag-prompt';
import { VectorProtocolsRepository } from './vector-protocols.repository';

export class ClinicalEvolutionService {
  private readonly vectorRepo: VectorProtocolsRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.vectorRepo = new VectorProtocolsRepository(prisma);
  }

  /**
   * Registra a evolução clínica estruturada associada a um atendimento concluído.
   */
  public async recordEvolution(input: CreateEvolutionInput) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: input.attendanceId },
      include: {
        clinicalEvolution: true
      }
    });

    if (!attendance) {
      throw new Error(`Atendimento ${input.attendanceId} não encontrado.`);
    }

    if (attendance.professionalId !== input.professionalId) {
      throw new Error('Acesso negado: apenas o profissional que realizou a sessão pode registrar a evolução clínica.');
    }

    if (attendance.clinicalEvolution) {
      throw new Error('Já existe uma evolução clínica registrada para este atendimento.');
    }

    return this.prisma.clinicalEvolution.create({
      data: {
        attendanceId: attendance.id,
        patientId: attendance.patientId,
        professionalId: attendance.professionalId,
        rawNotes: input.rawNotes,
        audioRecordingUrl: input.audioRecordingUrl,
        transcriptionText: input.transcriptionText,
        summarizedConduct: input.summarizedConduct,
        patientFeedback: input.patientFeedback,
        nextSessionPlan: input.nextSessionPlan,
        aiAssisted: input.aiAssisted ?? false
      }
    });
  }

  /**
   * Recupera o histórico longitudinal das últimas evoluções clínicas do paciente registradas pela equipe multidisciplinar.
   */
  public async getPatientLongitudinalHistory(
    patientId: string,
    limit: number = 5
  ): Promise<LongitudinalRecord[]> {
    const evolutions = await this.prisma.clinicalEvolution.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    return evolutions.map(ev => ({
      date: ev.createdAt.toISOString().split('T')[0],
      professionalName: ev.professional.user.fullName,
      specialization: ev.professional.specialization,
      summarizedConduct: ev.summarizedConduct,
      patientFeedback: ev.patientFeedback || undefined,
      nextSessionPlan: ev.nextSessionPlan || undefined
    }));
  }

  /**
   * Constrói o contexto e o prompt enriquecido para o Copiloto Clínico com RAG de 3 Pilares:
   * Pilar 1: Anamnese estruturada e contraindicações absolutas (invioláveis)
   * Pilar 2: Histórico longitudinal da equipe multiprofissional
   * Pilar 3: Diretrizes recuperadas via busca vetorial no pgvector
   */
  public async buildCopilotContext(
    input: CopilotRecommendationInput
  ): Promise<CopilotRecommendationContext> {
    // 1. Busca dados anamnésicos do paciente
    const patient = await this.prisma.patient.findUnique({
      where: { id: input.patientId }
    });

    if (!patient) {
      throw new Error(`Paciente com ID ${input.patientId} não encontrado.`);
    }

    // Calcula a idade do paciente com precisão
    const ageDiff = Date.now() - patient.birthDate.getTime();
    const age = Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25));

    const patientContext: PatientAnamnesisContext = {
      fullName: patient.fullName,
      age,
      clinicalDiagnosis: patient.clinicalDiagnosis,
      mainComplaints: patient.mainComplaints,
      functionalLimitations: patient.functionalLimitations,
      contraindications: patient.contraindications,
      therapeuticGoals: patient.therapeuticGoals
    };

    // 2. Busca histórico longitudinal recente da equipe
    const recentHistory = await this.getPatientLongitudinalHistory(
      patient.id,
      input.recentHistoryLimit ?? 5
    );

    // 3. Busca vetorial no pgvector (se o vetor de embedding foi fornecido)
    let retrievedProtocols: ProtocolSearchResult[] = [];
    if (input.embeddingVector && input.embeddingVector.length > 0) {
      retrievedProtocols = await this.vectorRepo.findSimilarProtocols(
        input.embeddingVector,
        { limit: input.maxProtocols ?? 3 }
      );
    }

    // 4. Monta o prompt clínico estruturado com guardrails
    const prompt = ClinicalRagPromptBuilder.buildClinicalRecommendationPrompt(
      patientContext,
      recentHistory,
      retrievedProtocols,
      input.therapistQuestion
    );

    return {
      prompt,
      patientContext,
      recentHistory,
      retrievedProtocols
    };
  }
}
