// scripts/start-chrome-cdp.js
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';

const tempUserData = 'C:\\Users\\davil\\AppData\\Local\\Temp\\chrome-antigravity-dev';
const targetDevToolsActivePort = 'C:\\Users\\davil\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(tempUserData)) {
  fs.mkdirSync(tempUserData, { recursive: true });
}

let chromeProcess = null;
let isShuttingDown = false;

function verifyCdpConnection() {
  const req = http.get('http://127.0.0.1:9222/json/version', (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        console.log(`[CDP Health Check]: Chrome CDP ativo e respondendo na porta 9222 (Versão: ${json.Browser})`);
      } catch (err) {
        console.log('[CDP Health Check]: Resposta recebida, mas não parseou JSON:', body);
      }
    });
  });
  req.on('error', (err) => {
    console.log('[CDP Health Check]: Aguardando porta 9222 responder...', err.message);
  });
}

function launchChrome() {
  if (isShuttingDown) return;

  console.log('Iniciando Google Chrome com suporte CDP na porta 9222...');
  chromeProcess = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempUserData}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:5173/'
  ]);

  let activeWsPath = '';

  chromeProcess.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    const match = text.match(/DevTools listening on ws:\/\/[^/]+(\/devtools\/browser\/[a-f0-9-]+)/i);
    if (match) {
      activeWsPath = match[1];
      const fileContent = `9222\n${activeWsPath}\n`;
      fs.writeFileSync(targetDevToolsActivePort, fileContent, 'utf8');
      console.log(`\n🎉 DevToolsActivePort sincronizado com sucesso!\nArquivo: ${targetDevToolsActivePort}\nConteúdo:\n${fileContent}`);
      setTimeout(verifyCdpConnection, 1000);
    }
  });

  // Watchdog para manter o arquivo DevToolsActivePort sempre sincronizado
  const watchdog = setInterval(() => {
    if (activeWsPath) {
      try {
        const currentContent = fs.existsSync(targetDevToolsActivePort)
          ? fs.readFileSync(targetDevToolsActivePort, 'utf8')
          : '';
        const expected = `9222\n${activeWsPath}\n`;
        if (currentContent !== expected) {
          fs.writeFileSync(targetDevToolsActivePort, expected, 'utf8');
          console.log('[CDP Watchdog]: DevToolsActivePort re-sincronizado.');
        }
      } catch (e) {
        console.error('[CDP Watchdog Error]:', e.message);
      }
    }
  }, 3000);

  chromeProcess.on('exit', (code) => {
    clearInterval(watchdog);
    console.log(`Chrome encerrou com código: ${code}.`);
    if (!isShuttingDown) {
      console.log('Reiniciando Chrome em 2 segundos para manter /browser sempre disponível...');
      setTimeout(launchChrome, 2000);
    }
  });
}

process.on('SIGINT', () => {
  isShuttingDown = true;
  if (chromeProcess) chromeProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  isShuttingDown = true;
  if (chromeProcess) chromeProcess.kill();
  process.exit(0);
});

launchChrome();
