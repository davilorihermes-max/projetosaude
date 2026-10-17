// src/services/scale-ai-agent.ts
import {
  ScaleResult,
  PlannedSession,
  ScaleBottleneck,
  PatientCoverageReport,
  PatientTherapyDemand,
  ProfessionalAvailability,
  CareTeamRelation,
  FixedAppointment,
  TimeBlock
} from './monthly-scale-generator.js';
import { ALL_PRESET_LOCATIONS } from './geocodingService.js';

export interface AgentChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actions?: AgentActionSuggestion[];
  actionExecuted?: {
    type: string;
    description: string;
  };
}

export interface AgentActionSuggestion {
  id: string;
  label: string;
  description?: string;
  actionType:
    | 'ADD_CARE_TEAM'
    | 'EXTEND_WINDOW'
    | 'ENABLE_DAY'
    | 'UPDATE_SESSIONS_COUNT'
    | 'ADD_FIXED_APPOINTMENT'
    | 'REMOVE_BLOCK'
    | 'UPDATE_PATIENT_ADDRESS'
    | 'APPLY_ALL_RECOMMENDATIONS';
  payload: any;
}

export interface ScaleAgentContext {
  scaleResult: ScaleResult | null;
  patientsWithDemands: Array<{
    patientId: string;
    patientName: string;
    address: string;
    neighborhood?: string;
    location?: { latitude: number; longitude: number };
    demands: Array<{
      id: string;
      therapyType: string;
      sessionsPerWeek: number;
      durationMinutes: number;
      preferredShift?: string;
      availableWindows?: any;
    }>;
    unavailabilityBlocks?: TimeBlock[];
  }>;
  professionalAvailabilities: ProfessionalAvailability[];
  careTeams: CareTeamRelation[];
  fixedAppointments: FixedAppointment[];
}

export interface AgentExecutionResult {
  reply: string;
  mutated: boolean;
  newPatientsWithDemands?: ScaleAgentContext['patientsWithDemands'];
  newProfessionalAvailabilities?: ProfessionalAvailability[];
  newCareTeams?: CareTeamRelation[];
  newFixedAppointments?: FixedAppointment[];
  actionExecuted?: {
    type: string;
    description: string;
  };
  suggestedActions?: AgentActionSuggestion[];
}

const WEEKDAY_NAMES_MAP: { [key: string]: number } = {
  segunda: 1,
  seg: 1,
  'segunda-feira': 1,
  terca: 2,
  terça: 2,
  ter: 2,
  'terça-feira': 2,
  quarta: 3,
  qua: 3,
  'quarta-feira': 3,
  quinta: 4,
  qui: 4,
  'quinta-feira': 4,
  sexta: 5,
  sex: 5,
  'sexta-feira': 5,
  sabado: 6,
  sábado: 6,
  sab: 6,
  domingo: 0,
  dom: 0
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  0: 'Domingo'
};

export class ScaleAIAgent {
  /**
   * Obtém a chave de API do Google Gemini configurada no navegador ou ambiente
   */
  public static getStoredApiKey(): string | null {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('omnihome_gemini_api_key');
      if (stored && stored.trim().length > 5) return stored.trim();
    }
    try {
      const viteKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
      if (viteKey && typeof viteKey === 'string' && viteKey.trim().length > 5) return viteKey.trim();
    } catch {}
    try {
      const procKey = process.env?.GEMINI_API_KEY;
      if (procKey && typeof procKey === 'string' && procKey.trim().length > 5) return procKey.trim();
    } catch {}
    return null;
  }

  /**
   * Salva ou remove a chave do Google Gemini no localStorage do navegador
   */
  public static setStoredApiKey(key: string | null): void {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem('omnihome_gemini_api_key', key.trim());
      } else {
        localStorage.removeItem('omnihome_gemini_api_key');
      }
    }
  }

  /**
   * Comunica-se com a API do Google Gemini (Gemini 2.5 Flash / 1.5 Flash) alimentada pelo snapshot integral da escala
   */
  public static async callGemini(
    userPrompt: string,
    ctx: ScaleAgentContext,
    apiKey: string
  ): Promise<string | null> {
    const { scaleResult, patientsWithDemands, professionalAvailabilities, careTeams, fixedAppointments } = ctx;

    const contextPayload = {
      mesAno: scaleResult?.monthLabel || 'Outubro de 2026',
      totalDias: scaleResult?.totalDaysInMonth || 31,
      resumoGeral: scaleResult?.summary || null,
      gargalosAtivos: scaleResult?.bottlenecks || [],
      relatoriosCobertura: scaleResult?.coverageReports || [],
      pacientes: patientsWithDemands.map((p) => ({
        id: p.patientId,
        nome: p.patientName,
        endereco: p.address,
        demandas: p.demands.map((d) => ({
          tipo: d.therapyType,
          sessoesSemanais: d.sessionsPerWeek,
          duracaoMin: d.durationMinutes,
          turnoPreferencial: d.preferredShift,
          janelasHabilitadas: d.availableWindows
        })),
        bloqueiosCompromissos: p.unavailabilityBlocks
      })),
      profissionais: professionalAvailabilities.map((p) => ({
        id: p.professionalId,
        nome: p.professionalName,
        especialidade: p.specialty,
        especialidades: p.specialties,
        horariosDiasSemana: p.weekdayWindows,
        bloqueiosCompromissos: p.unavailabilityBlocks
      })),
      careTeams: careTeams.map((ct) => {
        const pat = patientsWithDemands.find((p) => p.patientId === ct.patientId);
        const profNames = professionalAvailabilities
          .filter((p) => ct.professionalIds.includes(p.professionalId))
          .map((p) => p.professionalName);
        return {
          paciente: pat?.patientName || ct.patientId,
          profissionaisAutorizados: profNames
        };
      }),
      atendimentosAgendados: (scaleResult?.plannedSessions || []).map((s) => ({
        data: s.date,
        horario: s.time,
        paciente: s.patientName,
        terapeuta: s.professionalName,
        terapia: s.therapyType,
        transitoKm: s.transitKmFromPrevious,
        transitoMin: s.transitTimeMinutes
      }))
    };

    const systemInstruction = `Você é o Copiloto Clínico e Operacional Sênior do Projeto Saúde (sistema de home care com inteligência artificial para otimização de escalas e roteirização domiciliar).
Você possui visão raio-X de toda a grade de atendimento, disponibilidade dos terapeutas, rotas geodésicas e necessidades dos pacientes.

DADOS DA ESCALA ATUAL (Snapshot Integral em Tempo Real):
${JSON.stringify(contextPayload, null, 2)}

DIRETRIZES DA ANÁLISE:
1. Responda em português brasileiro com clareza clínica, perspicácia analítica e empatia profissional.
2. Analise profundamente por que um paciente não foi atendido ou por que houve gargalos, cruzando:
   - Especialidades autorizadas e restrição de Care Team (regra de ouro: terapeuta não autorizado jamais pode ser escalado).
   - Janelas de horário diárias de cada profissional (início, término, dias de folga, bloqueios particulares).
   - Turnos preferenciais do paciente (manhã vs tarde), janelas de disponibilidade e tempo de trânsito urbano entre bairros.
3. Se perguntarem sobre um paciente específico (ex: Gabriel) ou profissional (ex: fisio1), avalie a compatibilidade de especialidades, o Care Team, a concorrência por horários matutinos com outros pacientes e a distribuição dos dias.
4. Apresente soluções estratégicas de alto valor (permutas de horários, autorização no Care Team, ampliação de horário ou dias habilitados).
5. Use formatação markdown rica com tópicos, negrito e emojis pertinentes.
6. IMPORTANTE: Responda de forma completa, profunda e concluída, finalizando sempre seus raciocínios e recomendações sem deixar tópicos ou frases pela metade.`;

    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 8192
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn(`[Gemini API] Falha no modelo ${model}:`, errData);
          continue;
        }

        const data = await response.json();
        // Concatena todas as partes (parts) do conteúdo para evitar truncamento quando o Gemini divide a resposta
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const fullText = parts.map((p: any) => p?.text || '').join('');
        if (fullText && fullText.trim()) {
          return fullText.trim();
        }
      } catch (err) {
        console.warn(`[Gemini API] Erro ao chamar ${model}:`, err);
      }
    }

    return null;
  }

  /**
   * Processamento assíncrono avançado que conecta a IA Generativa do Google Gemini
   */
  public static async processMessageAsync(input: string, ctx: ScaleAgentContext): Promise<AgentExecutionResult> {
    const text = input.trim();
    const norm = this.normalizeText(text);

    // Verbos explícitos de mutação imperativa
    const hasMutationVerb =
      norm.includes('mudar') || norm.includes('mude') ||
      norm.includes('alterar') || norm.includes('altere') ||
      norm.includes('ajustar') || norm.includes('ajuste') ||
      norm.includes('aumentar') || norm.includes('aumente') ||
      norm.includes('reduzir') || norm.includes('reduza') ||
      norm.includes('ampliar') || norm.includes('amplie') ||
      norm.includes('definir') || norm.includes('defina') ||
      norm.includes('estender') || norm.includes('estenda') ||
      norm.includes('trocar') || norm.includes('troque') ||
      norm.includes('adicione') || norm.includes('adicionar') ||
      norm.includes('vincular') || norm.includes('vincule') ||
      norm.includes('remover') || norm.includes('remova') ||
      norm.includes('habilite') || norm.includes('habilitar') ||
      norm.includes('fixe') || norm.includes('fixar') ||
      norm.includes('bloqueie') || norm.includes('bloquear');

    // Se for comando direto de mutação de parâmetros, executa pelo motor determinístico
    if (hasMutationVerb) {
      const localResult = this.processMessage(input, ctx);
      if (localResult.mutated) {
        return localResult;
      }
    }

    // Se houver chave Gemini configurada, chama o Google Gemini 2.5 Flash
    const apiKey = this.getStoredApiKey();
    if (apiKey) {
      try {
        const geminiReply = await this.callGemini(input, ctx, apiKey);
        if (geminiReply) {
          const diag = this.diagnoseScale(ctx);
          return {
            reply: geminiReply,
            mutated: false,
            suggestedActions: diag.suggestedActions.slice(0, 3)
          };
        }
      } catch (e) {
        console.warn('[ScaleAIAgent] Erro no Gemini, acionando fallback analítico:', e);
      }
    }

    // Fallback: Motor analítico local robusto
    return this.processMessage(input, ctx);
  }

  /**
   * Analisa a escala atual e gera um diagnóstico completo dos gargalos
   */
  public static diagnoseScale(ctx: ScaleAgentContext): {
    summaryText: string;
    bottlenecksAnalysis: string[];
    idleProfessionals: string[];
    suggestedActions: AgentActionSuggestion[];
  } {
    const { scaleResult, patientsWithDemands, professionalAvailabilities, careTeams } = ctx;

    const suggestedActions: AgentActionSuggestion[] = [];
    const bottlenecksAnalysis: string[] = [];

    if (!scaleResult) {
      return {
        summaryText: 'A escala ainda não foi gerada para este mês.',
        bottlenecksAnalysis: ['Clique em "Recalcular Escala Mensal" para iniciar a avaliação.'],
        idleProfessionals: [],
        suggestedActions: []
      };
    }

    const { summary, coverageReports, bottlenecks, plannedSessions } = scaleResult;

    // 1. Diagnóstico de Gargalos (Care Team, Conflito, Horários)
    const careTeamDeficits = bottlenecks.filter((b) => b.reason === 'NO_CARE_TEAM_SPECIALIST');
    const capacityDeficits = bottlenecks.filter((b) => b.reason === 'PROFESSIONAL_CAPACITY_EXCEEDED');
    const timeConflicts = bottlenecks.filter((b) => b.reason === 'TIME_CONFLICT');

    if (careTeamDeficits.length > 0) {
      // Agrupa por paciente e terapia
      const uniqueDeficits = new Map<string, typeof careTeamDeficits[0]>();
      careTeamDeficits.forEach((d) => {
        const key = `${d.patientId}-${d.therapyType}`;
        if (!uniqueDeficits.has(key)) uniqueDeficits.set(key, d);
      });

      uniqueDeficits.forEach((d) => {
        // Encontra profissional na base que atenda essa especialidade para sugerir inclusão no Care Team
        const candidate = professionalAvailabilities.find((p) => {
          const specs = p.specialties || [p.specialty];
          return specs.some((s) => s.toLowerCase().includes(d.therapyType.toLowerCase().slice(0, 8)));
        });

        if (candidate) {
          bottlenecksAnalysis.push(
            `🚫 **${d.patientName}** necessita de *${d.therapyType}*, mas o profissional disponível **${candidate.professionalName}** não está autorizado na sua Equipe de Cuidado (Care Team).`
          );

          suggestedActions.push({
            id: `act-add-care-${d.patientId}-${candidate.professionalId}`,
            label: `Autorizar ${candidate.professionalName} no Care Team de ${d.patientName.split(' ')[0]}`,
            description: `Resolve o déficit de ${d.therapyType} incluindo o profissional autorizado.`,
            actionType: 'ADD_CARE_TEAM',
            payload: {
              patientId: d.patientId,
              professionalId: candidate.professionalId,
              patientName: d.patientName,
              professionalName: candidate.professionalName
            }
          });
        } else {
          bottlenecksAnalysis.push(
            `🚫 **${d.patientName}** necessita de *${d.therapyType}*, porém não existe nenhum profissional cadastrado no sistema com essa especialidade.`
          );
        }
      });
    }

    if (capacityDeficits.length > 0) {
      bottlenecksAnalysis.push(
        `⏳ Existem **${capacityDeficits.length}** atendimentos não alocados devido à janela de horário esgotada dos profissionais escalados.`
      );
    }

    if (timeConflicts.length > 0) {
      bottlenecksAnalysis.push(
        `⚠️ Detectados conflitos de horários ou sobreposição com compromissos/bloqueios externos.`
      );
    }

    // 2. Pacientes com Déficit Crítico ou Parcial
    const underCovered = coverageReports.filter((r) => r.coveragePercent < 100);
    if (underCovered.length > 0) {
      underCovered.forEach((r) => {
        const diff = r.demandedMonthlySessions - r.allocatedMonthlySessions;
        bottlenecksAnalysis.push(
          `📉 **${r.patientName}**: meta de ${r.weeklyTarget}x/sem (${r.demandedMonthlySessions} no mês). Foram alocadas ${r.allocatedMonthlySessions} sessões (${r.coveragePercent}%). Faltam ${diff} sessões.`
        );
      });
    }

    // 3. Profissionais com pouca ou nenhuma sessão (ociosidade)
    const profSessionCounts = new Map<string, number>();
    plannedSessions.forEach((s) => {
      profSessionCounts.set(s.professionalId, (profSessionCounts.get(s.professionalId) || 0) + 1);
    });

    const idleProfessionals: string[] = [];
    professionalAvailabilities.forEach((p) => {
      const count = profSessionCounts.get(p.professionalId) || 0;
      if (count === 0) {
        idleProfessionals.push(`• **${p.professionalName}** (${p.specialty}): 0 sessões alocadas no mês.`);
      } else if (count < 8) {
        idleProfessionals.push(`• **${p.professionalName}** (${p.specialty}): apenas ${count} sessões no mês (capacidade ociosa).`);
      }
    });

    // Sumário textual
    let summaryText = `A taxa de cobertura global é de **${summary.globalCoveragePercent}%** (${summary.totalAllocatedSessions} de ${summary.totalDemandedSessions} atendimentos). `;
    if (summary.globalCoveragePercent === 100) {
      summaryText += '🎉 **Parabéns! Todas as metas terapêuticas foram 100% atendidas sem nenhum déficit!**';
    } else {
      summaryText += `Identifiquei **${bottlenecks.length} gargalos** principais que impedem o fechamento completo da escala.`;
    }

    return {
      summaryText,
      bottlenecksAnalysis,
      idleProfessionals,
      suggestedActions
    };
  }

  /**
   * Normaliza texto removendo acentos e convertendo para minúsculas
   */
  public static normalizeText(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Encontra um profissional citado no texto ignorando acentos e títulos
   */
  public static findProfessionalInText(
    text: string,
    availabilities: ProfessionalAvailability[]
  ): ProfessionalAvailability | null {
    const normText = this.normalizeText(text);

    return (
      availabilities.find((p) => {
        const fullName = this.normalizeText(p.professionalName);
        const cleanName = fullName.replace(/^(dr\.|dra\.|dr|dra|doutor|doutora)\s+/i, '').trim();
        const parts = cleanName.split(/\s+/).filter((part) => part.length >= 3);

        if (normText.includes(fullName) || normText.includes(cleanName)) return true;

        return parts.some((part) => {
          const regex = new RegExp(`\\b${part}\\b`, 'i');
          return regex.test(normText);
        });
      }) || null
    );
  }

  /**
   * Encontra um paciente citado no texto ignorando acentos
   */
  public static findPatientInText(
    text: string,
    patients: ScaleAgentContext['patientsWithDemands']
  ): ScaleAgentContext['patientsWithDemands'][0] | null {
    const normText = this.normalizeText(text);

    return (
      patients.find((p) => {
        const fullName = this.normalizeText(p.patientName);
        const parts = fullName.split(/\s+/).filter((part) => part.length >= 3);

        if (normText.includes(fullName)) return true;

        return parts.some((part) => {
          const regex = new RegExp(`\\b${part}\\b`, 'i');
          return regex.test(normText);
        });
      }) || null
    );
  }

  /**
   * Explica detalhadamente a disponibilidade, horários de atendimento, bloqueios e sessões alocadas de um profissional
   */
  public static explainProfessionalSituation(
    professional: ProfessionalAvailability,
    ctx: ScaleAgentContext
  ): AgentExecutionResult {
    const { scaleResult, careTeams, patientsWithDemands } = ctx;

    const weekdayLabels = WEEKDAY_LABELS;

    let reply = `### 🧑‍⚕️ Agenda & Disponibilidade: ${professional.professionalName}\n\n`;

    // Especialidades e Ponto Base
    const specs =
      professional.specialties && professional.specialties.length > 0
        ? professional.specialties.join(', ')
        : professional.specialty;
    reply += `🩺 **Especialidades:** ${specs}\n`;
    if (professional.baseLocation) {
      reply += `📍 **Ponto Base:** Coordenadas (${professional.baseLocation.latitude.toFixed(4)}, ${professional.baseLocation.longitude.toFixed(4)})\n\n`;
    }

    // Grade de horários dia a dia
    reply += `#### ⏰ Horários de Atendimento por Dia da Semana:\n`;
    const windows = professional.weekdayWindows || {};
    let totalWorkingDays = 0;

    [1, 2, 3, 4, 5, 6, 0].forEach((dayNum) => {
      const win = windows[dayNum];
      const dayName = weekdayLabels[dayNum];
      if (win && win.enabled) {
        totalWorkingDays++;
        reply += `• ✅ **${dayName}:** das **${win.startTime} às ${win.endTime}**\n`;
      } else {
        reply += `• ⚪ *${dayName}:* Não atende\n`;
      }
    });

    // Bloqueios de Indisponibilidade
    const blocks = professional.unavailabilityBlocks || [];
    if (blocks.length > 0) {
      reply += `\n#### ⛔ Bloqueios de Horário / Compromissos Externos (${blocks.length}):\n`;
      blocks.forEach((b) => {
        const dayLabel = b.dayOfWeek !== undefined ? weekdayLabels[b.dayOfWeek] : b.dateStr || 'Data';
        reply += `• 🚫 **${dayLabel}:** das ${b.startTime} às ${b.endTime}${b.reason ? ` *(${b.reason})*` : ''}\n`;
      });
    }

    // Sessões alocadas na escala mensal
    if (scaleResult && scaleResult.plannedSessions) {
      const profSessions = scaleResult.plannedSessions.filter(
        (s) => s.professionalId === professional.professionalId
      );
      reply += `\n#### 📅 Atendimentos Agendados na Escala do Mês:\n`;
      reply += `• **Total de sessões atribuídas:** **${profSessions.length} sessões** no mês.\n`;

      if (profSessions.length === 0) {
        reply += `• ⚠️ **Capacidade Ociosa:** Nenhuma sessão foi alocada ainda para este profissional no mês atual.\n`;
      } else {
        const patientCounts = new Map<string, number>();
        profSessions.forEach((s) => {
          patientCounts.set(s.patientName, (patientCounts.get(s.patientName) || 0) + 1);
        });

        const patientSummary: string[] = [];
        patientCounts.forEach((count, patName) => {
          patientSummary.push(`${patName} (${count}x)`);
        });
        reply += `• **Pacientes em atendimento:** ${patientSummary.join(', ')}\n\n`;

        // Grade Semanal Recorrente
        const weeklyDist = new Map<string, { patientName: string; therapy: string; time: string; count: number }>();
        profSessions.forEach((s) => {
          const d = new Date(s.date + 'T12:00:00');
          const dayName = weekdayLabels[d.getDay()] || 'Dia';
          const key = `${dayName}-${s.time}-${s.patientName}`;
          if (!weeklyDist.has(key)) {
            weeklyDist.set(key, { patientName: s.patientName, therapy: s.therapyType, time: s.time, count: 1 });
          } else {
            weeklyDist.get(key)!.count++;
          }
        });

        reply += `• **Grade de Atendimentos Recorrente:**\n`;
        weeklyDist.forEach((val, key) => {
          const [dayName] = key.split('-');
          reply += `  - 🗓️ **${dayName} às ${val.time}:** ${val.patientName} (*${val.therapy}* — ${val.count}x no mês)\n`;
        });
      }
    }

    // Pacientes autorizados no Care Team
    const authorizedPatients = patientsWithDemands.filter((p) => {
      const ct = careTeams.find((c) => c.patientId === p.patientId);
      return ct?.professionalIds.includes(professional.professionalId);
    });

    reply += `\n#### 🛡️ Equipes de Cuidado (Care Team):\n`;
    if (authorizedPatients.length > 0) {
      reply += `• Autorizado para atender: **${authorizedPatients.map((p) => p.patientName).join(', ')}**\n`;
    } else {
      reply += `• ⚠️ *Não está vinculado ao Care Team de nenhum paciente ativo no momento.*\n`;
    }

    // Sugestões de Ação
    const suggestions: AgentActionSuggestion[] = [];

    if (!windows[0]?.enabled) {
      suggestions.push({
        id: `act-enable-dom-${professional.professionalId}`,
        label: `Habilitar Domingo para ${professional.professionalName.split(' ')[0]}`,
        actionType: 'ENABLE_DAY',
        payload: {
          professionalId: professional.professionalId,
          dayOfWeek: 0,
          startTime: '08:00',
          endTime: '13:00'
        }
      });
    }

    if (!windows[6]?.enabled) {
      suggestions.push({
        id: `act-enable-sab-${professional.professionalId}`,
        label: `Habilitar Sábado para ${professional.professionalName.split(' ')[0]}`,
        actionType: 'ENABLE_DAY',
        payload: {
          professionalId: professional.professionalId,
          dayOfWeek: 6,
          startTime: '08:00',
          endTime: '13:00'
        }
      });
    }

    return {
      reply,
      mutated: false,
      suggestedActions: suggestions
    };
  }

  /**
   * Processa a mensagem do planejador e executa ações de modificação de parâmetros ou diagnóstico
   */
  public static processMessage(input: string, ctx: ScaleAgentContext): AgentExecutionResult {
    const text = input.trim();
    const lower = text.toLowerCase();
    const norm = this.normalizeText(text);

    // Identifica entidades citadas na mensagem
    const matchedProfessional = this.findProfessionalInText(text, ctx.professionalAvailabilities);
    const matchedPatient = this.findPatientInText(text, ctx.patientsWithDemands);

    // Identifica se é uma pergunta / consulta informativa (e NÃO um comando de alteração)
    const hasQuestionIndicator =
      norm.startsWith('qual') ||
      norm.startsWith('quais') ||
      norm.startsWith('como') ||
      norm.startsWith('onde') ||
      norm.startsWith('quando') ||
      norm.startsWith('quem') ||
      norm.startsWith('por que') ||
      norm.startsWith('porque') ||
      norm.startsWith('me diga') ||
      norm.startsWith('diga') ||
      norm.startsWith('ver') ||
      norm.startsWith('veja') ||
      norm.startsWith('mostrar') ||
      norm.startsWith('mostre') ||
      norm.startsWith('consulte') ||
      norm.startsWith('consultar') ||
      norm.includes('?') ||
      norm.includes('sobre a disponibilidade') ||
      norm.includes('sobre a agenda') ||
      norm.includes('sobre os horarios') ||
      norm.includes('sobre o horario') ||
      norm.includes('horarios disponiveis') ||
      norm.includes('horario disponivel') ||
      norm.includes('disponibilidade de') ||
      norm.includes('disponibilidade do') ||
      norm.includes('disponibilidade da');

    // Verbos explícitos de alteração / mutação imperativa
    const hasMutationVerb =
      norm.includes('mudar') || norm.includes('mude') ||
      norm.includes('alterar') || norm.includes('altere') ||
      norm.includes('ajustar') || norm.includes('ajuste') ||
      norm.includes('aumentar') || norm.includes('aumente') ||
      norm.includes('reduzir') || norm.includes('reduza') ||
      norm.includes('ampliar') || norm.includes('amplie') ||
      norm.includes('definir') || norm.includes('defina') ||
      norm.includes('estender') || norm.includes('estenda') ||
      norm.includes('trocar') || norm.includes('troque');

    // ============================================================
    // CASO 0: CONSULTA DE ATENDIMENTOS POR DIA ESPECÍFICO DO MÊS
    // ============================================================
    const dayMatch = norm.match(/(?:dia|data)\s+(\d{1,2})\b/);
    if (
      dayMatch &&
      (hasQuestionIndicator ||
        norm.includes('atend') ||
        norm.includes('sess') ||
        norm.includes('agenda') ||
        norm.includes('escala') ||
        norm.includes('rota') ||
        norm.includes('quem') ||
        norm.includes('o que tem') ||
        norm.includes('visita'))
    ) {
      const dayNum = parseInt(dayMatch[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        return this.explainDaySchedule(dayNum, ctx);
      }
    }

    // ============================================================
    // CASO 1: CONSULTAS INFORMATIVAS DE PROFISSIONAL OU PACIENTE
    // ============================================================
    if (matchedProfessional && (hasQuestionIndicator || !hasMutationVerb)) {
      if (
        hasQuestionIndicator ||
        norm.includes('horario') ||
        norm.includes('disponib') ||
        norm.includes('agenda') ||
        norm.includes('atende') ||
        norm.includes('sess') ||
        norm.includes('dia') ||
        norm.includes('sobre')
      ) {
        return this.explainProfessionalSituation(matchedProfessional, ctx);
      }
    }

    if (matchedPatient && (hasQuestionIndicator || !hasMutationVerb)) {
      if (
        hasQuestionIndicator ||
        norm.includes('situac') ||
        norm.includes('meta') ||
        norm.includes('cobertura') ||
        norm.includes('demanda') ||
        norm.includes('sess') ||
        norm.includes('gargalo') ||
        norm.includes('atend') ||
        norm.includes('sobre')
      ) {
        return this.explainPatientSituation(matchedPatient, ctx);
      }
    }

    // ============================================================
    // CASO 1.5: CONSULTAS SOBRE O PANORAMA / RESULTADO DA ESCALA
    // ============================================================
    const isScaleOverview =
      norm.includes('resumo da escala') ||
      norm.includes('resultado da escala') ||
      norm.includes('como ficou a escala') ||
      norm.includes('como esta a escala') ||
      norm.includes('como e a escala') ||
      norm.includes('quantos atendimentos') ||
      norm.includes('quantas sessoes') ||
      norm.includes('total de atendimentos') ||
      norm.includes('total de sessoes') ||
      norm.includes('sessoes agendadas') ||
      norm.includes('atendimentos agendados') ||
      norm.includes('escala criada') ||
      norm.includes('escala gerada') ||
      norm.includes('escala pronta') ||
      norm.includes('sobre a escala') ||
      norm.includes('ver a escala') ||
      norm.includes('mostrar a escala') ||
      norm.includes('escala do mes') ||
      norm.includes('escala mensal') ||
      norm.includes('metricas da escala') ||
      norm.includes('estatisticas da escala') ||
      norm.includes('cobertura da escala') ||
      norm.includes('taxa de cobertura') ||
      norm.includes('distancia total') ||
      norm.includes('deslocamento total') ||
      norm.includes('quem atende quem') ||
      (norm.includes('escala') && (hasQuestionIndicator || norm.includes('resumo') || norm.includes('status')));

    if (isScaleOverview && !hasMutationVerb) {
      return this.explainScaleOverview(ctx);
    }

    // ============================================================
    // CASO 2: COMANDOS DE MUTAÇÃO IMPERATIVA DE PARÂMETROS
    // ============================================================

    // 2.1. Alterar Endereço do Paciente
    if (
      (norm.includes('endereco') || norm.includes('mudou para') || norm.includes('mudar para') || norm.includes('novo endereco')) &&
      (hasMutationVerb || norm.includes('mudou') || norm.includes('novo'))
    ) {
      const addrRes = this.handleUpdatePatientAddress(text, ctx);
      if (addrRes) return addrRes;
    }

    // 2.2. Adicionar / Vincular ao Care Team
    if (
      (norm.includes('adicione') || norm.includes('adicionar') || norm.includes('vincular') || norm.includes('vincule') || norm.includes('incluir') || norm.includes('inclua') || norm.includes('autorizar') || norm.includes('autorize')) &&
      (norm.includes('care team') || norm.includes('equipe') || norm.includes('paciente') || norm.includes('careteam'))
    ) {
      return this.handleCareTeamCommand(text, ctx, true);
    }

    // 2.3. Remover do Care Team
    if (
      (norm.includes('remover') || norm.includes('remova') || norm.includes('retirar') || norm.includes('retire') || norm.includes('desvincular') || norm.includes('desvincule')) &&
      (norm.includes('care team') || norm.includes('equipe'))
    ) {
      return this.handleCareTeamCommand(text, ctx, false);
    }

    // 2.4. Habilitar dia de atendimento (ex: "Habilite domingo para Dr. Rafael")
    if (
      !hasQuestionIndicator &&
      (norm.includes('habilite') || norm.includes('habilitar') || norm.includes('ative') || norm.includes('ativar') || norm.includes('coloque para atender')) &&
      (norm.includes('domingo') || norm.includes('sabado') || norm.includes('segunda') || norm.includes('terca') || norm.includes('quarta') || norm.includes('quinta') || norm.includes('sexta'))
    ) {
      return this.handleToggleDayCommand(text, ctx, true);
    }

    // 2.5. Ampliar ou alterar jornada diária (ex: "Aumente o horário do Dr. Rafael na terça para 08:00 às 18:00")
    if (
      hasMutationVerb &&
      (norm.includes('horario') || norm.includes('jornada'))
    ) {
      const windowChange = this.handleTimeWindowChange(text, ctx);
      if (windowChange) return windowChange;
    }

    // 2.6. Alterar frequência semanal de sessões do paciente
    if (
      hasMutationVerb &&
      (norm.includes('frequencia') || norm.includes('vezes') || norm.includes('sessoes') || norm.includes('meta'))
    ) {
      const freqChange = this.handleFrequencyChange(text, ctx);
      if (freqChange) return freqChange;
    }

    // 2.7. Fixar Atendimento
    if (norm.includes('fixe') || norm.includes('fixar') || norm.includes('travar')) {
      const fixResult = this.handleFixAppointmentCommand(text, ctx);
      if (fixResult) return fixResult;
    }

    // 2.8. Adicionar Bloqueio de Indisponibilidade
    if (norm.includes('bloquear') || norm.includes('bloqueie') || norm.includes('adicionar bloqueio')) {
      const blockResult = this.handleBlockCommand(text, ctx);
      if (blockResult) return blockResult;
    }

    // ============================================================
    // CASO 3: CONSULTAS DE ENTIDADE SE NÃO CAIU ANTERIORMENTE
    // ============================================================
    if (matchedProfessional) {
      return this.explainProfessionalSituation(matchedProfessional, ctx);
    }

    if (matchedPatient) {
      return this.explainPatientSituation(matchedPatient, ctx);
    }

    // ============================================================
    // CASO 4: CONSULTA GERAL DE GARGALOS E DIAGNÓSTICO DA ESCALA
    // ============================================================
    if (
      norm.includes('gargalo') ||
      norm.includes('dificuldade') ||
      norm.includes('fechar') ||
      norm.includes('ajuda') ||
      norm.includes('diagnostico') ||
      norm.includes('por que') ||
      norm.includes('porque') ||
      norm.includes('ocioso') ||
      norm.includes('ociosidade') ||
      norm.includes('deficit')
    ) {
      const diag = this.diagnoseScale(ctx);
      let reply = `### 🧠 Diagnóstico da Escala Mensal\n\n${diag.summaryText}\n\n`;

      if (diag.bottlenecksAnalysis.length > 0) {
        reply += `#### 🔍 Principais Dificuldades Encontradas:\n`;
        diag.bottlenecksAnalysis.forEach((b) => {
          reply += `${b}\n\n`;
        });
      }

      if (diag.idleProfessionals.length > 0) {
        reply += `#### 🩺 Capacidade Ociosa Identificada:\n`;
        diag.idleProfessionals.forEach((p) => {
          reply += `${p}\n`;
        });
        reply += `\n*Dica: Você pode me pedir para vincular esses profissionais aos pacientes com déficit dizendo, por exemplo:* **"Vincule o [Profissional] ao Care Team de [Paciente]"**.\n`;
      }

      return {
        reply,
        mutated: false,
        suggestedActions: diag.suggestedActions
      };
    }

    // ============================================================
    // CASO 5: MENSAGEM PADRÃO COM ORIENTAÇÕES E DICAS
    // ============================================================
    return {
      reply:
        `Olá! Sou seu **Copiloto Inteligente de Escala e Roteirização**. 🩺\n\nPosso ajudar você a entender qualquer dificuldade para fechar a escala e também **alterar parâmetros diretamente pelo chat**. Você pode me pedir, por exemplo:\n\n` +
        `• **Consultar Disponibilidade do Profissional:** *"Quais os horários disponíveis de Sérgio?"* ou *"Disponibilidade do Dr. Rafael"*\n` +
        `• **Diagnóstico Geral:** *"Quais os gargalos para fechar a escala deste mês?"*\n` +
        `• **Situação do Paciente:** *"Por que a Mariana não atingiu 100% da meta?"*\n` +
        `• **Alterar Care Team:** *"Autorize o Dr. Rafael no Care Team da Mariana"*\n` +
        `• **Ajustar Horário:** *"Aumente o horário da Dra. Amanda na terça-feira para 08:00 às 19:00"*\n` +
        `• **Ativar Domingo/Fins de Semana:** *"Habilite domingo para o Dr. Lucas das 08:00 às 13:00"*\n` +
        `• **Alterar Metas:** *"Altere as sessões semanais do Roberto para 3 vezes"*\n` +
        `• **Fixar Atendimento:** *"Fixe Mariana com Dr. Rafael na terça às 09:00"*\n` +
        `• **Bloquear Horário:** *"Bloqueie Dr. Rafael na quinta das 10:00 às 12:00"*\n\n` +
        `Como posso te ajudar agora?`,
      mutated: false,
      suggestedActions: this.diagnoseScale(ctx).suggestedActions.slice(0, 3)
    };
  }

  /**
   * Altera endereço e localização geodésica do paciente para roteirização
   */
  private static handleUpdatePatientAddress(rawMessage: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { patientsWithDemands } = ctx;
    const patient = this.findPatientInText(rawMessage, patientsWithDemands);
    if (!patient) return null;

    // Extrai o novo endereço (ex: "para Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES")
    const match = rawMessage.match(/(?:para|novo endereço:?)\s+([A-Za-z0-9À-ÿ\s,.\-ºª]+)/i);
    let newAddress = match ? match[1].trim() : '';

    newAddress = newAddress.replace(/^(o|a|do|da|de|novo endereço)\s+/i, '');

    if (!newAddress || newAddress.length < 3) {
      return {
        reply: `⚠️ Identifiquei o paciente **${patient.patientName}**, mas informe o novo endereço como, por exemplo: *"Mudar endereço de ${patient.patientName} para Rua Aleixo Netto, 800 - Praia do Canto, Vitória"*.`,
        mutated: false
      };
    }

    // Procura em presets cadastrados ou usa coordenadas padrão do Espírito Santo
    let newCoords = { latitude: -20.3012, longitude: -40.2925 };
    const norm = newAddress.toLowerCase();
    for (const [presetName, loc] of Object.entries(ALL_PRESET_LOCATIONS as Record<string, any>)) {
      if (norm.includes(presetName.toLowerCase()) || norm.includes((loc.address || '').toLowerCase())) {
        newCoords = { latitude: loc.latitude, longitude: loc.longitude };
        break;
      }
    }

    const newPatientsWithDemands = patientsWithDemands.map((p) => {
      if (p.patientId === patient.patientId) {
        return {
          ...p,
          address: newAddress,
          neighborhood: newAddress,
          location: newCoords
        };
      }
      return p;
    });

    return {
      reply: `📍 **Endereço do Paciente Atualizado!**\n\n` +
        `• **Paciente:** ${patient.patientName}\n` +
        `• **Novo Domicílio:** ${newAddress}\n` +
        `• **Coordenadas:** ${newCoords.latitude.toFixed(6)}, ${newCoords.longitude.toFixed(6)}\n\n` +
        `A rota diária, tempos de trânsito e o mapa do planejador foram recalculados com o novo endereço!`,
      mutated: true,
      newPatientsWithDemands,
      actionExecuted: {
        type: 'UPDATE_PATIENT_ADDRESS',
        description: `Novo endereço de ${patient.patientName}: ${newAddress}`
      }
    };
  }

  /**
   * Executa vinculação ou desvinculação de Care Team via chat
   */
  private static handleCareTeamCommand(rawMessage: string, ctx: ScaleAgentContext, isAdd: boolean): AgentExecutionResult {
    const { patientsWithDemands, professionalAvailabilities, careTeams } = ctx;

    const patient = this.findPatientInText(rawMessage, patientsWithDemands);
    const professional = this.findProfessionalInText(rawMessage, professionalAvailabilities);

    if (!patient || !professional) {
      return {
        reply: `⚠️ Não consegui identificar claramente o paciente ou o profissional no seu comando. Por favor, especifique os nomes como, por exemplo: **"${isAdd ? 'Vincular' : 'Remover'} Dr. Rafael no Care Team da Mariana"**.`,
        mutated: false
      };
    }

    const currentCt = careTeams.find((ct) => ct.patientId === patient.patientId) || {
      patientId: patient.patientId,
      professionalIds: []
    };

    let nextIds: string[];
    if (isAdd) {
      if (currentCt.professionalIds.includes(professional.professionalId)) {
        return {
          reply: `ℹ️ O profissional **${professional.professionalName}** já faz parte da Equipe de Cuidado (Care Team) de **${patient.patientName}**.`,
          mutated: false
        };
      }
      nextIds = [...currentCt.professionalIds, professional.professionalId];
    } else {
      nextIds = currentCt.professionalIds.filter((id: string) => id !== professional.professionalId);
    }

    const newCareTeams = [
      ...careTeams.filter((ct) => ct.patientId !== patient.patientId),
      { patientId: patient.patientId, professionalIds: nextIds }
    ];

    const actionDesc = isAdd
      ? `Inclusão de ${professional.professionalName} no Care Team de ${patient.patientName}`
      : `Remoção de ${professional.professionalName} do Care Team de ${patient.patientName}`;

    return {
      reply: isAdd
        ? `✅ **Sucesso!** O profissional **${professional.professionalName}** foi incluído na Equipe de Cuidado (Care Team) de **${patient.patientName}**.\n\nA escala foi recalculada automaticamente com as rotas geodésicas atualizadas!`
        : `✅ **Sucesso!** O profissional **${professional.professionalName}** foi removido do Care Team de **${patient.patientName}**. A escala foi recalculada.`,
      mutated: true,
      newCareTeams,
      actionExecuted: {
        type: isAdd ? 'ADD_CARE_TEAM' : 'REMOVE_CARE_TEAM',
        description: actionDesc
      }
    };
  }

  /**
   * Habilita ou desabilita um dia da semana na agenda do terapeuta
   */
  private static handleToggleDayCommand(rawMessage: string, ctx: ScaleAgentContext, enabled: boolean): AgentExecutionResult {
    const { professionalAvailabilities } = ctx;
    const professional = this.findProfessionalInText(rawMessage, professionalAvailabilities);

    if (!professional) {
      return {
        reply: `⚠️ Não consegui identificar para qual profissional você deseja alterar a disponibilidade. Exemplo: **"Habilite domingo para Dra. Beatriz"**.`,
        mutated: false
      };
    }

    const lower = rawMessage.toLowerCase();
    const norm = this.normalizeText(rawMessage);

    // Acha o dia da semana citado
    let targetDayNum: number | null = null;
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (norm.includes(dayKey) || lower.includes(dayKey)) {
        targetDayNum = dayNum;
        break;
      }
    }

    if (targetDayNum === null) {
      return {
        reply: `⚠️ Por favor, informe o dia da semana (ex: domingo, sábado, segunda, etc.).`,
        mutated: false
      };
    }

    // Extrai horário se mencionado (ex: "das 08:00 às 13:00")
    const timeMatch = lower.match(/(\d{1,2}:\d{2})\s*(?:às|as|a|-)\s*(\d{1,2}:\d{2})/);
    const startTime = timeMatch ? timeMatch[1] : '08:00';
    const endTime = timeMatch ? timeMatch[2] : (targetDayNum === 0 || targetDayNum === 6 ? '13:00' : '18:00');

    const dayNameStr = Object.keys(WEEKDAY_NAMES_MAP).find((k) => WEEKDAY_NAMES_MAP[k] === targetDayNum) || 'dia';

    const newProfessionalAvailabilities = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === professional.professionalId) {
        const currentWin = prof.weekdayWindows?.[targetDayNum!] || { enabled: false, startTime: '08:00', endTime: '18:00' };
        return {
          ...prof,
          weekdayWindows: {
            ...prof.weekdayWindows,
            [targetDayNum!]: {
              ...currentWin,
              enabled,
              startTime,
              endTime
            }
          }
        };
      }
      return prof;
    });

    return {
      reply: `✅ **Jornada Atualizada!** ${enabled ? 'Habilitei' : 'Desabilitei'} o atendimento de **${professional.professionalName}** aos **${dayNameStr}s** (${startTime} às ${endTime}).\n\nA escala mensal foi recalculada instantaneamente!`,
      mutated: true,
      newProfessionalAvailabilities,
      actionExecuted: {
        type: 'UPDATE_WINDOW',
        description: `${enabled ? 'Habilitação' : 'Desabilitação'} de ${dayNameStr} para ${professional.professionalName}`
      }
    };
  }

  /**
   * Altera horário de início e término de um dia de trabalho
   */
  private static handleTimeWindowChange(rawMessage: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { professionalAvailabilities } = ctx;
    const professional = this.findProfessionalInText(rawMessage, professionalAvailabilities);
    if (!professional) return null;

    const lower = rawMessage.toLowerCase();
    const norm = this.normalizeText(rawMessage);

    let targetDayNum: number | null = null;
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (norm.includes(dayKey) || lower.includes(dayKey)) {
        targetDayNum = dayNum;
        break;
      }
    }

    if (targetDayNum === null) return null;

    const timeMatch = lower.match(/(\d{1,2}:\d{2})\s*(?:às|as|a|-)\s*(\d{1,2}:\d{2})/);
    const startMatch = lower.match(/(?:das|a partir das|início às|inicio as)\s*(\d{1,2}:\d{2})/);
    const endMatch = lower.match(/(?:às|as|até às|até as|ate as|término às|termino as)\s*(\d{1,2}:\d{2})/);

    // Se NÃO houver indicação explícita de horários, JAMAIS muta a janela
    if (!timeMatch && !startMatch && !endMatch) {
      return null;
    }

    let startTime = timeMatch ? timeMatch[1] : (startMatch ? startMatch[1] : '08:00');
    let endTime = timeMatch ? timeMatch[2] : (endMatch ? endMatch[1] : '18:00');

    // Normaliza para formato HH:mm com 2 dígitos de hora
    if (startTime.length === 4) startTime = `0${startTime}`;
    if (endTime.length === 4) endTime = `0${endTime}`;

    const newProfessionalAvailabilities = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === professional.professionalId) {
        const currentWin = prof.weekdayWindows?.[targetDayNum!] || { enabled: true, startTime: '08:00', endTime: '18:00' };
        return {
          ...prof,
          weekdayWindows: {
            ...prof.weekdayWindows,
            [targetDayNum!]: {
              ...currentWin,
              enabled: true,
              startTime,
              endTime
            }
          }
        };
      }
      return prof;
    });

    return {
      reply: `✅ **Horário Ajustado!** A jornada de **${professional.professionalName}** foi atualizada para **${startTime} às ${endTime}**.\n\nA escala mensal foi recalculada para aproveitar o novo intervalo disponível.`,
      mutated: true,
      newProfessionalAvailabilities,
      actionExecuted: {
        type: 'EXTEND_WINDOW',
        description: `Ajuste de jornada de ${professional.professionalName} para ${startTime}-${endTime}`
      }
    };
  }

  /**
   * Altera a quantidade de sessões semanais demandadas pelo paciente
   */
  private static handleFrequencyChange(rawMessage: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { patientsWithDemands } = ctx;
    const patient = this.findPatientInText(rawMessage, patientsWithDemands);
    if (!patient) return null;

    const lower = rawMessage.toLowerCase();

    // Extrai o número de vezes (ex: "3 vezes", "2x", "4 sessões", "1 vez")
    const numMatch = lower.match(/(\d+)\s*(?:x|vezes|vez|sessões|sessoes)?/);
    if (!numMatch) return null;

    const newCount = Math.max(1, Math.min(6, parseInt(numMatch[1], 10)));

    const newPatientsWithDemands = patientsWithDemands.map((pat) => {
      if (pat.patientId === patient.patientId) {
        return {
          ...pat,
          demands: pat.demands.map((d, idx) => (idx === 0 ? { ...d, sessionsPerWeek: newCount } : d))
        };
      }
      return pat;
    });

    return {
      reply: `✅ **Demanda Atualizada!** A frequência de atendimento de **${patient.patientName}** foi alterada para **${newCount}x por semana**.\n\nA escala mensal foi recalculada com as novas metas.`,
      mutated: true,
      newPatientsWithDemands,
      actionExecuted: {
        type: 'UPDATE_SESSIONS_COUNT',
        description: `Alteração da meta de ${patient.patientName} para ${newCount}x/semana`
      }
    };
  }

  /**
   * Fixa atendimento prioritário na grade
   */
  private static handleFixAppointmentCommand(rawMessage: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { patientsWithDemands, professionalAvailabilities, fixedAppointments } = ctx;
    const patient = this.findPatientInText(rawMessage, patientsWithDemands);
    const professional = this.findProfessionalInText(rawMessage, professionalAvailabilities);

    if (!patient || !professional) return null;

    const lower = rawMessage.toLowerCase();
    const norm = this.normalizeText(rawMessage);

    let targetDayNum: number = 2; // Default Terça
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (norm.includes(dayKey) || lower.includes(dayKey)) {
        targetDayNum = dayNum;
        break;
      }
    }

    const timeMatch = lower.match(/(\d{1,2}:\d{2})/);
    const fixedTime = timeMatch ? (timeMatch[1].length === 4 ? `0${timeMatch[1]}` : timeMatch[1]) : '09:00';

    const newFix: FixedAppointment = {
      id: `fix-ia-${Date.now()}`,
      patientId: patient.patientId,
      patientName: patient.patientName,
      professionalId: professional.professionalId,
      professionalName: professional.professionalName,
      therapyType: patient.demands[0]?.therapyType || 'Fisioterapia Motora',
      recurrenceType: 'weekly',
      dayOfWeek: targetDayNum,
      time: fixedTime,
      durationMinutes: patient.demands[0]?.durationMinutes || 45,
      notes: 'Horário fixado via Copiloto IA'
    };

    const newFixedAppointments = [...fixedAppointments, newFix];

    return {
      reply: `🔒 **Atendimento Fixado com Prioridade Máxima!**\n\n` +
        `• **Paciente:** ${patient.patientName}\n` +
        `• **Profissional:** ${professional.professionalName}\n` +
        `• **Horário:** Toda ${Object.keys(WEEKDAY_NAMES_MAP).find((k) => WEEKDAY_NAMES_MAP[k] === targetDayNum)} às ${fixedTime}\n\n` +
        `O motor de escala reservou essa vaga prioritária e deduziu da meta semanal do paciente!`,
      mutated: true,
      newFixedAppointments,
      actionExecuted: {
        type: 'ADD_FIXED_APPOINTMENT',
        description: `Fixação de ${patient.patientName} com ${professional.professionalName} às ${fixedTime}`
      }
    };
  }

  /**
   * Adiciona bloqueio de agenda
   */
  private static handleBlockCommand(rawMessage: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { professionalAvailabilities } = ctx;
    const professional = this.findProfessionalInText(rawMessage, professionalAvailabilities);
    if (!professional) return null;

    const lower = rawMessage.toLowerCase();
    const norm = this.normalizeText(rawMessage);

    let targetDayNum: number = 2; // Default Terça
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (norm.includes(dayKey) || lower.includes(dayKey)) {
        targetDayNum = dayNum;
        break;
      }
    }

    const timeMatch = lower.match(/(\d{1,2}:\d{2})\s*(?:às|as|a|-)\s*(\d{1,2}:\d{2})/);
    const startTime = timeMatch ? timeMatch[1] : '09:00';
    const endTime = timeMatch ? timeMatch[2] : '11:00';

    const newBlock: TimeBlock = {
      id: `blk-ia-${Date.now()}`,
      dayOfWeek: targetDayNum,
      startTime,
      endTime,
      reason: 'Compromisso particular cadastrado via Copiloto IA'
    };

    const newProfessionalAvailabilities = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === professional.professionalId) {
        return {
          ...prof,
          unavailabilityBlocks: [...(prof.unavailabilityBlocks || []), newBlock]
        };
      }
      return prof;
    });

    return {
      reply: `⛔ **Bloqueio Registrado!** Adicionado bloqueio de agenda para **${professional.professionalName}** das **${startTime} às ${endTime}**.\n\nNenhuma sessão da clínica será agendada neste horário.`,
      mutated: true,
      newProfessionalAvailabilities,
      actionExecuted: {
        type: 'ADD_BLOCK',
        description: `Bloqueio de ${professional.professionalName} (${startTime}-${endTime})`
      }
    };
  }

  /**
   * Apresenta o panorama executivo da escala mensal calculada, estatísticas e alocação por profissional
   */
  public static explainScaleOverview(ctx: ScaleAgentContext): AgentExecutionResult {
    const { scaleResult, professionalAvailabilities } = ctx;

    if (!scaleResult) {
      return {
        reply:
          `### 📅 Escala Mensal Ainda Não Calculada\n\n` +
          `Ainda não há atendimentos agendados para este mês na escala ativa.\n\n` +
          `Para gerar a escala completa com base nas demandas dos pacientes, equipes autorizadas (Care Team) e horários de trabalho dos profissionais, clique no botão **"Recalcular Escala Mensal"** no topo da tela ou me peça: *"Calcular a escala mensal agora"*!`,
        mutated: false,
        suggestedActions: []
      };
    }

    const { summary, plannedSessions, coverageReports, bottlenecks } = scaleResult;

    const totalAllocated = (summary as any).totalAllocatedSessions ?? (summary as any).totalPlannedSessions ?? plannedSessions.length;
    const coveragePct = (summary as any).globalCoveragePercent ?? (summary as any).overallCoveragePercent ?? (summary.totalDemandedSessions > 0 ? Math.round((totalAllocated / summary.totalDemandedSessions) * 100) : 100);
    const transitKm = (summary as any).totalEstimatedTransitKm ?? (summary as any).totalTransitDistanceKm ?? 0;
    const transitHours = (summary as any).totalEstimatedTransitHours ?? ((summary as any).totalTransitTimeMinutes ? Math.round((summary as any).totalTransitTimeMinutes / 60) : 0);

    let reply = `### 📊 Panorama Geral da Escala Criada (${scaleResult.month}/${scaleResult.year})\n\n`;

    // 1. Métricas Principais
    const coverageIcon = coveragePct >= 95 ? '🟢' : coveragePct >= 75 ? '🟡' : '🔴';
    reply += `• ${coverageIcon} **Taxa Geral de Cobertura:** **${coveragePct}%**\n`;
    reply += `• 🗓️ **Sessões Planejadas:** **${totalAllocated}** de **${summary.totalDemandedSessions}** demandadas (${summary.totalDemandedSessions - totalAllocated} em déficit)\n`;
    reply += `• 🚗 **Deslocamento Urbano Total:** **${transitKm} km** estimados (~${transitHours}h de trânsito otimizado entre domicílios)\n\n`;

    // 2. Distribuição por Profissional
    reply += `#### 🩺 Sessões Atribuídas por Terapeuta:\n`;
    const profCounts = new Map<string, { name: string; count: number; spec: string }>();
    professionalAvailabilities.forEach((p) => {
      profCounts.set(p.professionalId, { name: p.professionalName, count: 0, spec: p.specialty });
    });
    plannedSessions.forEach((s) => {
      const entry = profCounts.get(s.professionalId);
      if (entry) {
        entry.count++;
      } else {
        profCounts.set(s.professionalId, { name: s.professionalName, count: 1, spec: s.therapyType });
      }
    });

    Array.from(profCounts.values())
      .sort((a, b) => b.count - a.count)
      .forEach((p) => {
        const badge = p.count > 0 ? `**${p.count} sessões**` : `*0 sessões (Disponível)*`;
        reply += `• **${p.name}** (*${p.spec}*): ${badge}\n`;
      });

    // 3. Status dos Pacientes
    reply += `\n#### 👤 Cobertura por Paciente:\n`;
    const fullPatients = coverageReports.filter((c) => c.status === 'FULL_COVERAGE');
    const deficitPatients = coverageReports.filter((c) => c.status !== 'FULL_COVERAGE');

    reply += `• ✅ **Metas 100% Cumpridas (${fullPatients.length}):** ${fullPatients.length > 0 ? fullPatients.map((p) => p.patientName).join(', ') : 'Nenhum'}\n`;
    if (deficitPatients.length > 0) {
      reply += `• ⚠️ **Com Déficit / Gargalo (${deficitPatients.length}):**\n`;
      deficitPatients.forEach((d) => {
        reply += `  - **${d.patientName}** (*${d.therapyType}*): ${d.allocatedMonthlySessions}/${d.demandedMonthlySessions} sessões (**${d.coveragePercent}%**)\n`;
      });
    }

    // 4. Gargalos Principais
    if (bottlenecks.length > 0) {
      reply += `\n#### ⚠️ Gargalos Principais a Resolver (${bottlenecks.length}):\n`;
      bottlenecks.slice(0, 3).forEach((b) => {
        const reasonText =
          b.reason === 'NO_CARE_TEAM_SPECIALIST'
            ? 'Falta especialista no Care Team'
            : 'Capacidade de horário esgotada';
        reply += `• **${b.patientName}** (${b.therapyType}): ${reasonText}\n`;
      });
    }

    reply += `\n💡 *Experimente perguntar:* *"Quais os atendimentos do Dr. Rafael?"*, *"Quem atende a Mariana?"* ou *"Atendimentos do dia 15"*.`;

    const diag = this.diagnoseScale(ctx);
    return {
      reply,
      mutated: false,
      suggestedActions: diag.suggestedActions.slice(0, 3)
    };
  }

  /**
   * Detalha os atendimentos e rotas agendadas em um dia específico do mês
   */
  public static explainDaySchedule(dayNumber: number, ctx: ScaleAgentContext): AgentExecutionResult {
    const { scaleResult } = ctx;

    if (!scaleResult) {
      return {
        reply: `A escala ainda não foi gerada para avaliar os atendimentos do dia ${dayNumber}.`,
        mutated: false
      };
    }

    // Filtra sessões daquele dia
    const daySessions = scaleResult.plannedSessions.filter((s) => {
      const parts = s.date.split('-');
      const d = parseInt(parts[2], 10);
      return d === dayNumber;
    });

    if (daySessions.length === 0) {
      return {
        reply: `📅 **Dia ${dayNumber}/${scaleResult.month}/${scaleResult.year}:**\n\nNenhum atendimento domiciliar está agendado para esta data na escala atual.`,
        mutated: false
      };
    }

    daySessions.sort((a, b) => a.time.localeCompare(b.time));

    let reply = `### 📅 Atendimentos Agendados para o Dia ${dayNumber}/${scaleResult.month}/${scaleResult.year} (${daySessions.length} sessões)\n\n`;

    const byProf = new Map<string, PlannedSession[]>();
    daySessions.forEach((s) => {
      if (!byProf.has(s.professionalName)) {
        byProf.set(s.professionalName, []);
      }
      byProf.get(s.professionalName)!.push(s);
    });

    byProf.forEach((sessions, profName) => {
      reply += `#### 🧑‍⚕️ Rota de ${profName} (${sessions.length} visitas):\n`;
      sessions.forEach((s, idx) => {
        const transitInfo =
          s.transitKmFromPrevious > 0
            ? ` • 🚗 +${s.transitKmFromPrevious.toFixed(1)} km (~${s.transitTimeMinutes} min de trânsito)`
            : ' • 🏁 Início da rota';
        reply += `${idx + 1}. **${s.time}** — **${s.patientName}** (*${s.therapyType}*)${transitInfo}\n   📍 *${s.address}*\n`;
      });
      reply += `\n`;
    });

    return {
      reply,
      mutated: false
    };
  }

  /**
   * Explica detalhadamente a situação clínica e os gargalos de um paciente específico
   */
  private static explainPatientSituation(
    patient: ScaleAgentContext['patientsWithDemands'][0],
    ctx: ScaleAgentContext
  ): AgentExecutionResult {
    const { scaleResult, careTeams, professionalAvailabilities } = ctx;

    if (!scaleResult) {
      return {
        reply: `A escala ainda não foi gerada para avaliar a situação de ${patient.patientName}.`,
        mutated: false
      };
    }

    const report = scaleResult.coverageReports.filter((r) => r.patientId === patient.patientId);
    const sessions = scaleResult.plannedSessions.filter((s) => s.patientId === patient.patientId);
    const ct = careTeams.find((c) => c.patientId === patient.patientId) || { patientId: patient.patientId, professionalIds: [] as string[] };
    const patientBottlenecks = scaleResult.bottlenecks.filter((b) => b.patientId === patient.patientId);

    const authorizedProfs = professionalAvailabilities.filter((p) => ct.professionalIds.includes(p.professionalId));

    let reply = `### 👤 Situação de Atendimento: ${patient.patientName}\n\n`;
    reply += `📍 **Endereço:** ${patient.address}\n`;
    reply += `👥 **Equipe Autorizada (Care Team):** ${authorizedProfs.length > 0 ? authorizedProfs.map((p) => p.professionalName).join(', ') : '⚠️ *Nenhum profissional vinculado!*'}\n\n`;

    reply += `#### 📋 Cobertura das Terapias:\n`;
    report.forEach((r) => {
      const icon = r.status === 'FULL_COVERAGE' ? '✅' : r.status === 'PARTIAL_COVERAGE' ? '⚠️' : '🚨';
      reply += `• ${icon} **${r.therapyType}**: ${r.allocatedMonthlySessions} de ${r.demandedMonthlySessions} sessões alocadas (**${r.coveragePercent}%** de meta cumprida).\n`;
    });

    if (sessions.length > 0) {
      reply += `\n#### 🗓️ Atendimentos Agendados na Escala (${sessions.length} sessões no mês):\n`;
      const weeklySchedule = new Map<string, { profName: string; therapy: string; count: number }>();
      sessions.forEach((s) => {
        const d = new Date(s.date + 'T12:00:00');
        const dayName = WEEKDAY_LABELS[d.getDay()] || 'Dia';
        const key = `Toda ${dayName} às ${s.time} com ${s.professionalName} (${s.therapyType})`;
        if (!weeklySchedule.has(key)) {
          weeklySchedule.set(key, { profName: s.professionalName, therapy: s.therapyType, count: 1 });
        } else {
          weeklySchedule.get(key)!.count++;
        }
      });

      weeklySchedule.forEach((val, key) => {
        reply += `• 🗓️ **${key}** — *${val.count}x no mês*\n`;
      });
    } else {
      reply += `\n#### 🗓️ Atendimentos Agendados na Escala:\n• ⚠️ *Nenhuma sessão agendada no mês atual devido a gargalos de equipe ou horários.*\n`;
    }

    if (patientBottlenecks.length > 0) {
      reply += `\n#### 🔍 Por que não atingiu 100%?\n`;
      patientBottlenecks.slice(0, 3).forEach((b) => {
        if (b.reason === 'NO_CARE_TEAM_SPECIALIST') {
          reply += `• **Restrição de Care Team:** Não há nenhum profissional com especialidade em *${b.therapyType}* autorizado na equipe do paciente.\n`;
        } else if (b.reason === 'PROFESSIONAL_CAPACITY_EXCEEDED') {
          reply += `• **Jornada Esgotada:** Os profissionais do Care Team já atingiram o limite de horário nos dias disponíveis.\n`;
        } else if (b.reason === 'TIME_CONFLICT') {
          reply += `• **Conflito de Horário:** Sobreposição de horários ou compromissos particulares.\n`;
        }
      });
    } else if (report.every((r) => r.status === 'FULL_COVERAGE')) {
      reply += `\n🎉 **Todas as metas terapêuticas de ${patient.patientName} estão 100% preenchidas no mês!**\n`;
    }

    const suggestions: AgentActionSuggestion[] = [];
    patientBottlenecks.forEach((b) => {
      if (b.reason === 'NO_CARE_TEAM_SPECIALIST') {
        const eligible = professionalAvailabilities.find((p) => {
          const specs = p.specialties || [p.specialty];
          return specs.some((s) => s.toLowerCase().includes(b.therapyType.toLowerCase().slice(0, 8)));
        });
        if (eligible) {
          suggestions.push({
            id: `act-care-${patient.patientId}-${eligible.professionalId}`,
            label: `Vincular ${eligible.professionalName} ao Care Team`,
            actionType: 'ADD_CARE_TEAM',
            payload: {
              patientId: patient.patientId,
              professionalId: eligible.professionalId,
              patientName: patient.patientName,
              professionalName: eligible.professionalName
            }
          });
        }
      }
    });

    return {
      reply,
      mutated: false,
      suggestedActions: suggestions
    };
  }

  /**
   * Executa diretamente uma ação sugerida clicada pelo usuário
   */
  public static executeAction(action: AgentActionSuggestion, ctx: ScaleAgentContext): AgentExecutionResult {
    const { actionType, payload } = action;

    if (actionType === 'ADD_CARE_TEAM') {
      const { patientId, professionalId, patientName, professionalName } = payload;
      const { careTeams } = ctx;

      const currentCt = careTeams.find((ct) => ct.patientId === patientId) || {
        patientId,
        professionalIds: []
      };

      const newCareTeams = [
        ...careTeams.filter((ct) => ct.patientId !== patientId),
        { patientId, professionalIds: [...new Set([...currentCt.professionalIds, professionalId])] }
      ];

      return {
        reply: `✅ **Ação Executada!** **${professionalName}** foi vinculado(a) à Equipe de Cuidado de **${patientName}**.\n\nA escala mensal foi recalculada com sucesso!`,
        mutated: true,
        newCareTeams,
        actionExecuted: {
          type: 'ADD_CARE_TEAM',
          description: `Vínculo de ${professionalName} ao Care Team de ${patientName}`
        }
      };
    }

    if (actionType === 'ENABLE_DAY') {
      const { professionalId, dayOfWeek, startTime, endTime } = payload;
      const { professionalAvailabilities } = ctx;

      const newProfessionalAvailabilities = professionalAvailabilities.map((prof) => {
        if (prof.professionalId === professionalId) {
          return {
            ...prof,
            weekdayWindows: {
              ...prof.weekdayWindows,
              [dayOfWeek]: { enabled: true, startTime, endTime }
            }
          };
        }
        return prof;
      });

      return {
        reply: `✅ **Jornada Ampliada!** O dia foi habilitado com sucesso na agenda do profissional. Escala recalculada.`,
        mutated: true,
        newProfessionalAvailabilities,
        actionExecuted: {
          type: 'ENABLE_DAY',
          description: `Habilitação de dia na agenda do profissional`
        }
      };
    }

    return {
      reply: `⚠️ Ação não reconhecida.`,
      mutated: false
    };
  }
}
