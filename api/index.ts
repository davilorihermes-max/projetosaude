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

  // Garante compatibilidade caso o Vercel envie a rota sem o prefixo /api
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = `/api${req.url}`;
  }

  app.server.emit('request', req, res);
}
