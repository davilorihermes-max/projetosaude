// test/auth-and-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { FastifyInstance } from 'fastify';

describe('HTTP API - Autenticação & Route Guards', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /api/auth/login', () => {
    it('deve autenticar com sucesso usuário válido e retornar token JWT com userId e role', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@omnisaude.com.br',
          password: 'AdminPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe('ADMIN');
      expect(data.user.email).toBe('admin@omnisaude.com.br');

      // Decodifica token para validar payload
      const decoded = server.jwt.decode<{ userId: string; role: string }>(data.token);
      expect(decoded?.userId).toBe(data.user.id);
      expect(decoded?.role).toBe('ADMIN');
    });

    it('deve autenticar com sucesso usando o identificador amigável "dr lucas"', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'dr lucas',
          password: 'DoctorPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.name).toBe('Dr. Lucas Silveira');
      expect(data.user.role).toBe('PROFESSIONAL');
    });

    it('deve autenticar com sucesso usando { username: "dr lucas", password: "123456" }', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'dr lucas',
          password: '123456'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.name).toBe('Dr. Lucas Silveira');
      expect(data.user.role).toBe('PROFESSIONAL');
    });

    it('deve rejeitar credenciais com senha incorreta via bcrypt', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@omnisaude.com.br',
          password: 'WrongPassword'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.message).toContain('Credenciais inválidas');
    });

    it('deve rejeitar requisição sem e-mail ou senha', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@omnisaude.com.br'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Route Guards: requireRole', () => {
    let adminToken: string;
    let doctorToken: string;

    beforeAll(async () => {
      // Login Admin
      const resAdmin = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@omnisaude.com.br', password: 'AdminPassword123!' }
      });
      adminToken = resAdmin.json().token;

      // Login Doctor (PROFESSIONAL)
      const resDoc = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'lucas@omnisaude.com.br', password: 'DoctorPassword123!' }
      });
      doctorToken = resDoc.json().token;
    });

    it('deve permitir acesso à rota de ADMIN para usuário com role ADMIN', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/admin/dashboard',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.authorizedRole).toBe('ADMIN');
    });

    it('deve barrar (403 Forbidden) acesso de PROFESSIONAL à rota restrita de ADMIN', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/admin/dashboard',
        headers: {
          Authorization: `Bearer ${doctorToken}`
        }
      });

      expect(response.statusCode).toBe(403);
      const data = response.json();
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('Acesso negado');
    });

    it('deve barrar (401 Unauthorized) requisição sem header Authorization', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/admin/dashboard'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
