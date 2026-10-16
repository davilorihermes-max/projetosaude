// src/main.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.routes.js';
import { schedulerRoutes } from './routes/scheduler.routes.js';

dotenv.config();

export function buildServer(): FastifyInstance {
  const server = Fastify({
    logger: process.env.NODE_ENV !== 'test'
  });

  // Registro de CORS
  server.register(cors, {
    origin: true,
    credentials: true
  });

  // Registro do JWT
  const jwtSecret = process.env.JWT_SECRET || 'supersecret_omnisaude_jwt_key_2026';
  server.register(jwt, {
    secret: jwtSecret
  });

  // Healthcheck
  const healthHandler = async () => ({
    status: 'UP',
    service: 'OmniSaúde API & Scheduler Engine',
    timestamp: new Date().toISOString()
  });
  server.get('/health', healthHandler);
  server.get('/api/health', healthHandler);

  // Registro de Rotas
  server.register(authRoutes, { prefix: '/api/auth' });
  server.register(schedulerRoutes, { prefix: '/api/scheduler' });

  return server;
}

export async function start() {
  const server = buildServer();
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    console.log(`🚀 Servidor HTTP rodando em http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Inicia automaticamente quando executado diretamente como script de entrada
const isMainScript =
  typeof process.argv[1] === 'string' &&
  (process.argv[1].endsWith('main.ts') || process.argv[1].endsWith('main.js'));

if (
  process.env.NODE_ENV !== 'test' &&
  !process.env.VERCEL &&
  !process.env.AWS_LAMBDA_FUNCTION_NAME &&
  isMainScript
) {
  start();
}
