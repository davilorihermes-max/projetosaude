// src/routes/auth.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export const authRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /api/auth/login
   * Valida credenciais com bcrypt e retorna JWT com userId e role
   */
  app.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const rawEmail = (request.body?.email || '').trim().toLowerCase();
    const rawPassword = request.body?.password;

    if (!rawEmail || !rawPassword) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'E-mail e senha são obrigatórios.'
      });
    }

    // Validação estrita de formato de e-mail (não permite apenas "dr lucas" ou apelidos)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rawEmail)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'E-mail inválido. O login corporativo exige um e-mail válido (ex: lucas@omnisaude.com.br).'
      });
    }

    // 1. Busca estrita por e-mail no Prisma
    const user = await prisma.user.findUnique({
      where: { email: rawEmail },
      include: { professional: true }
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciais inválidas: e-mail ou senha incorretos.'
      });
    }

    // 2. Validação estrita e segura de senha criptografada via bcrypt
    const isPasswordValid = await bcrypt.compare(rawPassword, user.passwordHash);

    if (!isPasswordValid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciais inválidas: e-mail ou senha incorretos.'
      });
    }

    // Geração do JWT contendo userId e role
    const token = app.jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      { expiresIn: '7d' }
    );

    return reply.status(200).send({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        professionalId: user.professional?.id || null
      }
    });
  });

  /**
   * POST /api/auth/register
   * Cria novo usuário com senha criptografada via bcrypt
   */
  app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { name, email, password, role = 'PROFESSIONAL' } = request.body || {};

    if (!name || !email || !password) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Nome, e-mail e senha são obrigatórios'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'E-mail já cadastrado'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role
      }
    });

    const token = app.jwt.sign({ userId: user.id, role: user.role });

    return reply.status(201).send({
      message: 'Usuário registrado com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });

  /**
   * GET /api/auth/me
   * Rota protegida para consultar o usuário atual a partir do JWT
   */
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        professional: true
      }
    });

    if (!user) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Usuário não encontrado'
      });
    }

    return reply.send({ user });
  });

  /**
   * Rotas de demonstração com guarda por Role (requireRole)
   */
  app.get(
    '/admin/dashboard',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      return reply.send({
        message: 'Bem-vindo ao painel administrativo!',
        authorizedRole: 'ADMIN',
        timestamp: new Date().toISOString()
      });
    }
  );

  app.get(
    '/professional/appointments',
    { preHandler: [authenticate, requireRole('PROFESSIONAL', 'ADMIN')] },
    async (request, reply) => {
      return reply.send({
        message: 'Acesso aos atendimentos concedido ao profissional de saúde.',
        userId: request.user.userId,
        timestamp: new Date().toISOString()
      });
    }
  );
};
