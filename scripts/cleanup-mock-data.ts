// scripts/cleanup-mock-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Iniciando limpeza de dados mock e duplicatas de teste no banco Neon...');

  // 1. Remover agendamentos vinculados a pacientes ou médicos mock/seed
  const deletedAppointments = await prisma.appointment.deleteMany({
    where: {
      OR: [
        { patientId: { in: ['pat-1', 'pat-2', 'pat-3'] } },
        { patient: { name: { in: ['Mariana Souza Lima', 'Roberto Carlos Peixoto', 'Juliana Mendes Prado'] } } },
        { professional: { user: { email: { in: ['lucas@omnisaude.com.br', 'rafael@omnisaude.com.br'] } } } },
        { professional: { user: { name: { in: ['Dr. Lucas Silveira', 'Rafael Fontes'] } } } }
      ]
    }
  });
  console.log(`✓ Agendamentos mock removidos: ${deletedAppointments.count}`);

  // 2. Remover Care Team members dos pacientes mock ou profissionais de teste
  const deletedCareTeam = await prisma.careTeamMember.deleteMany({
    where: {
      OR: [
        { patientId: { in: ['pat-1', 'pat-2', 'pat-3'] } },
        { professional: { user: { email: { in: ['lucas@omnisaude.com.br', 'rafael@omnisaude.com.br'] } } } },
        { professional: { user: { email: { contains: 'camila.perfil.' } } } },
        { professional: { user: { email: { contains: 'fernanda.fono.' } } } }
      ]
    }
  });
  console.log(`✓ Vínculos de Care Team mock/teste removidos: ${deletedCareTeam.count}`);

  // 3. Remover Pacientes Mock (Mariana, Roberto, Juliana)
  const deletedPatients = await prisma.patient.deleteMany({
    where: {
      OR: [
        { id: { in: ['pat-1', 'pat-2', 'pat-3'] } },
        { name: { in: ['Mariana Souza Lima', 'Roberto Carlos Peixoto', 'Juliana Mendes Prado'] } }
      ]
    }
  });
  console.log(`✓ Pacientes mock removidos: ${deletedPatients.count}`);

  // 4. Remover Profissionais & Usuários de Teste (Dra. Camila Nogueira Atualizada e Fernanda Prado)
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'camila.perfil.' } },
        { email: { contains: 'fernanda.fono.' } },
        { name: { in: ['Dra. Camila Nogueira', 'Dra. Camila Nogueira Atualizada', 'Fernanda Prado', 'Administrador OmniSaúde'] } },
        { email: { in: ['lucas@omnisaude.com.br', 'rafael@omnisaude.com.br', 'admin@omnisaude.com.br'] } }
      ]
    },
    include: { professional: true }
  });

  console.log(`Identificados ${testUsers.length} usuários mock/teste para remoção.`);

  for (const user of testUsers) {
    if (user.professional) {
      await prisma.appointment.deleteMany({ where: { professionalId: user.professional.id } });
      await prisma.careTeamMember.deleteMany({ where: { professionalId: user.professional.id } });
      await prisma.professional.delete({ where: { id: user.professional.id } });
    }
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`  - Removido: ${user.name} (${user.email})`);
  }

  // 5. Vincular os profissionais reais restantes ao Care Team dos pacientes reais
  const remainingPros = await prisma.professional.findMany();
  const remainingPatients = await prisma.patient.findMany();

  console.log(`\n📋 Status Atual do Banco:`);
  console.log(`- Profissionais Reais: ${remainingPros.length}`);
  console.log(`- Pacientes Reais: ${remainingPatients.length}`);

  for (const patient of remainingPatients) {
    for (const pro of remainingPros) {
      const existing = await prisma.careTeamMember.findFirst({
        where: { patientId: patient.id, professionalId: pro.id }
      });
      if (!existing) {
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

  console.log(`✓ Care Team sincronizado para todos os pacientes reais.`);
  console.log(`🎉 Limpeza concluída com sucesso no banco Neon!`);
  await prisma.$disconnect();
}

cleanup().catch((err) => {
  console.error('Erro na limpeza:', err);
  prisma.$disconnect();
  process.exit(1);
});
