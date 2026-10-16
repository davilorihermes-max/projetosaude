// scripts/setup-cloud-db.js
import { execSync } from 'child_process';
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

const dbUrl = process.env.DATABASE_URL || '';

console.log('=====================================================');
console.log('🚀 OmniSaúde - Inicialização do Banco de Dados em Nuvem');
console.log('=====================================================\n');

if (!dbUrl || dbUrl.startsWith('file:')) {
  console.warn('⚠️ AVISO: Seu DATABASE_URL atual está apontando para SQLite local (dev.db).');
  console.warn('Para conectar a um banco na nuvem (ex: Neon Postgres, Supabase ou Railway):');
  console.warn('1. Crie uma instância PostgreSQL gratuita (ex: https://neon.tech ou https://supabase.com)');
  console.warn('2. Configure no seu .env ou nas variáveis do Vercel:');
  console.warn('   DATABASE_URL="postgresql://usuario:senha@ep-xyz.neon.tech/neondb?sslmode=require"');
  console.warn('3. Execute novamente: npm run db:setup-cloud\n');
  console.log('Continuando com o banco configurado no momento...\n');
} else {
  console.log(`✓ DATABASE_URL detectado: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);
}

function run(cmd, desc) {
  console.log(`⏳ ${desc}...`);
  try {
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
    console.log(`✓ ${desc} concluído com sucesso!\n`);
  } catch (err) {
    console.error(`❌ Falha em: ${desc}`);
    throw err;
  }
}

try {
  run('node scripts/sync-prisma-provider.js', '1. Sincronizando provider do Prisma (SQLite vs PostgreSQL)');
  run('npx prisma generate', '2. Gerando Prisma Client');
  run('npx prisma db push', '3. Aplicando esquemas e tabelas ao banco na nuvem (db push)');
  run('npx tsx prisma/seed.ts', '4. Semeando dados iniciais da clínica (médicos, equipe e pacientes)');
  
  console.log('=====================================================');
  console.log('🎉 BANCO DE DADOS EM NUVEM PRONTO E CONECTADO!');
  console.log('Agora todos os dispositivos (PC, celular, tablet) compartilham os mesmos dados.');
  console.log('=====================================================\n');
} catch (err) {
  console.error('\n❌ Ocorreu um erro ao configurar o banco em nuvem.');
  process.exit(1);
}
