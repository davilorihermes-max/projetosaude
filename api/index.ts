// api/index.ts
import type { IncomingMessage, ServerResponse } from 'http';
import { buildServer } from '../src/main.js';

const app = buildServer();
let isReady = false;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isReady) {
    await app.ready();
    isReady = true;
  }

  const rawUrl = req.url || '';
  const xMatched = (req.headers['x-matched-path'] as string) || '';
  const xForwarded = (req.headers['x-forwarded-uri'] as string) || '';

  // Se o Vercel reescreveu a URL interna para o arquivo de entrada (/api/index.ts ou /api/index), recupera a rota real do cliente
  if (rawUrl.startsWith('/api/index.ts') || rawUrl.startsWith('/api/index') || rawUrl === '/api') {
    if (xMatched && !xMatched.includes('index.ts') && !xMatched.includes('index.js')) {
      req.url = xMatched;
    } else if (xForwarded && !xForwarded.includes('index.ts') && !xForwarded.includes('index.js')) {
      req.url = xForwarded;
    }
  }

  // Garante compatibilidade caso o Vercel envie a rota sem o prefixo /api
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = `/api${req.url}`;
  }

  app.server.emit('request', req, res);
}
