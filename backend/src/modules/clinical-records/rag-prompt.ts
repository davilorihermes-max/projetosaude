export interface PatientAnamnesisContext {
  fullName: string;
  age: number;
  clinicalDiagnosis: string;
  mainComplaints: string;
  functionalLimitations: string[];
  contraindications: string[];
  therapeuticGoals: string[];
}

export interface LongitudinalRecord {
  date: string;
  professionalName: string;
  specialization: string;
  summarizedConduct: string;
  patientFeedback?: string;
  nextSessionPlan?: string;
}

export interface CuratedProtocolSnippet {
  title: string;
  evidenceLevel: string;
  indications: string[];
  contraindications: string[];
  content: string;
}

export class ClinicalRagPromptBuilder {
  /**
   * Monta o prompt do assistente clínico combinando os 3 pilares com guardrails estritos
   */
  public static buildClinicalRecommendationPrompt(
    anamnesis: PatientAnamnesisContext,
    recentHistory: LongitudinalRecord[],
    retrievedProtocols: CuratedProtocolSnippet[],
    therapistQuestion: string
  ): string {
    const limitationsList = anamnesis.functionalLimitations.map(item => `  - ${item}`).join('\n') || '  - Nenhuma registrada';
    const contraindicationsList = anamnesis.contraindications.map(item => `  - [CONTRAINDICAÇÃO CRÍTICA] ${item}`).join('\n') || '  - Nenhuma registrada';
    const goalsList = anamnesis.therapeuticGoals.map(item => `  - ${item}`).join('\n') || '  - Não informados';

    const historySection = recentHistory.length > 0
      ? recentHistory.map(rec => `
### Sessão em ${rec.date} (${rec.professionalName} - ${rec.specialization})
- Conduta realizada: ${rec.summarizedConduct}
- Resposta do paciente: ${rec.patientFeedback || 'Sem queixas adversas'}
- Planejamento anterior: ${rec.nextSessionPlan || 'Não especificado'}
`).join('\n')
      : 'Sem histórico anterior de sessões registradas.';

    const protocolsSection = retrievedProtocols.length > 0
      ? retrievedProtocols.map(prot => `
### Diretriz: ${prot.title} (Nível: ${prot.evidenceLevel})
- Indicações: ${prot.indications.join(', ')}
- Contraindicações da diretriz: ${prot.contraindications.join(', ')}
- Conteúdo clínico: ${prot.content}
`).join('\n')
      : 'Nenhuma diretriz específica retornada da base vetorial.';

    return `
# INSTRUÇÃO DO SISTEMA: COPILOTO CLÍNICO DE REABILITAÇÃO ESPECIALIZADA

Você é o assistente clínico de suporte à decisão terapêutica. Sua responsabilidade máxima é sugerir condutas terapêuticas e exercícios que respeitem integralmente as contraindicações e progridam os ganhos do paciente.

---

## PILAR 1: DADOS ANAMNÉTICOS E CONTRAINDICAÇÕES (INVIOLÁVEL)
- Nome do Paciente: ${anamnesis.fullName} (${anamnesis.age} anos)
- Diagnóstico Clínico: ${anamnesis.clinicalDiagnosis}
- Queixa Principal: ${anamnesis.mainComplaints}
- Limitações Funcionais Atuais:
${limitationsList}
- CONTRAINDICAÇÕES ABSOLUTAS:
${contraindicationsList}
- Objetivos Terapêuticos a Alcançar:
${goalsList}

---

## PILAR 2: HISTÓRICO LONGITUDINAL RECENTE (EVOLUÇÕES CLÍNICAS DA EQUIPE)
${historySection}

---

## PILAR 3: DIRETRIZES E PROTOCOLOS CLÍNICOS RECUPERADOS (BASE VETORIAL PGVECTOR)
${protocolsSection}

---

## SOLICITAÇÃO ATUAL DO TERAPEUTA:
"${therapistQuestion}"

---

## REGRAS MANDATÓRIAS DE FORMULAÇÃO DE RESPOSTA:
1. VALIDAÇÃO DE SEGURANÇA: Se a conduta solicitada violar QUALQUER uma das CONTRAINDICAÇÕES ABSOLUTAS do Pilar 1, você DEVE recusar explicitamente a manobra e alertar sobre o risco clínico.
2. PROGRESSÃO TERAPÊUTICA: Use o histórico das sessões (Pilar 2) para propor uma progressão lógica de intensidade, repetições ou posicionamento.
3. EMBASAMENTO: Cite qual diretriz do Pilar 3 fundamenta o exercício proposto.
4. ESTRUTURA DA RESPOSTA:
   - Resumo da Conduta Sugerida
   - Justificativa e Parâmetros (posicionamento, duração, repetições, cuidados respiratórios/motores)
   - Sinais de Alerta para Interrupção Imediata
`.trim();
  }
}
