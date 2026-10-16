// scripts/create-user.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Analisa argumentos no formato --email=foo@bar.com ou argumentos posicionais
function getArg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  return null;
}

async function main() {
  const email = (getArg('email') || process.argv[2] || '').trim().toLowerCase();
  const password = getArg('password') || process.argv[3] || 'Saude2026!@#';
  const name = getArg('name') || process.argv[4] || 'Milla Chagas';
  const profession = getArg('profession') || process.argv[5] || 'Enfermagem';
  const council = getArg('council') || 'COREN/SP 123.456';
  const role = getArg('role') || 'PROFESSIONAL';

  if (!email || !email.includes('@')) {
    console.error(`Uso:
  npm run db:create-user -- --email=millachagass@gmail.com --name="Milla Chagas" --password="SuaSenhaSegura123!" --profession="Enfermagem"

Parâmetros disponíveis:
  --email=...       (Obrigatório)
  --password=...    (Padrão: Saude2026!@#)
  --name=...        (Padrão: Milla Chagas)
  --profession=...  (Padrão: Enfermagem)
  --council=...     (Padrão: COREN/SP 123.456)
  --role=...        (Padrão: PROFESSIONAL)
`);
    process.exit(1);
  }

  console.log(`\n⏳ Criando/Atualizando usuário no banco de dados ativo (${process.env.DATABASE_URL?.split('@')[1] || 'local'})...`);
  console.log(`- E-mail: ${email}`);
  console.log(`- Nome: ${name}`);
  console.log(`- Profissão: ${profession}`);
  console.log(`- Papel: ${role}\n`);

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { professional: true }
  });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        role
      },
      include: { professional: true }
    });
    console.log(`✓ Usuário existente atualizado com nova senha! ID: ${user.id}`);
  } else {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        ...(role === 'PROFESSIONAL'
          ? {
              professional: {
                create: {
                  crm: council,
                  specialty: profession,
                  latitude: -23.565,
                  longitude: -46.657
                }
              }
            }
          : {})
      },
      include: { professional: true }
    });
    console.log(`✓ Novo usuário criado com sucesso! ID: ${user.id}`);
  }

  // Se for profissional, garante vínculo aos pacientes
  if (user.professional) {
    const patients = await prisma.patient.findMany({ select: { id: true } });
    for (const patient of patients) {
      await prisma.careTeamMember.upsert({
        where: {
          patientId_professionalId: {
            patientId: patient.id,
            professionalId: user.professional.id
          }
        },
        update: { active: true },
        create: {
          patientId: patient.id,
          professionalId: user.professional.id,
          role: 'SPECIALIST',
          active: true
        }
      });
    }
    console.log(`✓ Vinculado às equipes de cuidado (Care Team) da clínica!`);
  }

  console.log('\n===========================================');
  console.log('🎉 CREDENCIAIS PRONTAS PARA ACESSO:');
  console.log(`E-mail: ${email}`);
  console.log(`Senha:  ${password}`);
  console.log('===========================================\n');
}

main()
  .catch((err) => {
    console.error('❌ Erro ao cadastrar usuário:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
