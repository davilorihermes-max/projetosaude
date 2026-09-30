// src/data/mockData.js
// Configuração e dados de demonstração voltados para ATENDIMENTO DOMICILIAR (Home Care / Sessões Domiciliares)

export const PROFESSIONALS = [
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
    address: 'Alameda Santos, 1000 - Apto 82, Cerqueira César - SP',
    accessNotes: 'Portaria 24h, interfone 82. Vaga de visitante liberada para saúde.',
    caregiver: 'Dona Carmem (Mãe) - Tel: (11) 98111-2233',
    mobilityStatus: 'Deambula com andador / Restrita ao leito',
    coordinates: { latitude: -23.563099, longitude: -46.654271 },
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
    address: 'Rua Fradique Coutinho, 500 - Casa 3, Pinheiros - SP',
    accessNotes: 'Vila fechada. Portão de ferro manual, interfone Casa 3.',
    caregiver: 'Sra. Lúcia (Esposa) - Tel: (11) 97888-1122',
    mobilityStatus: 'Cadeira de rodas para deslocamentos externos',
    coordinates: { latitude: -23.567300, longitude: -46.693400 },
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
    address: 'Av. Moema, 350 - Bloco B, Apto 112, Moema - SP',
    accessNotes: 'Portaria principal pela Av. Moema, vaga de carga/descarga liberada.',
    caregiver: 'Fernanda (Irmã) - Tel: (11) 99111-4455',
    mobilityStatus: 'Deambula com tolerância moderada a esforços',
    coordinates: { latitude: -23.602200, longitude: -46.662100 },
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
    address: 'Rua Bela Cintra, 1400 - Cerqueira César - SP',
    accessNotes: 'Casa térrea com portão automático azul.',
    caregiver: 'Renata (Mãe) - Tel: (11) 96541-8899',
    mobilityStatus: 'Cadeirante pediátrico',
    coordinates: { latitude: -23.558000, longitude: -46.662000 },
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
    address: 'Rua Oscar Freire, 1800 - Apto 31, Pinheiros - SP',
    accessNotes: 'Edifício com rampa de acessibilidade e elevador.',
    caregiver: 'Dona Marisa (Cuidadora) - Tel: (11) 98112-9099',
    mobilityStatus: 'Restrita ao leito',
    coordinates: { latitude: -23.559000, longitude: -46.678000 },
    lastVisit: 'Hoje, 17:30 (Agendada)',
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=120&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1',
    patientId: 'pat-1',
    doctorId: 'doc-4',
    time: '09:00',
    date: '2026-09-28',
    type: 'Atendimento Domiciliar',
    durationMinutes: 45,
    status: 'completed', // 'waiting' | 'in_progress' | 'completed' | 'scheduled' | 'cancelled'
    distanceFromPrevKm: 0.8,
    transitTimeMinutes: 12,
    address: 'Alameda Santos, 1000 - Apto 82, Cerqueira César',
    notes: 'Atendimento presencial e suporte domiciliar.'
  },
  {
    id: 'apt-2',
    patientId: 'pat-2',
    doctorId: 'doc-4',
    time: '11:00',
    date: '2026-09-28',
    type: 'Sessão Domiciliar',
    durationMinutes: 45,
    status: 'in_progress', // Atendimento em andamento na casa do paciente
    distanceFromPrevKm: 3.9,
    transitTimeMinutes: 18,
    address: 'Rua Fradique Coutinho, 500 - Casa 3, Pinheiros',
    notes: 'Visita de rotina e orientação ao cuidador.'
  },
  {
    id: 'apt-3',
    patientId: 'pat-3',
    doctorId: 'doc-3',
    time: '14:00',
    date: '2026-09-28',
    type: 'Sessão de Fisioterapia Domiciliar',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 4.6,
    transitTimeMinutes: 20,
    address: 'Av. Moema, 350 - Bloco B, Moema',
    notes: 'Exercícios respiratórios e acompanhamento.'
  },
  {
    id: 'apt-4',
    patientId: 'pat-4',
    doctorId: 'doc-3',
    time: '16:00',
    date: '2026-09-28',
    type: 'Sessão de Fisioterapia Domiciliar',
    durationMinutes: 50,
    status: 'scheduled',
    distanceFromPrevKm: 3.2,
    transitTimeMinutes: 16,
    address: 'Rua Bela Cintra, 1400 - Cerqueira César',
    notes: 'Exercícios posturais e fortalecimento.'
  },
  {
    id: 'apt-5',
    patientId: 'pat-5',
    doctorId: 'doc-5',
    time: '17:30',
    date: '2026-09-28',
    type: 'Atendimento de Fonoaudiologia',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 2.1,
    transitTimeMinutes: 14,
    address: 'Rua Oscar Freire, 1800 - Apto 31, Pinheiros',
    notes: 'Treino de deglutição e orientação ao cuidador.'
  }
];

export const CLINIC_INFO = {
  name: 'OmniHome Care - Gestão Domiciliar Integrada',
  cnes: '7849102',
  cnpj: '12.345.678/0001-90',
  address: 'Central Operacional EMAD - Av. Paulista, 1000, São Paulo / SP',
  phone: '(11) 3254-8000',
  whatsapp: '(11) 99123-0000',
  email: 'operacional@omnihomecare.com.br',
  director: 'Coordenação Operacional OmniHome Care'
};
