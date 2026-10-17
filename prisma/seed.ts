// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean old records only in development/test
  const isProduction = process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:'));
  if (!isProduction) {
    await prisma.appointment.deleteMany({});
    await prisma.careTeamMember.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.professional.deleteMany({});
    await prisma.user.deleteMany({});
  }

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const doctorPasswordHash = await bcrypt.hash('DoctorPassword123!', 10);

  // 1. Admin User
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador OmniSaúde',
      email: 'admin@omnisaude.com.br',
      passwordHash: adminPasswordHash,
      role: 'ADMIN'
    }
  });

  // 2. Doctor User + Professional profile
  const doctorUser = await prisma.user.create({
    data: {
      name: 'Dr. Lucas Silveira',
      email: 'lucas@omnisaude.com.br',
      passwordHash: doctorPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          crm: 'CRM/ES 14.289',
          specialty: 'Cardiologia',
          latitude: -20.315500,
          longitude: -40.291500
        }
      }
    },
    include: {
      professional: true
    }
  });

  // 2b. Multidisciplinary Professional (Fisioterapia)
  const rafaelUser = await prisma.user.create({
    data: {
      name: 'Rafael Fontes',
      email: 'rafael@omnisaude.com.br',
      passwordHash: doctorPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          id: 'doc-3',
          crm: 'CREFITO/ES 88.340',
          specialty: 'Fisioterapia Motora',
          latitude: -20.301200,
          longitude: -40.292500
        }
      }
    },
    include: {
      professional: true
    }
  });

  // 2c. Multidisciplinary Professional (Enfermagem Domiciliar - Milla Chagas)
  const millaUser = await prisma.user.upsert({
    where: { email: 'millachagass@gmail.com' },
    update: {},
    create: {
      name: 'Milla Chagas',
      email: 'millachagass@gmail.com',
      passwordHash: doctorPasswordHash,
      role: 'PROFESSIONAL',
      professional: {
        create: {
          crm: 'COREN/ES 230.999',
          specialty: 'Enfermagem Oncológica & Domiciliar',
          latitude: -20.338500,
          longitude: -40.286200
        }
      }
    },
    include: {
      professional: true
    }
  });

  const professionalId = doctorUser.professional!.id;
  const rafaelProfessionalId = rafaelUser.professional!.id;
  const millaProfessionalId = millaUser.professional?.id;

  // 3. Patients na Grande Vitória (Vitória e Vila Velha - ES)
  const patientMariana = await prisma.patient.create({
    data: {
      id: 'pat-1',
      name: 'Mariana Souza Lima',
      cpf: '284.912.839-44',
      email: 'mariana.lima@exemplo.com.br',
      phone: '(27) 98452-1920',
      latitude: -20.301200,
      longitude: -40.292500,
      address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES'
    }
  });

  const patientRoberto = await prisma.patient.create({
    data: {
      id: 'pat-2',
      name: 'Roberto Carlos Peixoto',
      cpf: '109.834.721-12',
      email: 'roberto.peixoto@exemplo.com.br',
      phone: '(27) 97123-4567',
      latitude: -20.338500,
      longitude: -40.286200,
      address: 'Av. Hugo Musso, 1200 - Praia da Costa, Vila Velha - ES'
    }
  });

  const patientJuliana = await prisma.patient.create({
    data: {
      id: 'pat-3',
      name: 'Juliana Mendes Prado',
      cpf: '418.992.301-85',
      email: 'juliana.prado@exemplo.com.br',
      phone: '(27) 99881-2233',
      latitude: -20.267800,
      longitude: -40.284200,
      address: 'Av. Dante Michelini, 3500 - Jardim Camburi, Vitória - ES'
    }
  });

  // 4. Care Team Members
  await prisma.careTeamMember.create({
    data: {
      patientId: patientMariana.id,
      professionalId: professionalId,
      role: 'PRIMARY_CARE',
      active: true
    }
  });

  await prisma.careTeamMember.create({
    data: {
      patientId: patientMariana.id,
      professionalId: rafaelProfessionalId,
      role: 'SPECIALIST',
      active: true
    }
  });

  await prisma.careTeamMember.create({
    data: {
      patientId: patientRoberto.id,
      professionalId: professionalId,
      role: 'PRIMARY_CARE',
      active: true
    }
  });

  await prisma.careTeamMember.create({
    data: {
      patientId: patientRoberto.id,
      professionalId: rafaelProfessionalId,
      role: 'SPECIALIST',
      active: true
    }
  });

  if (millaProfessionalId) {
    await prisma.careTeamMember.create({
      data: {
        patientId: patientMariana.id,
        professionalId: millaProfessionalId,
        role: 'SPECIALIST',
        active: true
      }
    });

    await prisma.careTeamMember.create({
      data: {
        patientId: patientRoberto.id,
        professionalId: millaProfessionalId,
        role: 'SPECIALIST',
        active: true
      }
    });
  }

  // 5. Existing appointments for today (2026-09-27)
  const dateBase = '2026-09-27';
  await prisma.appointment.create({
    data: {
      professionalId,
      patientId: patientMariana.id,
      scheduledTime: new Date(`${dateBase}T09:00:00Z`),
      durationMinutes: 45,
      status: 'SCHEDULED',
      latitude: patientMariana.latitude,
      longitude: patientMariana.longitude,
      notes: 'Avaliação cardiológica matinal'
    }
  });

  await prisma.appointment.create({
    data: {
      professionalId,
      patientId: patientRoberto.id,
      scheduledTime: new Date(`${dateBase}T11:00:00Z`),
      durationMinutes: 45,
      status: 'SCHEDULED',
      latitude: patientRoberto.latitude,
      longitude: patientRoberto.longitude,
      notes: 'Controle de pressão e glicemia'
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
