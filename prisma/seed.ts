// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando seed do banco de dados OmniSaúde...');

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const defaultPasswordHash = await bcrypt.hash('DoctorPassword123!', 10);

  // 1. Perfis Reais da Equipe OmniSaúde
  // 1a. Milla Chagas
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

  // 2b. Sérgio Hermes Meyer
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

  // 2c. Davi Loriato Hermes
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
  console.log('✓ Perfis da equipe OmniSaúde garantidos no banco de dados.');

  // 3. SEED DE DADOS MOCK (Apenas se explicitamente solicitado via SEED_MOCK=true)
  if (process.env.SEED_MOCK === 'true') {
    console.log('⚠️ SEED_MOCK=true detectado. Injetando dados de teste...');

    const doctorUser = await prisma.user.create({
      data: {
        name: 'Dr. Lucas Silveira',
        email: `lucas.${Date.now()}@omnisaude.com.br`,
        passwordHash: defaultPasswordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crm: 'CRM/SP 142.890',
            specialty: 'Cardiologia',
            latitude: -23.561684,
            longitude: -46.655981
          }
        }
      },
      include: { professional: true }
    });

    const rafaelUser = await prisma.user.create({
      data: {
        name: 'Rafael Fontes',
        email: `rafael.${Date.now()}@omnisaude.com.br`,
        passwordHash: defaultPasswordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crm: 'CREFITO/SP 88.340',
            specialty: 'Fisioterapia Cardiorrespiratória & Motora',
            latitude: -23.585000,
            longitude: -46.638000
          }
        }
      },
      include: { professional: true }
    });

    const patientMariana = await prisma.patient.create({
      data: {
        name: 'Mariana Souza Lima',
        cpf: `284.${Math.floor(100 + Math.random() * 900)}.839-44`,
        email: 'mariana.lima@exemplo.com.br',
        phone: '(11) 98452-1920',
        latitude: -23.563099,
        longitude: -46.654271,
        address: 'Alameda Santos, 1000 - Cerqueira César, São Paulo - SP'
      }
    });

    if (doctorUser.professional) {
      await prisma.careTeamMember.create({
        data: {
          patientId: patientMariana.id,
          professionalId: doctorUser.professional.id,
          role: 'PRIMARY_CARE',
          active: true
        }
      });
    }

    console.log('✓ Dados de teste injetados.');
  }

  // 4. Vincular profissionais existentes a pacientes reais existentes
  const allPros = await prisma.professional.findMany();
  const allPatients = await prisma.patient.findMany();

  for (const patient of allPatients) {
    for (const pro of allPros) {
      const exists = await prisma.careTeamMember.findFirst({
        where: { patientId: patient.id, professionalId: pro.id }
      });
      if (!exists) {
        await prisma.careTeamMember.create({
          data: {
            patientId: patient.id,
            professionalId: pro.id,
            role: 'PRIMARY_CARE',
            active: true
          }
        });
      }
    }
  }

  console.log('✓ Sincronização de Care Team concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
