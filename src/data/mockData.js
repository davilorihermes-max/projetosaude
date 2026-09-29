// src/data/mockData.js
// Configuração e dados de demonstração voltados para ATENDIMENTO DOMICILIAR (Home Care / Sessões Domiciliares)

export const PROFESSIONALS = [
  {
    id: 'doc-1',
    name: 'Dr. Lucas Silveira',
    profession: 'Medicina',
    specialty: 'Medicina de Família & Atenção Domiciliar (EMAD)',
    councilNumber: 'CRM/SP 142.890',
    crm: 'CRM/SP 142.890',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    color: '#0284c7',
    baseAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    baseCoordinates: { latitude: -23.561684, longitude: -46.655981 }
  },
  {
    id: 'doc-2',
    name: 'Dra. Beatriz Albuquerque',
    profession: 'Medicina',
    specialty: 'Clínica Geral & Cuidados Paliativos Domiciliares',
    councilNumber: 'CRM/SP 98.412',
    crm: 'CRM/SP 98.412',
    avatar: 'https://images.unsplash.com/photo-1594824813689-53748f572a15?w=150&auto=format&fit=crop&q=80',
    color: '#059669',
    baseAddress: 'Rua Vergueiro, 1500 - Vila Mariana, São Paulo - SP',
    baseCoordinates: { latitude: -23.578100, longitude: -46.640200 }
  },
  {
    id: 'doc-3',
    name: 'Dr. Rafael Fontes',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Cardiorrespiratória & Motora no Leito',
    councilNumber: 'CREFITO/SP 88.340',
    crm: 'CREFITO/SP 88.340',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    color: '#d97706',
    baseAddress: 'Rua Domingos de Morais, 800 - Vila Mariana, São Paulo - SP',
    baseCoordinates: { latitude: -23.585000, longitude: -46.638000 }
  },
  {
    id: 'doc-4',
    name: 'Dra. Camila Nogueira',
    profession: 'Enfermagem',
    specialty: 'Enfermagem Estomaterapeuta & Lesões Cutâneas',
    councilNumber: 'COREN/SP 230.110',
    crm: 'COREN/SP 230.110',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    color: '#9333ea',
    baseAddress: 'Rua Pamplona, 700 - Jardim Paulista, São Paulo - SP',
    baseCoordinates: { latitude: -23.565000, longitude: -46.657000 }
  },
  {
    id: 'doc-5',
    name: 'Dra. Fernanda Prado',
    profession: 'Fonoaudiologia',
    specialty: 'Fonoaudiologia & Reabilitação de Deglutição (Disfagia)',
    councilNumber: 'CRFa/SP 14.520',
    crm: 'CRFa/SP 14.520',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    color: '#0d9488',
    baseAddress: 'Alameda Santos, 1200 - Cerqueira César, São Paulo - SP',
    baseCoordinates: { latitude: -23.563000, longitude: -46.653000 }
  },
  {
    id: 'doc-6',
    name: 'Dr. Thiago Ramos',
    profession: 'Nutrição',
    specialty: 'Nutrição Clínica & Terapia Enteral no Domicílio',
    councilNumber: 'CRN-3/SP 45.190',
    crm: 'CRN-3/SP 45.190',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: '#e11d48',
    baseAddress: 'Rua Bela Cintra, 900 - Consolação, São Paulo - SP',
    baseCoordinates: { latitude: -23.555000, longitude: -46.661000 }
  }
];

export const DOCTORS = PROFESSIONALS;

export const INITIAL_PATIENTS = [
  {
    id: 'pat-1',
    name: 'Mariana Souza Lima',
    age: 34,
    gender: 'Feminino',
    cpf: '284.912.839-44',
    birthDate: '1992-04-15',
    phone: '(11) 98452-1920',
    email: 'mariana.lima@exemplo.com.br',
    insurance: 'Unimed Pleno Home Care',
    insuranceNumber: '8910239120',
    bloodType: 'O+',
    allergies: ['Penicilina', 'Dipirona Sódica'],
    chronicConditions: ['Pós-operatório de Artroplastia', 'Hipertensão'],
    address: 'Alameda Santos, 1000 - Apto 82, Cerqueira César - SP',
    accessNotes: 'Portaria 24h, interfone 82. Vaga de visitante liberada para saúde.',
    caregiver: 'Dona Carmem (Mãe) - Tel: (11) 98111-2233',
    mobilityStatus: 'Deambula com andador / Restrita ao leito em reabilitação',
    coordinates: { latitude: -23.563099, longitude: -46.654271 },
    weight: 64,
    height: 1.65,
    vitalsHistory: [
      { date: '10/09', bpSystolic: 125, bpDiastolic: 80, hr: 72, temp: 36.5, spo2: 98 },
      { date: '18/09', bpSystolic: 128, bpDiastolic: 82, hr: 74, temp: 36.6, spo2: 98 },
      { date: '27/09', bpSystolic: 122, bpDiastolic: 78, hr: 70, temp: 36.4, spo2: 99 },
      { date: 'Hoje', bpSystolic: 120, bpDiastolic: 78, hr: 72, temp: 36.5, spo2: 99 }
    ],
    lastVisit: 'Hoje, 09:00 (Concluída)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'pat-2',
    name: 'Roberto Carlos Peixoto',
    age: 58,
    gender: 'Masculino',
    cpf: '109.834.721-12',
    birthDate: '1968-09-12',
    phone: '(11) 97123-4567',
    email: 'roberto.peixoto@exemplo.com.br',
    insurance: 'Bradesco Saúde Domiciliar',
    insuranceNumber: '4459102941',
    bloodType: 'A+',
    allergies: ['Nenhuma conhecida'],
    chronicConditions: ['Diabetes Tipo 2 com neuropatia periférica', 'Pé diabético'],
    address: 'Rua Fradique Coutinho, 500 - Casa 3, Pinheiros - SP',
    accessNotes: 'Vila fechada. Portão de ferro manual, interfone Casa 3.',
    caregiver: 'Sra. Lúcia (Esposa) - Tel: (11) 97888-1122',
    mobilityStatus: 'Cadeira de rodas para deslocamentos externos',
    coordinates: { latitude: -23.567300, longitude: -46.693400 },
    weight: 86,
    height: 1.74,
    vitalsHistory: [
      { date: '12/09', bpSystolic: 142, bpDiastolic: 92, hr: 84, temp: 36.8, spo2: 97 },
      { date: '20/09', bpSystolic: 138, bpDiastolic: 88, hr: 80, temp: 36.6, spo2: 97 },
      { date: 'Hoje', bpSystolic: 134, bpDiastolic: 84, hr: 80, temp: 36.7, spo2: 98 }
    ],
    lastVisit: 'Hoje, 11:00 (Em atendimento)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'pat-3',
    name: 'Juliana Mendes Prado',
    age: 27,
    gender: 'Feminino',
    cpf: '418.992.301-85',
    birthDate: '1999-11-20',
    phone: '(11) 99881-2233',
    email: 'juliana.prado@exemplo.com.br',
    insurance: 'SulAmérica Home Care',
    insuranceNumber: '7721839210',
    bloodType: 'B-',
    allergies: ['Aspirina / AINEs', 'Sulfa'],
    chronicConditions: ['Asma grave sob oxigenoterapia domiciliar intermitente'],
    address: 'Av. Moema, 350 - Bloco B, Apto 112, Moema - SP',
    accessNotes: 'Portaria principal pela Av. Moema, vaga de carga/descarga liberada.',
    caregiver: 'Fernanda (Irmã) - Tel: (11) 99111-4455',
    mobilityStatus: 'Deambula com tolerância moderada a esforços',
    coordinates: { latitude: -23.602200, longitude: -46.662100 },
    weight: 56,
    height: 1.68,
    vitalsHistory: [
      { date: '14/09', bpSystolic: 110, bpDiastolic: 70, hr: 68, temp: 36.4, spo2: 97 },
      { date: '22/09', bpSystolic: 115, bpDiastolic: 75, hr: 72, temp: 36.5, spo2: 98 },
      { date: 'Hoje', bpSystolic: 114, bpDiastolic: 72, hr: 70, temp: 36.5, spo2: 98 }
    ],
    lastVisit: 'Hoje, 14:00 (Agendada)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'pat-4',
    name: 'Gabriel Santos Oliveira',
    age: 8,
    gender: 'Masculino',
    cpf: '512.439.810-76',
    birthDate: '2018-02-10',
    phone: '(11) 96541-8899',
    email: 'pais.gabriel@exemplo.com.br',
    insurance: 'Amil Fácil Domiciliar',
    insuranceNumber: '334182910',
    bloodType: 'AB+',
    allergies: ['Proteína do Leite (APLV)'],
    chronicConditions: ['Reabilitação neuromotora pediátrica em domicílio'],
    address: 'Rua Bela Cintra, 1400 - Cerqueira César - SP',
    accessNotes: 'Casa térrea com portão automático azul.',
    caregiver: 'Renata (Mãe) - Tel: (11) 96541-8899',
    mobilityStatus: 'Estimulação precoce / Cadeirante pediátrico',
    coordinates: { latitude: -23.558000, longitude: -46.662000 },
    weight: 27.5,
    height: 1.28,
    vitalsHistory: [
      { date: '20/09', bpSystolic: 98, bpDiastolic: 62, hr: 92, temp: 36.5, spo2: 99 },
      { date: 'Hoje', bpSystolic: 100, bpDiastolic: 64, hr: 88, temp: 36.5, spo2: 100 }
    ],
    lastVisit: 'Hoje, 16:00 (Agendada)',
    avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'pat-5',
    name: 'Helena Vasconcelos',
    age: 65,
    gender: 'Feminino',
    cpf: '087.654.321-99',
    birthDate: '1961-07-04',
    phone: '(11) 98112-9090',
    email: 'helena.vasconcelos@exemplo.com.br',
    insurance: 'Particular Home Care',
    insuranceNumber: 'PART-00491',
    bloodType: 'O-',
    allergies: ['Contraste Iodado'],
    chronicConditions: ['Acamada crônica / Pós-AVC com hemiparesia'],
    address: 'Rua Oscar Freire, 1800 - Apto 31, Pinheiros - SP',
    accessNotes: 'Edifício com rampa de acessibilidade e elevador amplo para maca.',
    caregiver: 'Enfermeira Marisa (Plantão 12x36) - Tel: (11) 98112-9099',
    mobilityStatus: 'Acamada / Mudança de decúbito assistida',
    coordinates: { latitude: -23.559000, longitude: -46.678000 },
    weight: 62,
    height: 1.60,
    vitalsHistory: [
      { date: '15/09', bpSystolic: 124, bpDiastolic: 80, hr: 68, temp: 36.4, spo2: 98 },
      { date: 'Hoje', bpSystolic: 122, bpDiastolic: 78, hr: 70, temp: 36.5, spo2: 98 }
    ],
    lastVisit: 'Hoje, 17:30 (Agendada)',
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=120&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    time: '09:00',
    date: '2026-09-28',
    type: 'Sessão Domiciliar Médica & Curativo',
    durationMinutes: 45,
    status: 'completed', // 'waiting' | 'in_progress' | 'completed' | 'scheduled' | 'cancelled'
    distanceFromPrevKm: 0.8,
    transitTimeMinutes: 12,
    address: 'Alameda Santos, 1000 - Apto 82, Cerqueira César',
    notes: 'Avaliação da ferida operatória e aferição de sinais vitais no leito.'
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    doctorId: 'doc-1',
    time: '11:00',
    date: '2026-09-28',
    type: 'Atendimento Domiciliar de Controle Metabólico',
    durationMinutes: 45,
    status: 'in_progress', // Atendimento em andamento na casa do paciente
    distanceFromPrevKm: 3.9,
    transitTimeMinutes: 18,
    address: 'Rua Fradique Coutinho, 500 - Casa 3, Pinheiros',
    notes: 'Desbridamento de lesão plantar e ajuste de dose de insulina.'
  },
  {
    id: 'apt-3',
    patientId: 'pat-3',
    doctorId: 'doc-1',
    time: '14:00',
    date: '2026-09-28',
    type: 'Visita Domiciliar Respiratória',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 4.6,
    transitTimeMinutes: 20,
    address: 'Av. Moema, 350 - Bloco B, Moema',
    notes: 'Checagem de cilindro de O2, oximetria e ausculta pulmonar.'
  },
  {
    id: 'apt-4',
    patientId: 'pat-4',
    doctorId: 'doc-3',
    time: '16:00',
    date: '2026-09-28',
    type: 'Sessão de Fisioterapia Neuromotora',
    durationMinutes: 50,
    status: 'scheduled',
    distanceFromPrevKm: 3.2,
    transitTimeMinutes: 16,
    address: 'Rua Bela Cintra, 1400 - Cerqueira César',
    notes: 'Exercícios posturais e fortalecimento em tapete terapêutico.'
  },
  {
    id: 'apt-5',
    patientId: 'pat-5',
    doctorId: 'doc-1',
    time: '17:30',
    date: '2026-09-28',
    type: 'Revisão Domiciliar Pós-AVC',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 2.1,
    transitTimeMinutes: 14,
    address: 'Rua Oscar Freire, 1800 - Apto 31, Pinheiros',
    notes: 'Prevenção de úlceras por pressão e orientação ao cuidador.'
  }
];

export const INITIAL_CLINICAL_RECORDS = {
  'pat-1': {
    patientId: 'pat-1',
    diagnoses: ['Z96.6 - Presença de implante articular ortopédico', 'I10 - Hipertensão essencial'],
    currentMedications: [
      { name: 'Enoxaparina Sódica', dose: '40 mg', frequency: '1x ao dia SC', instructions: 'Aplicar no abdome, alternando lados.' },
      { name: 'Dipirona Sódica', dose: '500 mg', frequency: 'Se dor intensa', instructions: 'Apenas com prescrição em SOS.' }
    ],
    timeline: [
      {
        id: 'rec-1c',
        date: '28/09/2026 - 15:30',
        doctor: 'Dr. Rafael Fontes',
        profession: 'Fisioterapia',
        crm: 'CREFITO/SP 88.340',
        subject: 'Fisioterapia Motora & Treino de Marcha',
        chiefComplaint: 'Sessão domiciliar de cinesioterapia e treino de deambulação assistida.',
        hda: 'Paciente orientada quanto a transferências seguras leito-poltrona. Realizados exercícios ativos assistidos de flexão/extensão e fortalecimento de quadríceps.',
        physicalExam: 'ADM de flexão de quadril preservada a 90°. Sem dor excessiva ou instabilidade. Deambulação assistida com andador por 25 metros no corredor residencial com boa tolerância.',
        conduct: 'Plano mantido de 3 sessões semanais. Orientado cuidador quanto ao uso correto do andador e prevenção de quedas.',
        cid: 'Z96.6',
        requestedExams: []
      },
      {
        id: 'rec-1b',
        date: '28/09/2026 - 11:30',
        doctor: 'Dra. Camila Nogueira',
        profession: 'Enfermagem',
        crm: 'COREN/SP 230.110',
        subject: 'Visita de Enfermagem & Avaliação de Ferida Operatória',
        chiefComplaint: 'Inspeção de ferida cirúrgica, hidratação cutânea e sinais vitais.',
        hda: 'Leito limpo, arejado e organizado. Cuidador treinado administrando medicações nos horários prescritos.',
        physicalExam: 'PA: 120/76 mmHg, FC: 70 bpm, Temperatura axilar: 36.4°C. Incisão cirúrgica limpa e seca, sem exsudato. Aplicada cobertura estéril respirável.',
        conduct: 'Mantido curativo seco com micropore e gaze estéril. Próxima troca em 48 horas pela equipe.',
        cid: 'Z96.6',
        requestedExams: []
      },
      {
        id: 'rec-1',
        date: '28/09/2026 - 09:00',
        doctor: 'Dr. Lucas Silveira',
        profession: 'Medicina',
        crm: 'CRM/SP 142.890',
        subject: 'Avaliação Clínica Domiciliar - Revisão Pós-Artroplastia',
        chiefComplaint: 'Atendimento domiciliar de rotina no 12º DPO.',
        hda: 'Paciente encontrada no leito em bom estado geral. Relata melhora progressiva da dor. Nega febre. Cuidadora informa boa ingesta hídrica e alimentar.',
        physicalExam: 'PA: 120/78 mmHg, FC: 72 bpm, SpO2: 99% em ar ambiente. Ferida cirúrgica em quadril direito limpa, bordas aproximadas sem flogose. Sem empastamento de panturrilhas.',
        conduct: 'Liberada para sessões de fisioterapia motora com carga parcial. Retirada de pontos programada.',
        cid: 'Z96.6',
        requestedExams: ['Hemograma Completo', 'PCR']
      }
    ]
  },
  'pat-2': {
    patientId: 'pat-2',
    diagnoses: ['E11.5 - Diabetes mellitus tipo 2 com complicações circulatórias'],
    currentMedications: [
      { name: 'Insulina NPH', dose: '24 UI', frequency: 'Pela manhã', instructions: 'Aplicação SC pré-café.' },
      { name: 'Metformina', dose: '850 mg', frequency: '2x ao dia', instructions: 'Após almoço e jantar.' }
    ],
    timeline: [
      {
        id: 'rec-2b',
        date: '28/09/2026 - 14:00',
        doctor: 'Dr. Thiago Ramos',
        profession: 'Nutrição',
        crm: 'CRN-3/SP 45.190',
        subject: 'Consulta Nutricional Domiciliar & Controle Glicêmico',
        chiefComplaint: 'Adequação de cardápio domiciliar e suporte para cicatrização tecidual.',
        hda: 'Avaliação da despensa e orientações aos familiares para fracionamento de carboidratos complexos e aporte proteico aumentado para estímulo de tecido de granulação.',
        physicalExam: 'Peso estimado: 74 kg, IMC: 25.6 kg/m². Glicemia capilar 2h pós-almoço: 138 mg/dL.',
        conduct: 'Entregue plano alimentar individualizado ao cuidador com foco em micronutrientes (Zinco, Vitamina C e Proteínas de alto valor biológico).',
        cid: 'E11.5',
        requestedExams: ['Glicemia de Jejum', 'Hemoglobina Glicada', 'Albumina Sérica']
      },
      {
        id: 'rec-2',
        date: '28/09/2026 - 11:00',
        doctor: 'Dra. Camila Nogueira',
        profession: 'Enfermagem',
        crm: 'COREN/SP 230.110',
        subject: 'Atendimento de Estomaterapia - Curativo Especial em Pé Diabético',
        chiefComplaint: 'Acompanhamento domiciliar de úlcera neuropática em calcâneo esquerdo.',
        hda: 'Paciente atendido na poltrona da sala. Cuidadora relata troca diária de curativo oclusivo conforme protocolo da equipe.',
        physicalExam: 'PA: 134/84 mmHg, FC: 80 bpm, Glicemia capilar pontual: 142 mg/dL. Lesão trófica de 2x1.5 cm com tecido de granulação ativo, sem sinais de infecção aguda ou exsudato purulento.',
        conduct: 'Realizada limpeza com soro fisiológico 0.9% e aplicação de hidrogel com alginato de prata. Reforçado uso de calçado protetor com alívio de pressão.',
        cid: 'E11.5',
        requestedExams: []
      }
    ]
  }
};

export const COMMON_MEDICATIONS = [
  { name: 'Cefalexina', defaultDose: '500 mg', defaultInstructions: '1 cápsula de 6 em 6 horas por 7 dias' },
  { name: 'Enoxaparina Sódica', defaultDose: '40 mg/0.4ml', defaultInstructions: '1 aplicação SC ao dia' },
  { name: 'Dipirona Sódica', defaultDose: '500 mg/ml', defaultInstructions: '35 a 40 gotas de 6/6h se dor ou febre' },
  { name: 'Paracetamol', defaultDose: '750 mg', defaultInstructions: '1 comprimido até 3x ao dia se dor leve' },
  { name: 'Losartana Potássica', defaultDose: '50 mg', defaultInstructions: '1 comprimido pela manhã' },
  { name: 'Metformina', defaultDose: '850 mg', defaultInstructions: '1 comprimido 2 vezes ao dia com as refeições' },
  { name: 'Omeprazol', defaultDose: '20 mg', defaultInstructions: '1 cápsula pela manhã em jejum' },
  { name: 'Alginato de Prata / Hidrogel', defaultDose: 'Tópico', defaultInstructions: 'Aplicar na lesão a cada troca de curativo domiciliar' }
];

export const CLINIC_INFO = {
  name: 'OmniHome Care - Saúde Domiciliar Integrada',
  cnes: '7849102',
  cnpj: '12.345.678/0001-90',
  address: 'Central Operacional EMAD - Av. Paulista, 1000, São Paulo / SP',
  phone: '(11) 3254-8000',
  whatsapp: '(11) 99123-0000',
  email: 'operacional@omnihomecare.com.br',
  director: 'Dr. Lucas Silveira - CRM/SP 142.890'
};
