// src/data/mockData.js

export const DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Lucas Silveira',
    specialty: 'Cardiologia & Clínica Médica',
    crm: 'CRM/SP 142.890',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    color: '#0284c7'
  },
  {
    id: 'doc-2',
    name: 'Dra. Beatriz Albuquerque',
    specialty: 'Clínica Geral & Medicina da Família',
    crm: 'CRM/SP 98.412',
    avatar: 'https://images.unsplash.com/photo-1594824813689-53748f572a15?w=150&auto=format&fit=crop&q=80',
    color: '#059669'
  },
  {
    id: 'doc-3',
    name: 'Dr. Rafael Fontes',
    specialty: 'Pediatria e Desenvolvimento Infantil',
    crm: 'CRM/SP 115.340',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    color: '#d97706'
  },
  {
    id: 'doc-4',
    name: 'Dra. Camila Nogueira',
    specialty: 'Dermatologia Clínica & Estética',
    crm: 'CRM/SP 178.220',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    color: '#9333ea'
  }
];

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
    insurance: 'Unimed Pleno',
    insuranceNumber: '8910239120',
    bloodType: 'O+',
    allergies: ['Penicilina', 'Dipirona Sódica'],
    chronicConditions: ['Hipertensão Leve'],
    weight: 64,
    height: 1.65,
    vitalsHistory: [
      { date: '10/05', bpSystolic: 125, bpDiastolic: 80, hr: 72, temp: 36.5, spo2: 98 },
      { date: '12/07', bpSystolic: 130, bpDiastolic: 84, hr: 76, temp: 36.7, spo2: 98 },
      { date: '15/09', bpSystolic: 122, bpDiastolic: 78, hr: 70, temp: 36.4, spo2: 99 },
      { date: '27/09', bpSystolic: 124, bpDiastolic: 82, hr: 74, temp: 36.6, spo2: 98 }
    ],
    lastVisit: 'Hoje, 09:30',
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
    insurance: 'Bradesco Saúde Top',
    insuranceNumber: '4459102941',
    bloodType: 'A+',
    allergies: ['Nenhuma conhecida'],
    chronicConditions: ['Diabetes Tipo 2', 'Dislipidemia'],
    weight: 86,
    height: 1.74,
    vitalsHistory: [
      { date: '02/06', bpSystolic: 142, bpDiastolic: 92, hr: 84, temp: 36.8, spo2: 97 },
      { date: '20/07', bpSystolic: 138, bpDiastolic: 88, hr: 80, temp: 36.6, spo2: 97 },
      { date: '15/08', bpSystolic: 135, bpDiastolic: 85, hr: 78, temp: 36.7, spo2: 98 },
      { date: '27/09', bpSystolic: 134, bpDiastolic: 84, hr: 82, temp: 36.8, spo2: 97 }
    ],
    lastVisit: 'Hoje, 10:15',
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
    insurance: 'SulAmérica Exato',
    insuranceNumber: '7721839210',
    bloodType: 'B-',
    allergies: ['Aspirina / AINEs', 'Sulfa'],
    chronicConditions: ['Asma Leve Intermitente'],
    weight: 56,
    height: 1.68,
    vitalsHistory: [
      { date: '14/04', bpSystolic: 110, bpDiastolic: 70, hr: 68, temp: 36.4, spo2: 99 },
      { date: '20/06', bpSystolic: 115, bpDiastolic: 75, hr: 72, temp: 36.5, spo2: 98 },
      { date: '27/09', bpSystolic: 114, bpDiastolic: 72, hr: 68, temp: 36.4, spo2: 99 }
    ],
    lastVisit: '15/08/2026',
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
    insurance: 'Amil Fácil',
    insuranceNumber: '334182910',
    bloodType: 'AB+',
    allergies: ['Proteína do Leite (APLV passada)'],
    chronicConditions: ['Nenhuma'],
    weight: 27.5,
    height: 1.28,
    vitalsHistory: [
      { date: '10/01', bpSystolic: 98, bpDiastolic: 62, hr: 92, temp: 36.5, spo2: 99 },
      { date: '12/05', bpSystolic: 100, bpDiastolic: 65, hr: 88, temp: 36.6, spo2: 99 },
      { date: '27/09', bpSystolic: 102, bpDiastolic: 66, hr: 86, temp: 36.5, spo2: 100 }
    ],
    lastVisit: 'Hoje, 11:30',
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
    insurance: 'Particular',
    insuranceNumber: 'PART-00491',
    bloodType: 'O-',
    allergies: ['Contraste Iodado'],
    chronicConditions: ['Osteopenia', 'Hipotireoidismo'],
    weight: 62,
    height: 1.60,
    vitalsHistory: [
      { date: '15/03', bpSystolic: 120, bpDiastolic: 78, hr: 68, temp: 36.4, spo2: 98 },
      { date: '10/06', bpSystolic: 126, bpDiastolic: 80, hr: 72, temp: 36.5, spo2: 97 },
      { date: '27/09', bpSystolic: 122, bpDiastolic: 78, hr: 70, temp: 36.5, spo2: 98 }
    ],
    lastVisit: 'Hoje, 14:00',
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=120&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    doctorId: 'doc-1',
    time: '08:30',
    date: '2026-09-27',
    type: 'Retorno Cardiológico',
    modality: 'Presencial',
    status: 'completed', // 'waiting' | 'in_progress' | 'completed' | 'scheduled' | 'cancelled'
    room: 'Consultório 03',
    notes: 'Avaliação dos exames de MAPA e Holter 24h.'
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    doctorId: 'doc-2',
    time: '09:15',
    date: '2026-09-27',
    type: 'Consulta de Rotina',
    modality: 'Presencial',
    status: 'completed',
    room: 'Consultório 01',
    notes: 'Ajuste posológico de medicação glicêmica.'
  },
  {
    id: 'apt-3',
    patientId: 'pat-4',
    doctorId: 'doc-3',
    time: '10:00',
    date: '2026-09-27',
    type: 'Puericultura & Desenvolvimento',
    modality: 'Presencial',
    status: 'in_progress',
    room: 'Consultório 04',
    notes: 'Acompanhamento de curva ponderoestatural e vacinas.'
  },
  {
    id: 'apt-4',
    patientId: 'pat-3',
    doctorId: 'doc-4',
    time: '11:00',
    date: '2026-09-27',
    type: 'Avaliação Dermatológica',
    modality: 'Telemedicina',
    status: 'waiting',
    room: 'Sala Virtual 02',
    notes: 'Queixa de lesão eritematosa descamativa em antebraço.'
  },
  {
    id: 'apt-5',
    patientId: 'pat-5',
    doctorId: 'doc-1',
    time: '14:00',
    date: '2026-09-27',
    type: 'Check-up Geral',
    modality: 'Presencial',
    status: 'scheduled',
    room: 'Consultório 03',
    notes: 'Trazer resultados de densitometria óssea e TSH.'
  },
  {
    id: 'apt-6',
    patientId: 'pat-2',
    doctorId: 'doc-1',
    time: '15:30',
    date: '2026-09-27',
    type: 'Eletrocardiograma de Repouso',
    modality: 'Presencial',
    status: 'scheduled',
    room: 'Sala de Exames 1',
    notes: 'Exame complementar solicitado pela Dra. Beatriz.'
  }
];

export const INITIAL_CLINICAL_RECORDS = {
  'pat-1': {
    patientId: 'pat-1',
    diagnoses: ['I10 - Hipertensão essencial (primária)'],
    currentMedications: [
      { name: 'Losartana Potássica', dose: '50 mg', frequency: '1x ao dia (manhã)', instructions: 'Tomar com água, em jejum.' },
      { name: 'Hidroclorotiazida', dose: '12.5 mg', frequency: '1x ao dia', instructions: 'Junto ao café da manhã.' }
    ],
    timeline: [
      {
        id: 'rec-1',
        date: '27/09/2026 - 08:30',
        doctor: 'Dr. Lucas Silveira',
        crm: 'CRM/SP 142.890',
        subject: 'Retorno Cardiológico - MAPA Normalizado',
        chiefComplaint: 'Paciente assintomática, nega cefaleia occipital, escotomas ou tonturas.',
        hda: 'Em acompanhamento de HAS em uso regular de Losartana 50mg + Hidroclorotiazida 12.5mg. Traz MAPA 24h com média de 122x78 mmHg em vigília e descenso noturno preservado. Excelente adesão medicamentosa e controle dietético hipossódico.',
        physicalExam: 'BEG, corada, hidratada, acianótica, anictérica. RCR 2T BNF sem sopros. Murmúrio vesicular presente bilateralmente, sem ruídos adventícios. PA: 124/82 mmHg. FC: 74 bpm. Abdome flácido, indolor. Membros inferiores sem edema.',
        conduct: 'Manter esquema terapêutico atual. Reforçado estímulo à prática de atividade física aeróbica 150min/semana. Próximo retorno em 6 meses com novo perfil lipídico e função renal.',
        cid: 'I10',
        prescriptions: [
          { drug: 'Losartana Potássica 50mg', qty: '2 caixas', dosage: 'Tomar 1 comprimido VO pela manhã.' },
          { drug: 'Hidroclorotiazida 12,5mg', qty: '2 caixas', dosage: 'Tomar 1 comprimido VO pela manhã.' }
        ],
        requestedExams: ['Creatinina sérica', 'Ureia', 'Potássio sérico', 'Perfil Lipídico Completo']
      },
      {
        id: 'rec-2',
        date: '15/09/2026 - 10:00',
        doctor: 'Dra. Beatriz Albuquerque',
        crm: 'CRM/SP 98.412',
        subject: 'Consulta Clínica Geral de Rotina',
        chiefComplaint: 'Check-up anual da saúde da mulher e renovação de receitas.',
        hda: 'Paciente relata boa disposição. Pratica caminhada 3 vezes por semana. Nega alterações gastrointestinais ou respiratórias.',
        physicalExam: 'PA: 122/78 mmHg, FC: 70 bpm, Peso: 64kg, IMC: 23.5 kg/m². Exame físico sem particularidades.',
        conduct: 'Solicitados mamografia de rastreio e citopatológico preventivo. Encaminhada para avaliação cardiológica de rotina.',
        cid: 'Z00.0',
        prescriptions: [],
        requestedExams: ['Mamografia Bilateral', 'Citopatologia Cérvico-Vaginal']
      }
    ]
  },
  'pat-2': {
    patientId: 'pat-2',
    diagnoses: ['E11 - Diabetes mellitus não-insulino-dependente', 'E78.0 - Hipercolesterolemia pura'],
    currentMedications: [
      { name: 'Cloridrato de Metformina', dose: '850 mg', frequency: '2x ao dia (após refeições)', instructions: 'Almoço e Jantar.' },
      { name: 'Sinvastatina', dose: '20 mg', frequency: '1x ao dia (noite)', instructions: 'Antes de dormir.' }
    ],
    timeline: [
      {
        id: 'rec-3',
        date: '27/09/2026 - 09:15',
        doctor: 'Dra. Beatriz Albuquerque',
        crm: 'CRM/SP 98.412',
        subject: 'Acompanhamento Metabólico',
        chiefComplaint: 'Retorno com exames laboratoriais de controle glicêmico.',
        hda: 'Hemoglobina Glicada (HbA1c) atual: 6.8% (meta < 7%). Glicemia de jejum: 118 mg/dL. LDL-c: 92 mg/dL. Paciente aderente à dieta orientada por nutricionista.',
        physicalExam: 'PA: 134/84 mmHg, FC: 82 bpm, Peso: 86kg, Circunferência abdominal: 98cm. Pulsos pediosos e tibiais posteriores cheios e simétricos. Sensibilidade preservada ao monofilamento 10g.',
        conduct: 'Metas atingidas satisfatoriamente. Mantida dose de Metformina 850mg 2x/dia e Sinvastatina 20mg à noite.',
        cid: 'E11.9',
        prescriptions: [
          { drug: 'Cloridrato de Metformina 850mg', qty: '3 caixas', dosage: '1 comprimido VO após almoço e 1 comprimido após o jantar.' },
          { drug: 'Sinvastatina 20mg', qty: '2 caixas', dosage: '1 comprimido VO à noite.' }
        ],
        requestedExams: ['Glicemia de Jejum', 'HbA1c', 'Microalbuminúria em amostra isolada']
      }
    ]
  }
};

export const COMMON_MEDICATIONS = [
  { name: 'Losartana Potássica', defaultDose: '50 mg', defaultInstructions: '1 comprimido pela manhã' },
  { name: 'Cloridrato de Metformina', defaultDose: '850 mg', defaultInstructions: '1 comprimido 2 vezes ao dia com as refeições' },
  { name: 'Amoxicilina + Clavulanato', defaultDose: '875mg + 125mg', defaultInstructions: '1 comprimido de 12 em 12 horas por 7 dias' },
  { name: 'Dipirona Monoidratada', defaultDose: '500 mg', defaultInstructions: '1 comprimido até de 6 em 6 horas se dor ou febre' },
  { name: 'Paracetamol', defaultDose: '750 mg', defaultInstructions: '1 comprimido até de 8 em 8 horas se dor' },
  { name: 'Omeprazol', defaultDose: '20 mg', defaultInstructions: '1 cápsula pela manhã em jejum 30 min antes da refeição' },
  { name: 'Sinvastatina', defaultDose: '20 mg', defaultInstructions: '1 comprimido ao deitar' },
  { name: 'Clonazepam', defaultDose: '0.5 mg', defaultInstructions: '1 comprimido à noite se insônia' },
  { name: 'Azitromicina', defaultDose: '500 mg', defaultInstructions: '1 comprimido ao dia por 5 dias' },
  { name: 'Prednisolona', defaultDose: '20 mg', defaultInstructions: '1 comprimido pela manhã por 5 dias com desmame' }
];

export const CLINIC_INFO = {
  name: 'OmniSaúde Clínica Integrada',
  cnes: '7849102',
  cnpj: '12.345.678/0001-90',
  address: 'Av. Paulista, 1842 - 14º Andar, Bela Vista - São Paulo / SP',
  phone: '(11) 3254-8000',
  whatsapp: '(11) 99123-0000',
  email: 'contato@omnisaude.com.br',
  director: 'Dr. Lucas Silveira - CRM/SP 142.890'
};
