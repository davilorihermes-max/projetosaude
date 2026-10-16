// scripts/sync-prisma-provider.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

if (!fs.existsSync(schemaPath)) {
  console.error(`[Prisma Sync] Arquivo schema.prisma não encontrado em: ${schemaPath}`);
  process.exit(1);
}

const currentContent = fs.readFileSync(schemaPath, 'utf8');
const datasourceRegex = /(datasource\s+db\s+\{[\s\S]*?provider\s*=\s*")([^"]+)("[\s\S]*?\})/;

if (!datasourceRegex.test(currentContent)) {
  console.warn('[Prisma Sync] Não foi possível localizar o bloco datasource db no schema.prisma.');
  process.exit(0);
}

const match = currentContent.match(datasourceRegex);
const currentProvider = match ? match[2] : null;

if (currentProvider !== targetProvider) {
  const newContent = currentContent.replace(datasourceRegex, `$1${targetProvider}$3`);
  fs.writeFileSync(schemaPath, newContent, 'utf8');
  console.log(`[Prisma Sync] 🔄 Provedor Prisma sincronizado com sucesso: ${currentProvider} ➔ ${targetProvider}`);
} else {
  console.log(`[Prisma Sync] ✓ Provedor Prisma já está atualizado como: ${targetProvider}`);
}
