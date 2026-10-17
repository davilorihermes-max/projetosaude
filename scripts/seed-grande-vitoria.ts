// scripts/seed-grande-vitoria.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.resolve(rootDir, '.env.local');
const envPath = path.resolve(rootDir, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function run() {
  console.log('========================================================================');
  console.log('🏥 OmniSaúde - Carga Oficial de Mock Data da Grande Vitória (ES)');
  console.log('========================================================================\n');

  const defaultPasswordHash = await bcrypt.hash('DoctorPassword123!', 10);

  // 1. 8 Profissionais Fisioterapeutas
  const professionals = [
    {
      id: 'prof-es-1',
      name: 'Dr. Gabriel Vasconcellos Silva',
      email: 'gabriel.vasconcellos@omnihome.med.br',
      crm: 'CREFITO-2/ES 14.820-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.301200,
      longitude: -40.292500,
      availability: 'Seg a Sex: 07:00 às 13:00 (Manhã cedo)',
      city: 'Vitória (Praia do Canto)'
    },
    {
      id: 'prof-es-2',
      name: 'Dra. Larissa Coutinho Ramos',
      email: 'larissa.coutinho@omnihome.med.br',
      crm: 'CREFITO-2/ES 18.310-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.288200,
      longitude: -40.299500,
      availability: 'Seg a Sex: 08:00 às 14:00 (Manhã comercial)',
      city: 'Vitória (Jardim da Penha)'
    },
    {
      id: 'prof-es-3',
      name: 'Dr. Rodrigo Peixoto Alves',
      email: 'rodrigo.peixoto@omnihome.med.br',
      crm: 'CREFITO-2/ES 21.450-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.338500,
      longitude: -40.286200,
      availability: 'Seg a Sex: 13:00 às 19:00 (Tarde)',
      city: 'Vila Velha (Praia da Costa)'
    },
    {
      id: 'prof-es-4',
      name: 'Dra. Camila Antunes Vieira',
      email: 'camila.antunes@omnihome.med.br',
      crm: 'CREFITO-2/ES 16.905-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.354200,
      longitude: -40.292800,
      availability: 'Seg a Sex: 14:00 às 20:00 (Tarde/Noite)',
      city: 'Vila Velha (Itapuã)'
    },
    {
      id: 'prof-es-5',
      name: 'Dr. Bruno Guimarães Siqueira',
      email: 'bruno.guimaraes@omnihome.med.br',
      crm: 'CREFITO-2/ES 24.120-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.198500,
      longitude: -40.252500,
      availability: 'Seg/Qua/Sex: 08:00 às 17:00 (Integral flexível)',
      city: 'Serra (Laranjeiras)'
    },
    {
      id: 'prof-es-6',
      name: 'Dra. Mariana Zanchetta Esteves',
      email: 'mariana.zanchetta@omnihome.med.br',
      crm: 'CREFITO-2/ES 19.880-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.315500,
      longitude: -40.291500,
      availability: 'Ter a Sáb: 07:30 às 13:30 (Manhã com Sábado)',
      city: 'Vitória (Enseada do Suá)'
    },
    {
      id: 'prof-es-7',
      name: 'Dr. Felipe Brandão Moura',
      email: 'felipe.brandao@omnihome.med.br',
      crm: 'CREFITO-2/ES 22.340-F',
      specialty: 'Fisioterapia Motora',
      latitude: -20.342500,
      longitude: -40.388200,
      availability: 'Seg a Sex: 10:00 às 16:00 (Intermediário)',
      city: 'Cariacica (Campo Grande)'
    },
    {
      id: 'prof-es-8',
      name: 'Dra. Beatriz Sampaio Nogueira',
      email: 'beatriz.sampaio@omnihome.med.br',
      crm: 'CREFITO-2/ES 25.670-F',
      specialty: 'Fisioterapia Respiratória',
      latitude: -20.370500,
      longitude: -40.301800,
      availability: 'Seg/Ter/Qui/Sex: 12:00 às 18:00 (Tarde estendida)',
      city: 'Vila Velha (Praia de Itaparica)'
    }
  ];

  console.log('📌 1. Registrando os 8 Fisioterapeutas:');
  const proIdMap: Record<string, string> = {};

  for (const pro of professionals) {
    const user = await prisma.user.upsert({
      where: { email: pro.email },
      update: { name: pro.name },
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
      include: { professional: true }
    });

    if (user.professional) {
      proIdMap[pro.id] = user.professional.id;
    }
    console.log(`  ✓ ${pro.name} [${pro.specialty}] - ${pro.availability} (${pro.city})`);
  }

  // 2. 7 Pacientes na Grande Vitória
  const patients = [
    {
      id: 'pat-es-1',
      name: 'Dona Nilza Amorim Guimarães',
      cpf: '439.812.507-22',
      email: 'nilza.guimaraes@exemplo.com.br',
      phone: '(27) 99812-4011',
      address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
      latitude: -20.301200,
      longitude: -40.292500,
      demandsSummary: '3x Fisio Motora (Manhã 08h-11h30) + 2x Fisio Respiratória (Manhã 08h30-11h30)',
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
      demandsSummary: '2x Fisio Motora (Ter/Qui: 09h30-12h)',
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
      demandsSummary: '3x Fisio Respiratória (Seg/Qua/Sex: 14h-17h)',
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
      demandsSummary: '5x Fisio Motora (Seg a Sex: 07h30-09h30)',
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
      demandsSummary: '2x Fisio Respiratória (Ter/Qui: 16h30-19h30)',
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
      demandsSummary: '3x Fisio Motora (Seg/Qua/Sex: 13h30-16h30)',
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
      demandsSummary: '2x Fisio Motora (Ter/Qui: 10h30-13h) + 3x Fisio Respiratória (Seg/Qua/Sex: 11h-14h)',
      careTeamProIds: ['prof-es-7', 'prof-es-8']
    }
  ];

  console.log('\n📌 2. Registrando os 7 Pacientes e Configurando Care Team:');
  for (const pat of patients) {
    const saved = await prisma.patient.upsert({
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

    for (const proKey of pat.careTeamProIds) {
      const realProId = proIdMap[proKey] || proKey;
      const proRecord = await prisma.professional.findUnique({ where: { id: realProId } });
      if (proRecord) {
        const exists = await prisma.careTeamMember.findFirst({
          where: { patientId: saved.id, professionalId: proRecord.id }
        });
        if (!exists) {
          await prisma.careTeamMember.create({
            data: {
              patientId: saved.id,
              professionalId: proRecord.id,
              role: 'PRIMARY_CARE',
              active: true
            }
          });
        }
      }
    }

    console.log(`  ✓ ${pat.name} (${pat.address})`);
    console.log(`    ↳ Demandas: ${pat.demandsSummary}`);
    console.log(`    ↳ Care Team: ${pat.careTeamProIds.join(', ')}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 CARGA DA GRANDE VITÓRIA CONCLUÍDA COM SUCESSO!');
  console.log('8 Fisioterapeutas e 7 Pacientes prontos no banco e no motor de escala.');
  console.log('========================================================================\n');
}

run()
  .catch((e) => {
    console.error('❌ Falha na carga de dados da Grande Vitória:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
