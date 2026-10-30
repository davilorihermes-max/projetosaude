// src/services/clinicalVoiceParser.ts
// Motor inteligente de transcrição, estruturação e síntese clínica (SOAP)
// Projetado especificamente para Home Care (Fisioterapia, Enfermagem e Multidisciplinar)

export interface ClinicalVitals {
  bloodPressure?: string;
  heartRate?: number;
  oxygenSaturation?: number;
  temperature?: number;
  glucose?: number;
}

export interface StructuredEvolution {
  patientNameHint?: string;
  rawTranscription: string;
  vitals: ClinicalVitals;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summarizedConduct: string;
  detectedKeywords: string[];
}

export interface ParseOptions {
  patientName?: string;
  professionalName?: string;
}

/**
 * Normaliza strings para análise com remoção de acentos e minúsculas
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extrai valores numéricos de sinais vitais falados no áudio
 */
export function extractVitalsFromSpokenText(rawText: string): ClinicalVitals {
  const vitals: ClinicalVitals = {};
  const norm = normalize(rawText);

  // 1. SpO2 / Saturação
  const spo2ExplicitMatch = norm.match(/(?:saturacao|saturando|spo2)\s*(?:de|em|com)?\s*(\d{2,3})%?/);
  if (spo2ExplicitMatch && spo2ExplicitMatch[1]) {
    const val = parseInt(spo2ExplicitMatch[1], 10);
    if (val >= 70 && val <= 100) {
      vitals.oxygenSaturation = val;
    }
  } else if (norm.includes('boa saturacao') || norm.includes('saturando bem') || norm.includes('saturacao normal') || norm.includes('saturacao estavel')) {
    vitals.oxygenSaturation = 98;
  }

  // 2. Pressão Arterial (PA)
  // Formatos: "12 por 8", "120 por 80", "12/8", "120/80", "13x8", "12x8"
  const paMatch = norm.match(/(?:pa|pressao(?:\s+arterial)?)\s*(?:de|em|com)?\s*(\d{1,3})\s*(?:por|\/|x|de)\s*(\d{1,3})/);
  if (paMatch) {
    let sys = parseInt(paMatch[1], 10);
    let dia = parseInt(paMatch[2], 10);
    if (sys < 30) sys = sys * 10;
    if (dia < 20) dia = dia * 10;
    vitals.bloodPressure = `${sys}/${dia}`;
  } else if (norm.includes('normotenso') || norm.includes('pressao estavel') || norm.includes('pa estavel') || norm.includes('pa normal')) {
    vitals.bloodPressure = '120/80';
  }

  // 3. Frequência Cardíaca (FC)
  const fcMatch = norm.match(/(?:fc|frequencia(?:\s+cardiaca)?|pulso|batimentos?)\s*(?:de|em|com)?\s*(\d{2,3})/);
  if (fcMatch && fcMatch[1]) {
    const fcVal = parseInt(fcMatch[1], 10);
    if (fcVal >= 40 && fcVal <= 220) {
      vitals.heartRate = fcVal;
    }
  } else if (norm.includes('normocardico') || norm.includes('fc normal') || norm.includes('fc estavel')) {
    vitals.heartRate = 75;
  }

  // 4. Temperatura
  const tempMatch = norm.match(/(?:temp|temperatura)\s*(?:de|em|com)?\s*(\d{2}(?:[.,]\d)?)/);
  if (tempMatch && tempMatch[1]) {
    const tempVal = parseFloat(tempMatch[1].replace(',', '.'));
    if (tempVal >= 34 && tempVal <= 43) {
      vitals.temperature = tempVal;
    }
  } else if (norm.includes('afebril') || norm.includes('temperatura normal') || norm.includes('temp normal')) {
    vitals.temperature = 36.5;
  }

  // 5. Glicemia
  const glicMatch = norm.match(/(?:glicemia|destro|hgt|glicose)\s*(?:de|em|com)?\s*(\d{2,3})/);
  if (glicMatch && glicMatch[1]) {
    const glicVal = parseInt(glicMatch[1], 10);
    if (glicVal >= 40 && glicVal <= 500) {
      vitals.glucose = glicVal;
    }
  }

  return vitals;
}

/**
 * Converte a fala corrida da profissional em uma evolução estruturada no modelo SOAP
 */
export function parseClinicalVoiceNote(
  rawTranscription: string,
  options?: ParseOptions
): StructuredEvolution {
  const clean = (rawTranscription || '').trim();
  const norm = normalize(clean);
  const vitals = extractVitalsFromSpokenText(clean);
  const detectedKeywords: string[] = [];

  // Detecta se mencionou o nome do paciente no início (ex: "Ah Davi...", "Davi estável...", "Paciente Gabriel...")
  let patientNameHint: string | undefined = options?.patientName;
  const nameMatch = clean.match(/^(?:ah\s+|ó\s+|olha\s+)?(?:paciente\s+)?([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)(?:\s+|,|\.)/);
  if (nameMatch && nameMatch[1] && !['paciente', 'bom', 'boa', 'ola', 'oi'].includes(normalize(nameMatch[1]))) {
    if (!patientNameHint) {
      patientNameHint = nameMatch[1];
    }
  }

  const patientRef = patientNameHint ? `Paciente (${patientNameHint})` : 'Paciente';

  // -------------------------------------------------------------
  // Detecção de Palavras-Chave Clínicas & Condutas
  // -------------------------------------------------------------
  const isEstavel = norm.includes('estavel') || norm.includes('bem') || norm.includes('tranquilo') || norm.includes('calmo');
  const isLucido = norm.includes('lucido') || norm.includes('orientado') || norm.includes('consciente');
  const isColaborativo = norm.includes('colaborativo') || norm.includes('responsivo') || norm.includes('receptivo');
  const semDor = norm.includes('sem dor') || norm.includes('sem queixas') || norm.includes('sem queixa');
  const temDor = norm.includes('com dor') || norm.includes('queixa de dor') || norm.includes('algico');
  const isAfebril = norm.includes('afebril') || vitals.temperature === 36.5;

  if (isEstavel) detectedKeywords.push('Quadro Estável');
  if (isLucido) detectedKeywords.push('Lúcido / Orientado');
  if (semDor) detectedKeywords.push('Sem Queixas Álgicas');
  if (temDor) detectedKeywords.push('Queixa de Dor');
  if (isAfebril) detectedKeywords.push('Afebril');
  if (vitals.oxygenSaturation) detectedKeywords.push(`SpO2 ${vitals.oxygenSaturation}%`);
  if (vitals.bloodPressure) detectedKeywords.push(`PA ${vitals.bloodPressure}`);

  // Condutas específicas faladas
  const condutaSentado = norm.includes('sentado') || norm.includes('sedestacao') || norm.includes('poltrona');
  const condutaMobilizacao = norm.includes('mobilizacao') || norm.includes('mobilizar') || norm.includes('cinesioterapia') || norm.includes('membro') || norm.includes('membros');
  const condutaMarcha = norm.includes('marcha') || norm.includes('deambulacao') || norm.includes('caminhada') || norm.includes('passos');
  const condutaRespiratoria = norm.includes('respiratoria') || norm.includes('reexpansao') || norm.includes('higiene bronquica') || norm.includes('aspiracao');
  const condutaAlongamento = norm.includes('alongamento') || norm.includes('alongar');
  const condutaOrientacao = norm.includes('orientado') || norm.includes('orientacao') || norm.includes('cuidador') || norm.includes('familia') || norm.includes('decubito');

  if (condutaSentado) detectedKeywords.push('Sedestação / Sentado');
  if (condutaMobilizacao) detectedKeywords.push('Mobilização de Membros');
  if (condutaMarcha) detectedKeywords.push('Treino de Marcha');
  if (condutaRespiratoria) detectedKeywords.push('Fisioterapia Respiratória');
  if (condutaAlongamento) detectedKeywords.push('Alongamento Global');
  if (condutaOrientacao) detectedKeywords.push('Orientação ao Cuidador');

  // -------------------------------------------------------------
  // Montagem do SOAP Clínico
  // -------------------------------------------------------------

  // 1. Subjetivo (S): Relato e percepção do paciente/cuidador
  const subjectiveParts: string[] = [];
  if (isEstavel || isLucido || isColaborativo) {
    const desc: string[] = [];
    if (isLucido) desc.push('lúcido');
    if (isEstavel) desc.push('clinicamente estável');
    if (isColaborativo) desc.push('colaborativo e receptivo');
    subjectiveParts.push(`${patientRef} encontrado no leito/domicílio ${desc.join(', ')}.`);
  } else {
    subjectiveParts.push(`${patientRef} avaliado no domicílio em condições clínicas estáveis.`);
  }

  if (semDor) {
    subjectiveParts.push('Sem queixas álgicas referidas no momento da abordagem inicial.');
  } else if (temDor) {
    subjectiveParts.push('Refere desconforto ou dor leve a moderada na abordagem inicial, manejada com posicionamento terapêutico.');
  } else {
    subjectiveParts.push('Boa aceitação ao contato terapêutico e sem queixas agudas relatadas pelo cuidador.');
  }
  const subjective = subjectiveParts.join(' ');

  // 2. Objetivo (O): Exame físico e dados vitais
  const objectiveParts: string[] = [];
  const vitalsTextParts: string[] = [];
  if (vitals.bloodPressure) vitalsTextParts.push(`PA: ${vitals.bloodPressure} mmHg`);
  if (vitals.heartRate) vitalsTextParts.push(`FC: ${vitals.heartRate} bpm`);
  if (vitals.oxygenSaturation) vitalsTextParts.push(`SpO2: ${vitals.oxygenSaturation}%`);
  if (vitals.temperature) vitalsTextParts.push(`Temp: ${vitals.temperature}°C`);
  if (vitals.glucose) vitalsTextParts.push(`Glicemia: ${vitals.glucose} mg/dL`);

  if (vitalsTextParts.length > 0) {
    objectiveParts.push(`Sinais vitais verificados no início do atendimento: ${vitalsTextParts.join(', ')}.`);
  } else {
    objectiveParts.push('Sinais vitais verificados e estáveis em parâmetros fisiológicos para a rotina domiciliar.');
  }

  if (isAfebril) {
    objectiveParts.push('Paciente afebril ao toque, eupneico em ar ambiente.');
  }

  if (condutaRespiratoria || vitals.oxygenSaturation) {
    objectiveParts.push('Boa mecânica ventilatória, ausência de sinais de esforço respiratório ou desconforto.');
  }

  if (condutaMobilizacao || condutaSentado) {
    objectiveParts.push('Tônus muscular avaliado, amplitude de movimento articular preservada dentro das limitações funcionais de base.');
  }
  const objective = objectiveParts.join(' ');

  // 3. Avaliação (A): Raciocínio clínico e tolerância
  const assessmentParts: string[] = [];
  assessmentParts.push('Quadro clínico estável com adequada resposta e tolerância aos estímulos motores/respiratórios executados.');
  if (condutaSentado || condutaMarcha) {
    assessmentParts.push('Boa resposta hemodinâmica e postural às mudanças de decúbito e descarga de peso.');
  }
  const assessment = assessmentParts.join(' ');

  // 4. Plano / Conduta Realizada (P):
  const planParts: string[] = [];
  const summarizedItems: string[] = [];

  // Se a profissional falou explicitamente "conduta: ..." ou "foi feito: ...", priorizamos extrair o trecho
  const condutaExplicit = clean.match(/(?:conduta|realizado|feito|plano|procedimentos?)\s*[:=-]?\s*([^.]+)/i);
  const rawConductSnippet = condutaExplicit ? condutaExplicit[1].trim() : '';

  if (condutaSentado) {
    planParts.push('1. Treino e manutenção de sedestação assistida no leito/poltrona para estímulo de controle de tronco.');
    summarizedItems.push('Sedestação no leito');
  }

  if (condutaMobilizacao) {
    planParts.push('2. Cinesioterapia motora com mobilização passiva e ativa-assistida de membros superiores e inferiores.');
    summarizedItems.push('Mobilização de membros');
  }

  if (condutaMarcha) {
    planParts.push('3. Treino de marcha, equilíbrio e transferências posturais com assistência terapêutica.');
    summarizedItems.push('Treino de marcha');
  }

  if (condutaRespiratoria) {
    planParts.push('4. Manobras de reexpansão pulmonar, desinsuflação e estímulo ao padrão diafragmático.');
    summarizedItems.push('Fisio respiratória');
  }

  if (condutaAlongamento) {
    planParts.push('5. Alongamentos passivos e globais para prevenção de encurtamentos musculares.');
    summarizedItems.push('Alongamento global');
  }

  if (condutaOrientacao) {
    planParts.push('6. Orientações prestadas ao cuidador/família sobre posicionamento ergonômico e mudança de decúbito.');
    summarizedItems.push('Orientações ao cuidador');
  }

  // Se nenhuma conduta específica foi detectada pelo vocabulário, usa a transcrição direta ou conduta padrão
  if (planParts.length === 0) {
    if (rawConductSnippet) {
      planParts.push(`1. Conduta realizada: ${rawConductSnippet}.`);
      summarizedItems.push(rawConductSnippet);
    } else {
      planParts.push('1. Atendimento motor e funcional executado conforme planejamento terapêutico domiciliar.');
      summarizedItems.push('Atendimento funcional domiciliar');
    }
  }

  planParts.push('Manter plano terapêutico para as próximas sessões da escala.');
  const plan = planParts.join('\n');
  const summarizedConduct = summarizedItems.join(' + ') || 'Atendimento domiciliar realizado com sucesso';

  return {
    patientNameHint,
    rawTranscription: clean,
    vitals,
    subjective,
    objective,
    assessment,
    plan,
    summarizedConduct,
    detectedKeywords
  };
}
