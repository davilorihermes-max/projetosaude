// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean old records
  await prisma.appointment.deleteMany({});
  await prisma.careTeamMember.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.professional.deleteMany({});
  await prisma.user.deleteMany({});

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
          crm: 'CRM/SP 142.890',
          specialty: 'Cardiologia',
          latitude: -23.561684,
          longitude: -46.655981
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
          crm: 'CREFITO/SP 88.340',
          specialty: 'Fisioterapia Cardiorrespiratória & Motora',
          latitude: -23.585000,
          longitude: -46.638000
        }
      }
    },
    include: {
      professional: true
    }
  });

  const professionalId = doctorUser.professional!.id;
  const rafaelProfessionalId = rafaelUser.professional!.id;

  // 3. Patients in São Paulo
  const patientMariana = await prisma.patient.create({
    data: {
      id: 'pat-1',
      name: 'Mariana Souza Lima',
      cpf: '284.912.839-44',
      email: 'mariana.lima@exemplo.com.br',
      phone: '(11) 98452-1920',
      latitude: -23.563099,
      longitude: -46.654271,
      address: 'Alameda Santos, 1000 - Cerqueira César, São Paulo - SP'
    }
  });

  const patientRoberto = await prisma.patient.create({
    data: {
      id: 'pat-2',
      name: 'Roberto Carlos Peixoto',
      cpf: '109.834.721-12',
      email: 'roberto.peixoto@exemplo.com.br',
      phone: '(11) 97123-4567',
      latitude: -23.567300,
      longitude: -46.693400,
      address: 'Rua Fradique Coutinho, 500 - Pinheiros, São Paulo - SP'
    }
  });

  const patientJuliana = await prisma.patient.create({
    data: {
      id: 'pat-3',
      name: 'Juliana Mendes Prado',
      cpf: '418.992.301-85',
      email: 'juliana.prado@exemplo.com.br',
      phone: '(11) 99881-2233',
      latitude: -23.602200,
      longitude: -46.662100,
      address: 'Av. Moema, 350 - Moema, São Paulo - SP'
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
