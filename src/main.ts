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
  server.get('/health', async () => {
    return {
      status: 'UP',
      service: 'OmniSaúde API & Scheduler Engine',
      timestamp: new Date().toISOString()
    };
  });

  // Registro de Rotas
  server.register(authRoutes, { prefix: '/api/auth' });
  server.register(schedulerRoutes, { prefix: '/api/scheduler' });

  return server;
}

async function start() {
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

// Inicia automaticamente quando executado como script principal
if (process.env.NODE_ENV !== 'test') {
  start();
}
