// src/data/mockData.js
// Mock Data Oficial - Grande Vitória (ES)
// Fisioterapia Motora e Respiratória Domiciliar

export const PROFESSIONALS = [
  {
    id: 'prof-es-1',
    name: 'Dr. Gabriel Vasconcellos Silva',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Motora',
    councilNumber: 'CREFITO-2/ES 14.820-F',
    crm: 'CREFITO-2/ES 14.820-F',
    email: 'gabriel.vasconcellos@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    color: '#0284c7',
    baseAddress: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
    baseCoordinates: { latitude: -20.301200, longitude: -40.292500 },
    weekdayWindows: {
      1: { enabled: true, startTime: '07:00', endTime: '13:00' },
      2: { enabled: true, startTime: '07:00', endTime: '13:00' },
      3: { enabled: true, startTime: '07:00', endTime: '13:00' },
      4: { enabled: true, startTime: '07:00', endTime: '13:00' },
      5: { enabled: true, startTime: '07:00', endTime: '13:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-2',
    name: 'Dra. Larissa Coutinho Ramos',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Respiratória',
    councilNumber: 'CREFITO-2/ES 18.310-F',
    crm: 'CREFITO-2/ES 18.310-F',
    email: 'larissa.coutinho@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1594824813583-066487920ab4?w=150&auto=format&fit=crop&q=80',
    color: '#0d9488',
    baseAddress: 'Rua Darcy Grijó, 250 - Jardim da Penha, Vitória - ES',
    baseCoordinates: { latitude: -20.288200, longitude: -40.299500 },
    weekdayWindows: {
      1: { enabled: true, startTime: '08:00', endTime: '14:00' },
      2: { enabled: true, startTime: '08:00', endTime: '14:00' },
      3: { enabled: true, startTime: '08:00', endTime: '14:00' },
      4: { enabled: true, startTime: '08:00', endTime: '14:00' },
      5: { enabled: true, startTime: '08:00', endTime: '14:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-3',
    name: 'Dr. Rodrigo Peixoto Alves',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Motora',
    councilNumber: 'CREFITO-2/ES 21.450-F',
    crm: 'CREFITO-2/ES 21.450-F',
    email: 'rodrigo.peixoto@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    color: '#7c3aed',
    baseAddress: 'Av. Hugo Musso, 1200 - Praia da Costa, Vila Velha - ES',
    baseCoordinates: { latitude: -20.338500, longitude: -40.286200 },
    weekdayWindows: {
      1: { enabled: true, startTime: '13:00', endTime: '19:00' },
      2: { enabled: true, startTime: '13:00', endTime: '19:00' },
      3: { enabled: true, startTime: '13:00', endTime: '19:00' },
      4: { enabled: true, startTime: '13:00', endTime: '19:00' },
      5: { enabled: true, startTime: '13:00', endTime: '19:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-4',
    name: 'Dra. Camila Antunes Vieira',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Respiratória',
    councilNumber: 'CREFITO-2/ES 16.905-F',
    crm: 'CREFITO-2/ES 16.905-F',
    email: 'camila.antunes@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    color: '#e11d48',
    baseAddress: 'Rua Jair de Andrade, 400 - Itapuã, Vila Velha - ES',
    baseCoordinates: { latitude: -20.354200, longitude: -40.292800 },
    weekdayWindows: {
      1: { enabled: true, startTime: '14:00', endTime: '20:00' },
      2: { enabled: true, startTime: '14:00', endTime: '20:00' },
      3: { enabled: true, startTime: '14:00', endTime: '20:00' },
      4: { enabled: true, startTime: '14:00', endTime: '20:00' },
      5: { enabled: true, startTime: '14:00', endTime: '20:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-5',
    name: 'Dr. Bruno Guimarães Siqueira',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Motora',
    councilNumber: 'CREFITO-2/ES 24.120-F',
    crm: 'CREFITO-2/ES 24.120-F',
    email: 'bruno.guimaraes@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: '#d97706',
    baseAddress: 'Av. Central, 800 - Laranjeiras, Serra - ES',
    baseCoordinates: { latitude: -20.198500, longitude: -40.252500 },
    weekdayWindows: {
      1: { enabled: true, startTime: '08:00', endTime: '17:00' },
      2: { enabled: false, startTime: '08:00', endTime: '17:00' },
      3: { enabled: true, startTime: '08:00', endTime: '17:00' },
      4: { enabled: false, startTime: '08:00', endTime: '17:00' },
      5: { enabled: true, startTime: '08:00', endTime: '17:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-6',
    name: 'Dra. Mariana Zanchetta Esteves',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Respiratória',
    councilNumber: 'CREFITO-2/ES 19.880-F',
    crm: 'CREFITO-2/ES 19.880-F',
    email: 'mariana.zanchetta@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    color: '#059669',
    baseAddress: 'Rua José Alexandre Buaiz, 300 - Enseada do Suá, Vitória - ES',
    baseCoordinates: { latitude: -20.315500, longitude: -40.291500 },
    weekdayWindows: {
      1: { enabled: false, startTime: '07:30', endTime: '13:30' },
      2: { enabled: true, startTime: '07:30', endTime: '13:30' },
      3: { enabled: true, startTime: '07:30', endTime: '13:30' },
      4: { enabled: true, startTime: '07:30', endTime: '13:30' },
      5: { enabled: true, startTime: '07:30', endTime: '13:30' },
      6: { enabled: true, startTime: '07:30', endTime: '13:30' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-7',
    name: 'Dr. Felipe Brandão Moura',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Motora',
    councilNumber: 'CREFITO-2/ES 22.340-F',
    crm: 'CREFITO-2/ES 22.340-F',
    email: 'felipe.brandao@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    color: '#4f46e5',
    baseAddress: 'Av. Expedito Garcia, 1000 - Campo Grande, Cariacica - ES',
    baseCoordinates: { latitude: -20.342500, longitude: -40.388200 },
    weekdayWindows: {
      1: { enabled: true, startTime: '10:00', endTime: '16:00' },
      2: { enabled: true, startTime: '10:00', endTime: '16:00' },
      3: { enabled: true, startTime: '10:00', endTime: '16:00' },
      4: { enabled: true, startTime: '10:00', endTime: '16:00' },
      5: { enabled: true, startTime: '10:00', endTime: '16:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  },
  {
    id: 'prof-es-8',
    name: 'Dra. Beatriz Sampaio Nogueira',
    profession: 'Fisioterapia',
    specialty: 'Fisioterapia Respiratória',
    councilNumber: 'CREFITO-2/ES 25.670-F',
    crm: 'CREFITO-2/ES 25.670-F',
    email: 'beatriz.sampaio@omnihome.med.br',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    color: '#db2777',
    baseAddress: 'Rod. do Sol, 2000 - Praia de Itaparica, Vila Velha - ES',
    baseCoordinates: { latitude: -20.370500, longitude: -40.301800 },
    weekdayWindows: {
      1: { enabled: true, startTime: '12:00', endTime: '18:00' },
      2: { enabled: true, startTime: '12:00', endTime: '18:00' },
      3: { enabled: false, startTime: '12:00', endTime: '18:00' },
      4: { enabled: true, startTime: '12:00', endTime: '18:00' },
      5: { enabled: true, startTime: '12:00', endTime: '18:00' },
      6: { enabled: false, startTime: '08:00', endTime: '12:00' },
      0: { enabled: false, startTime: '08:00', endTime: '12:00' }
    }
  }
];

export const DOCTORS = PROFESSIONALS;

export const INITIAL_PATIENTS = [
  {
    id: 'pat-es-1',
    name: 'Dona Nilza Amorim Guimarães',
    age: 72,
    gender: 'Feminino',
    cpf: '439.812.507-22',
    birthDate: '1954-05-18',
    phone: '(27) 99812-4011',
    email: 'nilza.guimaraes@exemplo.com.br',
    insurance: 'Unimed Vitória Home Care',
    insuranceNumber: '82049102-01',
    address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
    accessNotes: 'Edifício com elevador e rampa de acessibilidade. Avisar portaria 15 min antes.',
    caregiver: 'Tatiana Guimarães (Filha) - Tel: (27) 99923-4512',
    mobilityStatus: 'Deambula com andador e apoio familiar (Hemiparesia leve)',
    latitude: -20.301200,
    longitude: -40.292500,
    coordinates: { latitude: -20.301200, longitude: -40.292500 },
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-1-mot',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 3,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: true, startTime: '08:00', endTime: '11:30' },
          2: { enabled: false, startTime: '08:00', endTime: '12:00' },
          3: { enabled: true, startTime: '08:00', endTime: '11:30' },
          4: { enabled: false, startTime: '08:00', endTime: '12:00' },
          5: { enabled: true, startTime: '08:00', endTime: '11:30' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      },
      {
        id: 'dem-pat-es-1-resp',
        therapyType: 'Fisioterapia Respiratória',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: false, startTime: '08:00', endTime: '12:00' },
          2: { enabled: true, startTime: '08:30', endTime: '11:30' },
          3: { enabled: false, startTime: '08:00', endTime: '12:00' },
          4: { enabled: true, startTime: '08:30', endTime: '11:30' },
          5: { enabled: false, startTime: '08:00', endTime: '12:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-1', 'prof-es-2']
  },
  {
    id: 'pat-es-2',
    name: 'Sr. Wilson Calmon Figueiredo',
    age: 68,
    gender: 'Masculino',
    cpf: '582.194.307-88',
    birthDate: '1958-08-24',
    phone: '(27) 99745-1290',
    email: 'wilson.calmon@exemplo.com.br',
    insurance: 'Samp Domiciliar',
    insuranceNumber: 'SMP-394821',
    address: 'Av. Dante Michelini, 3500 - Jardim Camburi, Vitória - ES',
    accessNotes: 'Portaria 24 horas, interfone 302. Estacionamento de visitantes liberado.',
    caregiver: 'Sra. Marisa (Esposa) - Tel: (27) 99745-1291',
    mobilityStatus: 'Pós-artroplastia total de joelho direito (Carga parcial com muletas)',
    latitude: -20.267800,
    longitude: -40.284200,
    coordinates: { latitude: -20.267800, longitude: -40.284200 },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-2-mot',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: false, startTime: '08:00', endTime: '12:00' },
          2: { enabled: true, startTime: '09:30', endTime: '12:00' },
          3: { enabled: false, startTime: '08:00', endTime: '12:00' },
          4: { enabled: true, startTime: '09:30', endTime: '12:00' },
          5: { enabled: false, startTime: '08:00', endTime: '12:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-1']
  },
  {
    id: 'pat-es-3',
    name: 'Dona Carmem Lucia Falcão',
    age: 79,
    gender: 'Feminino',
    cpf: '318.490.712-44',
    birthDate: '1947-11-09',
    phone: '(27) 99654-7821',
    email: 'carmem.falcao@exemplo.com.br',
    insurance: 'Bradesco Saúde Home Care',
    insuranceNumber: 'BRD-8829104',
    address: 'Av. Hugo Musso, 1200 - Praia da Costa, Vila Velha - ES',
    accessNotes: 'Edifício com vaga privativa na garagem subsolo para atendimento de saúde.',
    caregiver: 'Renata Falcão (Neta) - Tel: (27) 99654-7822',
    mobilityStatus: 'Restrita ao leito e poltrona por dispneia aos mínimos esforços',
    latitude: -20.338500,
    longitude: -40.286200,
    coordinates: { latitude: -20.338500, longitude: -40.286200 },
    avatar: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-3-resp',
        therapyType: 'Fisioterapia Respiratória',
        sessionsPerWeek: 3,
        durationMinutes: 45,
        preferredShift: 'afternoon',
        availableWindows: {
          1: { enabled: true, startTime: '14:00', endTime: '17:00' },
          2: { enabled: false, startTime: '13:00', endTime: '18:00' },
          3: { enabled: true, startTime: '14:00', endTime: '17:00' },
          4: { enabled: false, startTime: '13:00', endTime: '18:00' },
          5: { enabled: true, startTime: '14:00', endTime: '17:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-4', 'prof-es-8']
  },
  {
    id: 'pat-es-4',
    name: 'Sr. Antônio Carlos Mendonça',
    age: 74,
    gender: 'Masculino',
    cpf: '209.734.512-65',
    birthDate: '1952-03-30',
    phone: '(27) 99881-3344',
    email: 'antonio.mendonca@exemplo.com.br',
    insurance: 'Particular Home Care',
    insuranceNumber: 'PART-GV-004',
    address: 'Av. Cézar Hilal, 1100 - Bento Ferreira, Vitória - ES',
    accessNotes: 'Casa térrea com portão automático preto. Campainha no muro lateral.',
    caregiver: 'Dona Maria de Lourdes (Esposa) - Tel: (27) 99881-3345',
    mobilityStatus: 'Marcha parkinsoniana com festinação, necessita acompanhamento contínuo',
    latitude: -20.317500,
    longitude: -40.311200,
    coordinates: { latitude: -20.317500, longitude: -40.311200 },
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-4-mot',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 5,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: true, startTime: '07:30', endTime: '09:30' },
          2: { enabled: true, startTime: '07:30', endTime: '09:30' },
          3: { enabled: true, startTime: '07:30', endTime: '09:30' },
          4: { enabled: true, startTime: '07:30', endTime: '09:30' },
          5: { enabled: true, startTime: '07:30', endTime: '09:30' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-1']
  },
  {
    id: 'pat-es-5',
    name: 'Dona Teresa Cristina Barbosa',
    age: 65,
    gender: 'Feminino',
    cpf: '174.928.307-51',
    birthDate: '1961-09-14',
    phone: '(27) 99512-9080',
    email: 'teresa.barbosa@exemplo.com.br',
    insurance: 'Unimed Vitória Home Care',
    insuranceNumber: '82049102-09',
    address: 'Rua Jair de Andrade, 400 - Itapuã, Vila Velha - ES',
    accessNotes: 'Edifício Residencial Solarium, Apto 501. Interfone na portaria.',
    caregiver: 'Carlos Eduardo (Filho) - Tel: (27) 99512-9081',
    mobilityStatus: 'Deambula em domicílio sob oxigenoterapia contínua por cateter nasal',
    latitude: -20.354200,
    longitude: -40.292800,
    coordinates: { latitude: -20.354200, longitude: -40.292800 },
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-5-resp',
        therapyType: 'Fisioterapia Respiratória',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'afternoon',
        availableWindows: {
          1: { enabled: false, startTime: '13:00', endTime: '19:00' },
          2: { enabled: true, startTime: '16:30', endTime: '19:30' },
          3: { enabled: false, startTime: '13:00', endTime: '19:00' },
          4: { enabled: true, startTime: '16:30', endTime: '19:30' },
          5: { enabled: false, startTime: '13:00', endTime: '19:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-4']
  },
  {
    id: 'pat-es-6',
    name: 'Sr. Joelcio Santana Neves',
    age: 61,
    gender: 'Masculino',
    cpf: '620.318.947-19',
    birthDate: '1965-02-11',
    phone: '(27) 99701-4455',
    email: 'joelcio.neves@exemplo.com.br',
    insurance: 'Samp Domiciliar',
    insuranceNumber: 'SMP-774102',
    address: 'Av. Central, 800 - Laranjeiras, Serra - ES',
    accessNotes: 'Conjunto habitacional, Bloco 3, Apto 202. Entrada liberada após identificação.',
    caregiver: 'Dona Sandra (Esposa) - Tel: (27) 99701-4456',
    mobilityStatus: 'Fraqueza muscular generalizada pós-UTI, em treino ativo de transferências',
    latitude: -20.198500,
    longitude: -40.252500,
    coordinates: { latitude: -20.198500, longitude: -40.252500 },
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-6-mot',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 3,
        durationMinutes: 45,
        preferredShift: 'afternoon',
        availableWindows: {
          1: { enabled: true, startTime: '13:30', endTime: '16:30' },
          2: { enabled: false, startTime: '13:00', endTime: '18:00' },
          3: { enabled: true, startTime: '13:30', endTime: '16:30' },
          4: { enabled: false, startTime: '13:00', endTime: '18:00' },
          5: { enabled: true, startTime: '13:30', endTime: '16:30' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-5']
  },
  {
    id: 'pat-es-7',
    name: 'Sra. Valquíria Prado Aguiar',
    age: 52,
    gender: 'Feminino',
    cpf: '741.852.963-30',
    birthDate: '1974-12-05',
    phone: '(27) 99833-2211',
    email: 'valquiria.aguiar@exemplo.com.br',
    insurance: 'Particular Home Care',
    insuranceNumber: 'PART-GV-007',
    address: 'Av. Expedito Garcia, 1000 - Campo Grande, Cariacica - ES',
    accessNotes: 'Edifício Comercial e Residencial Central Park, portaria com rampa.',
    caregiver: 'Juliana Aguiar (Irmã) - Tel: (27) 99833-2212',
    mobilityStatus: 'Cadeira de rodas para distâncias médias, deambulação assistida em ambiente doméstico',
    latitude: -20.342500,
    longitude: -40.388200,
    coordinates: { latitude: -20.342500, longitude: -40.388200 },
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    demands: [
      {
        id: 'dem-pat-es-7-mot',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: false, startTime: '08:00', endTime: '12:00' },
          2: { enabled: true, startTime: '10:30', endTime: '13:00' },
          3: { enabled: false, startTime: '08:00', endTime: '12:00' },
          4: { enabled: true, startTime: '10:30', endTime: '13:00' },
          5: { enabled: false, startTime: '08:00', endTime: '12:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      },
      {
        id: 'dem-pat-es-7-resp',
        therapyType: 'Fisioterapia Respiratória',
        sessionsPerWeek: 3,
        durationMinutes: 45,
        preferredShift: 'morning',
        availableWindows: {
          1: { enabled: true, startTime: '11:00', endTime: '14:00' },
          2: { enabled: false, startTime: '08:00', endTime: '12:00' },
          3: { enabled: true, startTime: '11:00', endTime: '14:00' },
          4: { enabled: false, startTime: '08:00', endTime: '12:00' },
          5: { enabled: true, startTime: '11:00', endTime: '14:00' },
          6: { enabled: false, startTime: '08:00', endTime: '12:00' },
          0: { enabled: false, startTime: '08:00', endTime: '12:00' }
        }
      }
    ],
    careTeamProfessionalIds: ['prof-es-7', 'prof-es-8']
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-gv-1',
    patientId: 'pat-es-1',
    doctorId: 'prof-es-1',
    time: '08:30',
    date: '2026-10-19',
    type: 'Sessão de Fisioterapia Domiciliar',
    durationMinutes: 45,
    status: 'completed',
    checkedIn: true,
    checkInTime: '08:31',
    distanceFromPrevKm: 1.2,
    transitTimeMinutes: 10,
    address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
    notes: 'Cinesioterapia ativa-assistida e reabilitação de equilíbrio.'
  },
  {
    id: 'apt-gv-2',
    patientId: 'pat-es-2',
    doctorId: 'prof-es-1',
    time: '10:00',
    date: '2026-10-19',
    type: 'Sessão de Fisioterapia Domiciliar',
    durationMinutes: 45,
    status: 'completed',
    checkedIn: true,
    checkInTime: '10:02',
    distanceFromPrevKm: 4.8,
    transitTimeMinutes: 15,
    address: 'Av. Dante Michelini, 3500 - Jardim Camburi, Vitória - ES',
    notes: 'Treino de marcha com muletas e ganho de amplitude de movimento em joelho.'
  },
  {
    id: 'apt-gv-3',
    patientId: 'pat-es-3',
    doctorId: 'prof-es-4',
    time: '14:30',
    date: '2026-10-19',
    type: 'Atendimento Domiciliar',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 2.3,
    transitTimeMinutes: 12,
    address: 'Av. Hugo Musso, 1200 - Praia da Costa, Vila Velha - ES',
    notes: 'Manobras desobstrutivas e exercícios diafragmáticos para controle de dispneia.'
  },
  {
    id: 'apt-gv-4',
    patientId: 'pat-es-4',
    doctorId: 'prof-es-1',
    time: '07:30',
    date: '2026-10-20',
    type: 'Sessão de Fisioterapia Domiciliar',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 3.1,
    transitTimeMinutes: 12,
    address: 'Av. Cézar Hilal, 1100 - Bento Ferreira, Vitória - ES',
    notes: 'Treino de dissociação de cinturas e estratégias para redução de bloqueios motores.'
  },
  {
    id: 'apt-gv-5',
    patientId: 'pat-es-5',
    doctorId: 'prof-es-4',
    time: '17:00',
    date: '2026-10-20',
    type: 'Atendimento Domiciliar',
    durationMinutes: 45,
    status: 'scheduled',
    distanceFromPrevKm: 0.9,
    transitTimeMinutes: 8,
    address: 'Rua Jair de Andrade, 400 - Itapuã, Vila Velha - ES',
    notes: 'Treino de respiração com lábios semicerrados e conservação de energia.'
  }
];

export const CLINIC_INFO = {
  name: 'OmniHome Care - Grande Vitória',
  cnes: '7849102',
  cnpj: '33.456.789/0001-90',
  address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória / ES',
  phone: '(27) 3325-8000',
  whatsapp: '(27) 99812-0000',
  email: 'operacional.vitoria@omnihomecare.com.br',
  director: 'Coordenação Operacional de Fisioterapia Domiciliar'
};
