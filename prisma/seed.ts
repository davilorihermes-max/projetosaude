// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando seed do banco de dados OmniSaúde (Grande Vitória)...');

  const defaultPasswordHash = await bcrypt.hash('DoctorPassword123!', 10);

  // =========================================================================
  // 1. Perfis Fundadores / Equipe Principal OmniSaúde
  // =========================================================================
  await prisma.user.upsert({
    where: { email: 'millachagass@gmail.com' },
    update: {},
    create: {
      name: 'Milla Chagas',
      email: 'millachagass@gmail.com',
      passwordHash: defaultPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          crm: 'COREN/SP 230.999',
          specialty: 'Enfermagem Oncológica & Domiciliar',
          latitude: -23.565,
          longitude: -46.657
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'sergio.hermesmeyer@yahoo.com' },
    update: {},
    create: {
      name: 'Sergio Hermesmeyer',
      email: 'sergio.hermesmeyer@yahoo.com',
      passwordHash: defaultPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          crm: 'CREFITO-4/ES 993-F',
          specialty: 'Fisioterapia Cardiorrespiratória',
          latitude: -20.3155,
          longitude: -40.3128
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { email: 'davilorihermes@gmail.com' },
    update: {},
    create: {
      name: 'Davi Loriato Hermesmeyer',
      email: 'davilorihermes@gmail.com',
      passwordHash: defaultPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          crm: 'CREFITO-3/SP 88.340-F',
          specialty: 'Fisioterapia & Reabilitação Domiciliar',
          latitude: -25.4284,
          longitude: -49.2733
        }
      }
    }
  });

  // =========================================================================
  // 2. 8 Fisioterapeutas da Grande Vitória (Motor e Respiratório)
  // =========================================================================
  const professionalsData = [
    {
      id: 'prof-es-1',
      name: 'Dr. Gabriel Vasconcellos Silva',
      email: 'gabriel.vasconcellos@omnihome.med.br',
      crm: 'CREFITO-2/ES 14.820-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.301200,
      longitude: -40.292500
    },
    {
      id: 'prof-es-2',
      name: 'Dra. Larissa Coutinho Ramos',
      email: 'larissa.coutinho@omnihome.med.br',
      crm: 'CREFITO-2/ES 18.310-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.288200,
      longitude: -40.299500
    },
    {
      id: 'prof-es-3',
      name: 'Dr. Rodrigo Peixoto Alves',
      email: 'rodrigo.peixoto@omnihome.med.br',
      crm: 'CREFITO-2/ES 21.450-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.338500,
      longitude: -40.286200
    },
    {
      id: 'prof-es-4',
      name: 'Dra. Camila Antunes Vieira',
      email: 'camila.antunes@omnihome.med.br',
      crm: 'CREFITO-2/ES 16.905-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.354200,
      longitude: -40.292800
    },
    {
      id: 'prof-es-5',
      name: 'Dr. Bruno Guimarães Siqueira',
      email: 'bruno.guimaraes@omnihome.med.br',
      crm: 'CREFITO-2/ES 24.120-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.198500,
      longitude: -40.252500
    },
    {
      id: 'prof-es-6',
      name: 'Dra. Mariana Zanchetta Esteves',
      email: 'mariana.zanchetta@omnihome.med.br',
      crm: 'CREFITO-2/ES 19.880-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.315500,
      longitude: -40.291500
    },
    {
      id: 'prof-es-7',
      name: 'Dr. Felipe Brandão Moura',
      email: 'felipe.brandao@omnihome.med.br',
      crm: 'CREFITO-2/ES 22.340-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.342500,
      longitude: -40.388200
    },
    {
      id: 'prof-es-8',
      name: 'Dra. Beatriz Sampaio Nogueira',
      email: 'beatriz.sampaio@omnihome.med.br',
      crm: 'CREFITO-2/ES 25.670-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.370500,
      longitude: -40.301800
    }
  ];

  const createdProsMap: Record<string, string> = {};

  for (const pro of professionalsData) {
    const user = await prisma.user.upsert({
      where: { email: pro.email },
      update: {
        name: pro.name
      },
      create: {
        name: pro.name,
        email: pro.email,
        passwordHash: defaultPasswordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            id: pro.id,
            crm: pro.crm,
            specialty: pro.specialty,
            latitude: pro.latitude,
            longitude: pro.longitude
          }
        }
      },
      include: {
        professional: true
      }
    });

    if (user.professional) {
      createdProsMap[pro.id] = user.professional.id;
    }
  }
  console.log(`✓ 8 Fisioterapeutas da Grande Vitória garantidos no banco de dados.`);

  // =========================================================================
  // 3. 7 Pacientes da Grande Vitória (Demandas de Fisio Motora e Respiratória)
  // =========================================================================
  const patientsData = [
    {
      id: 'pat-es-1',
      name: 'Dona Nilza Amorim Guimarães',
      cpf: '439.812.507-22',
      email: 'nilza.guimaraes@exemplo.com.br',
      phone: '(27) 99812-4011',
      address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
      latitude: -20.301200,
      longitude: -40.292500,
      careTeamProIds: ['prof-es-1', 'prof-es-2']
    },
    {
      id: 'pat-es-2',
      name: 'Sr. Wilson Calmon Figueiredo',
      cpf: '582.194.307-88',
      email: 'wilson.calmon@exemplo.com.br',
      phone: '(27) 99745-1290',
      address: 'Av. Dante Michelini, 3500 - Jardim Camburi, Vitória - ES',
      latitude: -20.267800,
      longitude: -40.284200,
      careTeamProIds: ['prof-es-1']
    },
    {
      id: 'pat-es-3',
      name: 'Dona Carmem Lucia Falcão',
      cpf: '318.490.712-44',
      email: 'carmem.falcao@exemplo.com.br',
      phone: '(27) 99654-7821',
      address: 'Av. Hugo Musso, 1200 - Praia da Costa, Vila Velha - ES',
      latitude: -20.338500,
      longitude: -40.286200,
      careTeamProIds: ['prof-es-4', 'prof-es-8']
    },
    {
      id: 'pat-es-4',
      name: 'Sr. Antônio Carlos Mendonça',
      cpf: '209.734.512-65',
      email: 'antonio.mendonca@exemplo.com.br',
      phone: '(27) 99881-3344',
      address: 'Av. Cézar Hilal, 1100 - Bento Ferreira, Vitória - ES',
      latitude: -20.317500,
      longitude: -40.311200,
      careTeamProIds: ['prof-es-1']
    },
    {
      id: 'pat-es-5',
      name: 'Dona Teresa Cristina Barbosa',
      cpf: '174.928.307-51',
      email: 'teresa.barbosa@exemplo.com.br',
      phone: '(27) 99512-9080',
      address: 'Rua Jair de Andrade, 400 - Itapuã, Vila Velha - ES',
      latitude: -20.354200,
      longitude: -40.292800,
      careTeamProIds: ['prof-es-4']
    },
    {
      id: 'pat-es-6',
      name: 'Sr. Joelcio Santana Neves',
      cpf: '620.318.947-19',
      email: 'joelcio.neves@exemplo.com.br',
      phone: '(27) 99701-4455',
      address: 'Av. Central, 800 - Laranjeiras, Serra - ES',
      latitude: -20.198500,
      longitude: -40.252500,
      careTeamProIds: ['prof-es-5']
    },
    {
      id: 'pat-es-7',
      name: 'Sra. Valquíria Prado Aguiar',
      cpf: '741.852.963-30',
      email: 'valquiria.aguiar@exemplo.com.br',
      phone: '(27) 99833-2211',
      address: 'Av. Expedito Garcia, 1000 - Campo Grande, Cariacica - ES',
      latitude: -20.342500,
      longitude: -40.388200,
      careTeamProIds: ['prof-es-7', 'prof-es-8']
    }
  ];

  for (const pat of patientsData) {
    const savedPatient = await prisma.patient.upsert({
      where: { cpf: pat.cpf },
      update: {
        name: pat.name,
        address: pat.address,
        phone: pat.phone,
        email: pat.email,
        latitude: pat.latitude,
        longitude: pat.longitude
      },
      create: {
        id: pat.id,
        name: pat.name,
        cpf: pat.cpf,
        email: pat.email,
        phone: pat.phone,
        address: pat.address,
        latitude: pat.latitude,
        longitude: pat.longitude
      }
    });

    // 4. Vincular profissionais do Care Team específico do paciente
    for (const proKey of pat.careTeamProIds) {
      const proId = createdProsMap[proKey] || proKey;
      const proRecord = await prisma.professional.findUnique({ where: { id: proId } });

      if (proRecord) {
        const exists = await prisma.careTeamMember.findFirst({
          where: { patientId: savedPatient.id, professionalId: proRecord.id }
        });

        if (!exists) {
          await prisma.careTeamMember.create({
            data: {
              patientId: savedPatient.id,
              professionalId: proRecord.id,
              role: 'PRIMARY_CARE',
              active: true
            }
          });
        }
      }
    }
  }
  console.log(`✓ 7 Pacientes da Grande Vitória e seus Care Teams vinculados com sucesso!`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
