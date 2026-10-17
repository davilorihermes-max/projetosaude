// scripts/deploy.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Carregar variáveis de ambiente locais se existirem
const envLocalPath = path.join(rootDir, '.env.local');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_RDQy7TzUtzmIWeB2wGA1OfWtwOLw';
const ORG_ID = process.env.VERCEL_ORG_ID || 'team_RpKVpxFoir8lacl7PWD1pEc4';
const PROJECT_NAME = 'projetosaude';
const PRODUCTION_ALIAS = 'omnihomecare.vercel.app';
const STAGING_ALIAS = 'projetosaude-gamma.vercel.app';

console.log('\n==================================================');
console.log('🚀 OmniSaúde - Deploy Automatizado (Sérgio & Davi)');
console.log('==================================================\n');

// 1. Garantir que .vercel/project.json existe para que o Sérgio não precise vincular manualmente
const vercelDir = path.join(rootDir, '.vercel');
const projectJsonPath = path.join(vercelDir, 'project.json');

try {
  if (!fs.existsSync(vercelDir)) {
    fs.mkdirSync(vercelDir, { recursive: true });
  }

  if (!fs.existsSync(projectJsonPath)) {
    const config = {
      projectId: PROJECT_ID,
      orgId: ORG_ID,
      projectName: PROJECT_NAME,
      settings: {
        framework: 'vite',
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        nodeVersion: '24.x'
      }
    };
    fs.writeFileSync(projectJsonPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('📁 Configuração .vercel/project.json inicializada automaticamente.');
  }
} catch (err) {
  console.warn('⚠️ Não foi possível verificar/criar .vercel/project.json:', err.message);
}

// 2. Montar opções de token
const token = process.env.VERCEL_TOKEN;
const tokenArg = token ? ` --token ${token}` : '';

// 3. Executar o deploy de produção no Vercel
console.log('📦 Executando build e deploy de produção no Vercel...');
let deployOutput = '';

try {
  const deployCmd = `npx vercel --prod --yes${tokenArg}`;
  deployOutput = execSync(deployCmd, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  console.log(deployOutput);
} catch (err) {
  console.error('\n❌ Falha durante o deploy no Vercel:');
  if (err.stderr) console.error(err.stderr.toString());
  if (err.stdout) console.log(err.stdout.toString());

  console.log('\n💡 DICA PARA O SÉRGIO (DADDY) OU DAVI:');
  console.log('--------------------------------------------------');
  console.log('1. Para autenticar via CLI, execute: npx vercel login');
  console.log('2. Ou configure seu VERCEL_TOKEN no arquivo .env.local:');
  console.log('   VERCEL_TOKEN=seu_token_aqui');
  console.log('3. Você também pode disparar o deploy pelo GitHub Actions em:');
  console.log('   https://github.com/davilorihermes-max/projetosaude/actions\n');
  process.exit(1);
}

// 4. Extrair URL de deploy gerada
let deploymentUrl = null;
try {
  const jsonStart = deployOutput.indexOf('{');
  const jsonEnd = deployOutput.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const jsonStr = deployOutput.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);
    if (parsed.deployment?.url) {
      deploymentUrl = parsed.deployment.url.startsWith('http') ? parsed.deployment.url : `https://${parsed.deployment.url}`;
    } else if (parsed.url) {
      deploymentUrl = parsed.url.startsWith('http') ? parsed.url : `https://${parsed.url}`;
    }
  }
} catch {
  // Ignora erro de JSON e parte para fallback de regex
}

if (!deploymentUrl) {
  const urlMatches = deployOutput.match(/https:\/\/[a-zA-Z0-9.-]+\.vercel\.app/g);
  if (urlMatches && urlMatches.length > 0) {
    deploymentUrl = urlMatches[0];
  }
}

if (deploymentUrl) {
  console.log(`\n🔗 URL da nova versão gerada: ${deploymentUrl}`);
  console.log(`🏷️  Vinculando domínio oficial (${PRODUCTION_ALIAS})...`);

  try {
    const aliasCmd = `npx vercel alias set ${deploymentUrl} ${PRODUCTION_ALIAS}${tokenArg}`;
    const aliasOutput = execSync(aliasCmd, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log(aliasOutput.trim());
  } catch (aliasErr) {
    console.warn(`⚠️ Não foi possível aplicar o alias ${PRODUCTION_ALIAS} automaticamente.`);
    if (aliasErr.stderr) console.warn(aliasErr.stderr.toString());
  }
} else {
  console.log(`\n⚠️ Não foi possível identificar a URL específica gerada na saída.`);
}

console.log('\n==================================================');
console.log('✨ DEPLOY CONCLUÍDO COM SUCESSO!');
console.log(`🌐 Staging / Dev : https://${STAGING_ALIAS}`);
console.log(`🌐 Produção Real: https://${PRODUCTION_ALIAS}`);
if (deploymentUrl) {
  console.log(`📌 Link Direto  : ${deploymentUrl}`);
}
console.log('==================================================\n');
