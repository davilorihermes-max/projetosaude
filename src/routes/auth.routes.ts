// src/routes/auth.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, authenticateOptional, requireRole } from '../middlewares/auth.js';
import { RegisterSchema } from '../lib/validators.js';

interface LoginBody {
  email?: string;
  password?: string;
}

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: string;
  profession?: string;
  specialty?: string;
  councilNumber?: string;
  crm?: string;
  cpf?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  linkToCareTeams?: boolean;
}

interface UpdateProfileBody {
  userId?: string;
  professionalId?: string;
  name?: string;
  specialty?: string;
  councilNumber?: string;
  crm?: string;
  latitude?: number;
  longitude?: number;
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
        professionalId: user.professional?.id || null,
        professional: user.professional || null
      }
    });
  });

  /**
   * POST /api/auth/register
   * Cria novo usuário e perfil profissional integrado com senha criptografada via bcrypt e validação Zod
   */
  app.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const parseResult = RegisterSchema.safeParse(request.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: firstIssue.message,
        errors: parseResult.error.flatten().fieldErrors
      });
    }

    const {
      name,
      email,
      password,
      role = 'PROFESSIONAL',
      profession,
      specialty,
      councilNumber,
      crm,
      latitude,
      longitude,
      linkToCareTeams = true
    } = parseResult.data;

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
    const normalizedRole = role || 'PROFESSIONAL';
    const crmVal = councilNumber || crm || (profession ? `${profession} - Reg. Ativo` : 'CREFITO/SP 00.000');
    const specialtyVal = specialty || profession || 'Fisioterapia Domiciliar';

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: normalizedRole,
        ...(normalizedRole === 'PROFESSIONAL'
          ? {
              professional: {
                create: {
                  crm: crmVal,
                  specialty: specialtyVal,
                  latitude: latitude ?? -23.585000,
                  longitude: longitude ?? -46.638000
                }
              }
            }
          : {})
      },
      include: {
        professional: true
      }
    });

    // Se for profissional, vincula automaticamente aos pacientes existentes na clínica para compor o Care Team
    if (user.professional && linkToCareTeams) {
      const existingPatients = await prisma.patient.findMany({ select: { id: true } });
      if (existingPatients.length > 0) {
        await Promise.all(
          existingPatients.map((p) =>
            prisma.careTeamMember.create({
              data: {
                patientId: p.id,
                professionalId: user.professional!.id,
                role: 'SPECIALIST',
                active: true
              }
            }).catch(() => null)
          )
        );
      }
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role });

    return reply.status(201).send({
      message: 'Usuário e perfil profissional registrados com sucesso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        professionalId: user.professional?.id || null,
        professional: user.professional || null
      }
    });
  });

  /**
   * GET /api/auth/me
   * Rota protegida para consultar o usuário atual e perfil a partir do JWT
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
        professional: {
          select: {
            id: true,
            crm: true,
            specialty: true,
            latitude: true,
            longitude: true,
            createdAt: true
          }
        }
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
   * PUT /api/auth/profile
   * Rota protegida para atualizar dados do perfil (nome, especialidade, conselho, coordenadas)
   */
  app.put<{ Body: UpdateProfileBody }>(
    '/profile',
    { preHandler: [authenticateOptional] },
    async (request, reply) => {
      const { name, specialty, councilNumber, crm, latitude, longitude, userId, professionalId } = request.body || {};

      let effectiveUserId = request.user?.userId || userId;
      if (!effectiveUserId && professionalId) {
        const prof = await prisma.professional.findFirst({
          where: { OR: [{ id: professionalId }, { userId: professionalId }] }
        });
        if (prof) effectiveUserId = prof.userId;
      }
      if (!effectiveUserId) {
        const firstProf = await prisma.professional.findFirst();
        if (firstProf) effectiveUserId = firstProf.userId;
      }

      if (!effectiveUserId) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Usuário não encontrado para atualizar perfil.'
        });
      }

      if (name) {
        await prisma.user.update({
          where: { id: effectiveUserId },
          data: { name }
        });
      }

      const professional = await prisma.professional.findUnique({
        where: { userId: effectiveUserId }
      });

      if (professional) {
        await prisma.professional.update({
          where: { id: professional.id },
          data: {
            ...(specialty ? { specialty } : {}),
            ...(councilNumber || crm ? { crm: councilNumber || crm } : {}),
            ...(latitude !== undefined ? { latitude } : {}),
            ...(longitude !== undefined ? { longitude } : {})
          }
        });
      } else if (specialty || councilNumber || crm) {
        // Se ainda não existir perfil profissional para o usuário, cria e vincula ao Care Team
        const createdProf = await prisma.professional.create({
          data: {
            userId: effectiveUserId,
            crm: councilNumber || crm || 'CREFITO/UF 00.000',
            specialty: specialty || 'Atendimento Multidisciplinar',
            latitude: latitude ?? -20.3012,
            longitude: longitude ?? -40.2925
          }
        });

        // Vincula aos pacientes existentes na clínica
        const existingPatients = await prisma.patient.findMany({ select: { id: true } });
        if (existingPatients.length > 0) {
          await Promise.all(
            existingPatients.map((p) =>
              prisma.careTeamMember.create({
                data: {
                  patientId: p.id,
                  professionalId: createdProf.id,
                  role: 'SPECIALIST',
                  active: true
                }
              }).catch(() => null)
            )
          );
        }
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: effectiveUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          professional: true
        }
      });

      return reply.status(200).send({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser
      });
    }
  );

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
