import { VectorProtocolsRepository } from './vector-protocols.repository';
import { ClinicalRagPromptBuilder, PatientAnamnesisContext, LongitudinalRecord, CuratedProtocolSnippet } from './rag-prompt';

function runClinicalRecordsUnitTests() {
  console.log('🧪 Iniciando testes unitários do Copiloto Clínico e pgvector...');

  // Teste 1: Formatação de vetor para pgvector
  const sampleVector = [0.0125, -0.9982, 0.5431];
  const formatted = VectorProtocolsRepository.formatVector(sampleVector);
  if (formatted !== '[0.0125,-0.9982,0.5431]') {
    throw new Error(`Falha na formatação de vetor: esperado '[0.0125,-0.9982,0.5431]', obtido '${formatted}'`);
  }
  console.log('  ✅ Serialização para formato pgvector ([...]) validada.');

  // Teste 2: Montagem do Prompt dos 3 Pilares com Guardrails
  const mockPatient: PatientAnamnesisContext = {
    fullName: 'Maria da Silva',
    age: 72,
    clinicalDiagnosis: 'AVC Isquêmico em ACM esquerda + Hemiparesia direita espástica',
    mainComplaints: 'Dificuldade para transferências e risco de queda',
    functionalLimitations: ['Marcha comunitária comprometida', 'Fraqueza em membro superior direito'],
    contraindications: ['Manobras de rotação cervical bruscas', 'Pressão arterial sistólica acima de 180 mmHg'],
    therapeuticGoals: ['Recuperar marcha independente com andador', 'Aumentar amplitude de ombro']
  };

  const mockHistory: LongitudinalRecord[] = [
    {
      date: '2026-09-25',
      professionalName: 'Dr. Roberto Mendes',
      specialization: 'Fisioterapia Neurofuncional',
      summarizedConduct: 'Treino de controle de tronco em sedestação e descarga de peso à direita.',
      patientFeedback: 'Paciente referiu leve cansaço, sem queixas álgicas.',
      nextSessionPlan: 'Evoluir para treino de ortostatismo com suporte.'
    }
  ];

  const mockProtocols: CuratedProtocolSnippet[] = [
    {
      title: 'Diretriz de Reabilitação Pós-AVC - Treino de Marcha e Transferências',
      evidenceLevel: 'Nível 1A',
      indications: ['Hemiparesia espástica pós-AVC subagudo'],
      contraindications: ['Instabilidade hemodinâmica aguda', 'PAS > 180 mmHg'],
      content: 'Recomenda-se treino de marcha com suporte parcial de peso e facilitação neuromuscular proprioceptiva.'
    }
  ];

  const prompt = ClinicalRagPromptBuilder.buildClinicalRecommendationPrompt(
    mockPatient,
    mockHistory,
    mockProtocols,
    'Como posso progredir com segurança o treino de ortostatismo para a dona Maria?'
  );

  // Verificações de integridade dos 3 Pilares no prompt
  if (!prompt.includes('[CONTRAINDICAÇÃO CRÍTICA] Manobras de rotação cervical bruscas')) {
    throw new Error('Falha no Teste 2: Contraindicação crítica não destacada no Pilar 1.');
  }

  if (!prompt.includes('Dr. Roberto Mendes - Fisioterapia Neurofuncional')) {
    throw new Error('Falha no Teste 2: Histórico longitudinal da equipe não incluído no Pilar 2.');
  }

  if (!prompt.includes('Diretriz de Reabilitação Pós-AVC - Treino de Marcha')) {
    throw new Error('Falha no Teste 2: Protocolo curado do pgvector não injetado no Pilar 3.');
  }

  if (!prompt.includes('VALIDAÇÃO DE SEGURANÇA: Se a conduta solicitada violar QUALQUER uma das CONTRAINDICAÇÕES')) {
    throw new Error('Falha no Teste 2: Guardrail mandatório de segurança ausente.');
  }

  console.log('  ✅ Montagem do prompt do Copiloto RAG validada com todos os 3 Pilares e Guardrails.');
  console.log('🎉 Todos os testes clínicos passaram com 100% de sucesso!');
}

runClinicalRecordsUnitTests();
