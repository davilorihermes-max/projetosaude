// src/services/scale-ai-agent.ts
import {
  MonthlyScaleResult,
  PatientTherapyDemand,
  ProfessionalAvailability,
  CareTeamRelation,
  FixedAppointment,
  TimeBlock
} from './monthly-scale-generator';

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
    | 'APPLY_ALL_RECOMMENDATIONS';
  payload: any;
}

export interface ScaleAgentContext {
  scaleResult: MonthlyScaleResult | null;
  patientsWithDemands: Array<{
    patientId: string;
    patientName: string;
    address: string;
    neighborhood: string;
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

export class ScaleAIAgent {
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
   * Processa a mensagem do planejador e executa ações de modificação de parâmetros ou diagnóstico
   */
  public static processMessage(input: string, ctx: ScaleAgentContext): AgentExecutionResult {
    const text = input.trim();
    const lower = text.toLowerCase();

    // 1. Comando: Adicionar / Vincular profissional ao Care Team do paciente
    // Ex: "Adicione o Dr. Rafael ao Care Team da Mariana", "Vincular Dra. Camila à Mariana"
    if (
      (lower.includes('adicione') || lower.includes('adicionar') || lower.includes('vincular') || lower.includes('incluir') || lower.includes('autorizar')) &&
      (lower.includes('care team') || lower.includes('equipe') || lower.includes('paciente') || lower.includes('careteam'))
    ) {
      return this.handleCareTeamCommand(lower, ctx, true);
    }

    // 2. Comando: Remover profissional do Care Team
    // Ex: "Remover Rafael do Care Team da Mariana"
    if (
      (lower.includes('remover') || lower.includes('retirar') || lower.includes('desvincular')) &&
      (lower.includes('care team') || lower.includes('equipe'))
    ) {
      return this.handleCareTeamCommand(lower, ctx, false);
    }

    // 3. Comando: Habilitar dia de atendimento (ex: "Habilite domingo para Dr. Rafael", "Ativar sábado para Rafael")
    if (
      (lower.includes('habilite') || lower.includes('habilitar') || lower.includes('ative') || lower.includes('ativar') || lower.includes('coloque')) &&
      (lower.includes('domingo') || lower.includes('sábado') || lower.includes('sabado') || lower.includes('segunda') || lower.includes('terça') || lower.includes('terca') || lower.includes('quarta') || lower.includes('quinta') || lower.includes('sexta'))
    ) {
      return this.handleToggleDayCommand(lower, ctx, true);
    }

    // 4. Comando: Ampliar ou alterar jornada diária (ex: "Aumente o horário do Dr. Rafael na terça para 08:00 às 18:00")
    if (
      lower.includes('horário') || lower.includes('horario') || lower.includes('jornada') || lower.includes('aumente') || lower.includes('mude o horário')
    ) {
      const windowChange = this.handleTimeWindowChange(lower, ctx);
      if (windowChange) return windowChange;
    }

    // 5. Comando: Alterar frequência semanal de atendimento do paciente
    // Ex: "Mude a frequência de fisioterapia do Roberto para 3 vezes na semana", "Aumentar Mariana para 3 sessões"
    if (
      (lower.includes('frequência') || lower.includes('frequencia') || lower.includes('vezes') || lower.includes('sessões') || lower.includes('sessoes') || lower.includes('meta')) &&
      (lower.includes('semana') || lower.includes('mudar') || lower.includes('alterar') || lower.includes('aumentar') || lower.includes('reduzir'))
    ) {
      const freqChange = this.handleFrequencyChange(lower, ctx);
      if (freqChange) return freqChange;
    }

    // 6. Comando: Fixar atendimento
    // Ex: "Fixe o atendimento da Mariana com Dr. Rafael na terça às 09:00"
    if (lower.includes('fixe') || lower.includes('fixar') || lower.includes('travar') || lower.includes('prioritário')) {
      const fixResult = this.handleFixAppointmentCommand(lower, ctx);
      if (fixResult) return fixResult;
    }

    // 7. Comando: Adicionar Bloqueio de Indisponibilidade
    // Ex: "Bloquear Dr. Rafael na quinta das 10:00 às 12:00 por paciente particular"
    if (lower.includes('bloquear') || lower.includes('bloqueio') || lower.includes('indisponível') || lower.includes('indisponibilidade')) {
      const blockResult = this.handleBlockCommand(lower, ctx);
      if (blockResult) return blockResult;
    }

    // 8. Consulta Específica de Paciente: "Por que a Mariana não...", "Situação da Mariana", etc.
    const matchedPatient = ctx.patientsWithDemands.find((p) =>
      lower.includes(p.patientName.toLowerCase().split(' ')[0]) ||
      lower.includes(p.patientName.toLowerCase())
    );

    if (matchedPatient) {
      return this.explainPatientSituation(matchedPatient, ctx);
    }

    // 9. Consulta Geral: Dificuldades / Gargalos / Diagnóstico da Escala
    if (
      lower.includes('gargalo') ||
      lower.includes('dificuldade') ||
      lower.includes('fechar') ||
      lower.includes('ajuda') ||
      lower.includes('como') ||
      lower.includes('diagnóstico') ||
      lower.includes('diagnostico') ||
      lower.includes('por que') ||
      lower.includes('porque') ||
      lower.includes('status') ||
      lower.includes('cobertura') ||
      lower.includes('ocioso')
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

    // Resposta Padrão do Copiloto orientando os comandos possíveis
    return {
      reply: `Olá! Sou seu **Copiloto Inteligente de Escala e Roteirização**. 🩺\n\nPosso ajudar você a entender qualquer dificuldade para fechar a escala e também **alterar parâmetros diretamente pelo chat**. Você pode me pedir, por exemplo:\n\n` +
        `• **Diagnóstico:** *"Quais os gargalos para fechar a escala deste mês?"*\n` +
        `• **Paciente Específico:** *"Por que a Mariana não atingiu 100% da meta?"*\n` +
        `• **Alterar Care Team:** *"Autorize o Dr. Rafael no Care Team da Mariana"*\n` +
        `• **Ajustar Horário:** *"Aumente o horário da Dra. Beatriz na terça-feira das 08:00 às 18:00"*\n` +
        `• **Ativar Domingo/Fins de Semana:** *"Habilite domingo para a Dra. Beatriz das 08:00 às 13:00"*\n` +
        `• **Alterar Metas:** *"Altere as sessões semanais do Roberto para 3 vezes"*\n` +
        `• **Fixar Atendimento:** *"Fixe Mariana com Dr. Rafael na terça às 09:00"*\n` +
        `• **Bloquear Horário:** *"Bloqueie Dr. Rafael na quinta das 10:00 às 12:00"*\n\n` +
        `Como posso te ajudar agora?`,
      mutated: false,
      suggestedActions: this.diagnoseScale(ctx).suggestedActions.slice(0, 3)
    };
  }

  /**
   * Executa vinculação ou desvinculação de Care Team via chat
   */
  private static handleCareTeamCommand(lower: string, ctx: ScaleAgentContext, isAdd: boolean): AgentExecutionResult {
    const { patientsWithDemands, professionalAvailabilities, careTeams } = ctx;

    // Encontra o paciente citado
    const patient = patientsWithDemands.find((p) => {
      const firstName = p.patientName.toLowerCase().split(' ')[0];
      return lower.includes(firstName) || lower.includes(p.patientName.toLowerCase());
    });

    // Encontra o profissional citado
    const professional = professionalAvailabilities.find((p) => {
      const parts = p.professionalName.toLowerCase().split(' ');
      const cleanParts = parts.filter((part) => !['dr.', 'dra.', 'dr', 'dra', 'doutor', 'doutora'].includes(part));
      return cleanParts.some((cp) => lower.includes(cp)) || lower.includes(p.professionalName.toLowerCase());
    });

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
      nextIds = currentCt.professionalIds.filter((id) => id !== professional.professionalId);
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
  private static handleToggleDayCommand(lower: string, ctx: ScaleAgentContext, enabled: boolean): AgentExecutionResult {
    const { professionalAvailabilities } = ctx;

    // Acha o profissional
    const professional = professionalAvailabilities.find((p) => {
      const parts = p.professionalName.toLowerCase().split(' ');
      const cleanParts = parts.filter((part) => !['dr.', 'dra.', 'dr', 'dra'].includes(part));
      return cleanParts.some((cp) => lower.includes(cp)) || lower.includes(p.professionalName.toLowerCase());
    });

    if (!professional) {
      return {
        reply: `⚠️ Não consegui identificar para qual profissional você deseja alterar a disponibilidade. Exemplo: **"Habilite domingo para Dra. Beatriz"**.`,
        mutated: false
      };
    }

    // Acha o dia da semana citado
    let targetDayNum: number | null = null;
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (lower.includes(dayKey)) {
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
  private static handleTimeWindowChange(lower: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { professionalAvailabilities } = ctx;

    const professional = professionalAvailabilities.find((p) => {
      const parts = p.professionalName.toLowerCase().split(' ');
      const cleanParts = parts.filter((part) => !['dr.', 'dra.', 'dr', 'dra'].includes(part));
      return cleanParts.some((cp) => lower.includes(cp)) || lower.includes(p.professionalName.toLowerCase());
    });

    if (!professional) return null;

    let targetDayNum: number | null = null;
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (lower.includes(dayKey)) {
        targetDayNum = dayNum;
        break;
      }
    }

    if (targetDayNum === null) return null;

    const timeMatch = lower.match(/(\d{1,2}:\d{2})\s*(?:às|as|a|-)\s*(\d{1,2}:\d{2})/);
    const startMatch = lower.match(/(?:das|a partir das|início às)\s*(\d{1,2}:\d{2})/);
    const endMatch = lower.match(/(?:às|as|até às|até as|término às)\s*(\d{1,2}:\d{2})/);

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
  private static handleFrequencyChange(lower: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { patientsWithDemands } = ctx;

    const patient = patientsWithDemands.find((p) => {
      const firstName = p.patientName.toLowerCase().split(' ')[0];
      return lower.includes(firstName) || lower.includes(p.patientName.toLowerCase());
    });

    if (!patient) return null;

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
  private static handleFixAppointmentCommand(lower: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { patientsWithDemands, professionalAvailabilities, fixedAppointments } = ctx;

    const patient = patientsWithDemands.find((p) => {
      const firstName = p.patientName.toLowerCase().split(' ')[0];
      return lower.includes(firstName) || lower.includes(p.patientName.toLowerCase());
    });

    const professional = professionalAvailabilities.find((p) => {
      const parts = p.professionalName.toLowerCase().split(' ');
      const cleanParts = parts.filter((part) => !['dr.', 'dra.', 'dr', 'dra'].includes(part));
      return cleanParts.some((cp) => lower.includes(cp)) || lower.includes(p.professionalName.toLowerCase());
    });

    if (!patient || !professional) return null;

    let targetDayNum: number = 2; // Default Terça
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (lower.includes(dayKey)) {
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
  private static handleBlockCommand(lower: string, ctx: ScaleAgentContext): AgentExecutionResult | null {
    const { professionalAvailabilities } = ctx;

    const professional = professionalAvailabilities.find((p) => {
      const parts = p.professionalName.toLowerCase().split(' ');
      const cleanParts = parts.filter((part) => !['dr.', 'dra.', 'dr', 'dra'].includes(part));
      return cleanParts.some((cp) => lower.includes(cp)) || lower.includes(p.professionalName.toLowerCase());
    });

    if (!professional) return null;

    let targetDayNum: number = 2; // Default Terça
    for (const [dayKey, dayNum] of Object.entries(WEEKDAY_NAMES_MAP)) {
      if (lower.includes(dayKey)) {
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
    const ct = careTeams.find((c) => c.patientId === patient.patientId) || { professionalIds: [] };
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
