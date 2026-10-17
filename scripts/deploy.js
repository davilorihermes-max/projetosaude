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

// 1. TRAVA DE SEGURANÇA OBRIGATÓRIA: Todo deploy DEVE ser da 'main' do GitHub
if (!process.env.GITHUB_ACTIONS) {
  console.log('🔒 Verificando integridade da branch e sincronização com o GitHub...');

  try {
    // Restaurar prisma/schema.prisma caso tenha sido modificado dinamicamente pelo script de provider
    try {
      execSync('git checkout prisma/schema.prisma', { cwd: rootDir, stdio: 'ignore' });
    } catch {}

    // Buscar estado mais recente do GitHub
    execSync('git fetch origin main', { cwd: rootDir, stdio: 'pipe' });

    // Verificar se está na branch main
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    if (currentBranch !== 'main') {
      console.error(`\n❌ BLOQUEIO DE SEGURANÇA: Todo deploy DEVE ser feito exclusivamente a partir da branch 'main' do GitHub.`);
      console.error(`Você está atualmente na branch de trabalho: "${currentBranch}".\n`);
      console.error(`Para garantir que as alterações de todos estejam integradas e o deploy seja seguro:`);
      console.error(`  1. Suba suas alterações para a sua branch e faça merge na 'main' via GitHub (Pull Request).`);
      console.error(`  2. Mude para a branch main: git checkout main`);
      console.error(`  3. Execute o deploy: npm run deploy (ele sincronizará automaticamente com o GitHub!)\n`);
      process.exit(1);
    }

    // Verificar se há alterações locais não commitadas em arquivos de código
    const gitStatus = execSync('git status --porcelain', { cwd: rootDir, encoding: 'utf8' }).trim();
    const modifiedFiles = gitStatus
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.includes('prisma/schema.prisma') && !line.includes('.vercel/'));

    if (modifiedFiles.length > 0) {
      console.error(`\n❌ BLOQUEIO DE SEGURANÇA: Existem arquivos com alterações locais não commitadas:`);
      modifiedFiles.forEach(f => console.error(`   ${f}`));
      console.error(`\nTodo deploy deve refletir exatamente o código da 'main' no GitHub.`);
      console.error(`Faça commit ou stash de suas alterações e envie ao GitHub antes de realizar o deploy.\n`);
      process.exit(1);
    }

    // Verificar se a branch main local é idêntica à origin/main
    const localCommit = execSync('git rev-parse HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const remoteCommit = execSync('git rev-parse origin/main', { cwd: rootDir, encoding: 'utf8' }).trim();

    if (localCommit !== remoteCommit) {
      const behindCount = parseInt(execSync('git rev-list --count HEAD..origin/main', { cwd: rootDir, encoding: 'utf8' }).trim(), 10);
      const aheadCount = parseInt(execSync('git rev-list --count origin/main..HEAD', { cwd: rootDir, encoding: 'utf8' }).trim(), 10);

      if (behindCount > 0 && aheadCount === 0) {
        console.log(`⬇️ A 'main' local estava ${behindCount} commit(s) atrás de 'origin/main'. Sincronizando automaticamente...`);
        execSync('git pull --ff-only origin main', { cwd: rootDir, stdio: 'inherit' });
        console.log('✅ Sincronização automática com origin/main concluída com sucesso!');
      } else if (aheadCount > 0) {
        console.error(`\n❌ BLOQUEIO DE SEGURANÇA: Existem ${aheadCount} commit(s) locais na 'main' que ainda não estão no GitHub.`);
        console.error(`Todo deploy deve vir obrigatoriamente da 'main' do GitHub.`);
        console.error(`Envie suas alterações para o GitHub com: git push origin main\n`);
        process.exit(1);
      } else {
        console.error(`\n❌ BLOQUEIO DE SEGURANÇA: A branch 'main' local divergiu de 'origin/main'.`);
        console.error(`Sincronize a 'main' com o GitHub antes de prosseguir com o deploy.\n`);
        process.exit(1);
      }
    }

    const verifiedCommit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
    const commitMsg = execSync('git log -1 --pretty=%B', { cwd: rootDir, encoding: 'utf8' }).trim().split('\n')[0];
    console.log(`✅ Origem verificada: GitHub origin/main [${verifiedCommit}] - "${commitMsg}"\n`);
  } catch (err) {
    if (err.status !== undefined && err.status !== 0) {
      process.exit(err.status);
    }
    console.error('⚠️ Falha ao verificar sincronização com Git:', err.message);
  }
}

// 2. Garantir que .vercel/project.json existe para que o Sérgio não precise vincular manualmente
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

const SCOPE = 'davilorihermes-6902';
const scopeArg = ` --scope ${SCOPE}`;

// 2. Montar opções de token
const token = process.env.VERCEL_TOKEN;
const tokenArg = token ? ` --token ${token}` : '';

// 3. Executar o deploy de produção no Vercel no MESMO projeto do Davi
console.log(`📦 Executando build e deploy de produção no Vercel (Escopo: ${SCOPE})...`);
let deployOutput = '';

try {
  const deployCmd = `npx vercel --prod --yes${scopeArg}${tokenArg}`;
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

  console.log('\n💡 COMO O SÉRGIO (DADDY) FAZ DEPLOY NO MESMO PROJETO DO DAVI:');
  console.log('----------------------------------------------------------------------');
  console.log('O projeto oficial está sob o escopo do Davi (davilorihermes-6902):');
  console.log('  - https://omnihomecare.vercel.app');
  console.log('  - https://projetosaude-gamma.vercel.app');
  console.log('\nPara o Sérgio subir exatamente neste mesmo projeto:');
  console.log('1. O Davi gera um Personal Access Token em: https://vercel.com/account/tokens');
  console.log('2. O Sérgio adiciona no .env.local dele:');
  console.log('   VERCEL_TOKEN=seu_token_gerado_no_vercel');
  console.log('3. E/ou adicione VERCEL_TOKEN no GitHub:');
  console.log('   Repo ➔ Settings ➔ Secrets and variables ➔ Actions');
  console.log('   Assim, todo merge do Sérgio para a main atualiza o projeto automaticamente!\n');
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
    const aliasCmd = `npx vercel alias set ${deploymentUrl} ${PRODUCTION_ALIAS}${scopeArg}${tokenArg}`;
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
