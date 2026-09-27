// src/middlewares/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  userId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

/**
 * Middleware para validar o token JWT
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token de autenticação inválido ou ausente'
    });
  }
}

/**
 * Middleware guard para autorização baseada em roles
 * Ex: requireRole('ADMIN'), requireRole('PROFESSIONAL')
 */
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Garante que o usuário foi autenticado antes de checar a role
    if (!request.user || !request.user.role) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    const hasRole = allowedRoles.includes(request.user.role);
    if (!hasRole) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Acesso negado. Requer perfil: ${allowedRoles.join(' ou ')}`
      });
    }
  };
}
