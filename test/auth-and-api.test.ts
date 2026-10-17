import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

export const createdTestEmails: string[] = [];

describe('HTTP API - Autenticação & Route Guards', () => {
  let server: FastifyInstance;
  let testAdminEmail: string;
  let testDoctorEmail: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    testAdminEmail = `admin.test.${Date.now()}@omnisaude.com.br`;
    testDoctorEmail = `doctor.test.${Date.now()}@omnisaude.com.br`;
    createdTestEmails.push(testAdminEmail, testDoctorEmail);

    await prisma.user.create({
      data: {
        name: 'Administrador Teste',
        email: testAdminEmail,
        passwordHash: await bcrypt.hash('AdminPassword123!', 10),
        role: 'ADMIN'
      }
    });

    await prisma.user.create({
      data: {
        name: 'Milla Chagas',
        email: testDoctorEmail,
        passwordHash: await bcrypt.hash('DoctorPassword123!', 10),
        role: 'PROFESSIONAL'
      }
    });
  });

  afterAll(async () => {
    if (createdTestEmails.length > 0) {
      await prisma.appointment.deleteMany({
        where: { professional: { user: { email: { in: createdTestEmails } } } }
      });
      await prisma.careTeamMember.deleteMany({
        where: { professional: { user: { email: { in: createdTestEmails } } } }
      });
      await prisma.professional.deleteMany({
        where: { user: { email: { in: createdTestEmails } } }
      });
      await prisma.user.deleteMany({
        where: { email: { in: createdTestEmails } }
      });
    }
    await server.close();
  });

  describe('POST /api/auth/login', () => {
    it('deve autenticar com sucesso usuário válido e retornar token JWT com userId e role', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testAdminEmail,
          password: 'AdminPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.role).toBe('ADMIN');
      expect(data.user.email).toBe(testAdminEmail);

      // Decodifica token para validar payload
      const decoded = server.jwt.decode<{ userId: string; role: string }>(data.token);
      expect(decoded?.userId).toBe(data.user.id);
      expect(decoded?.role).toBe('ADMIN');
    });

    it('deve autenticar profissional estritamente com e-mail corporativo e senha bcrypt', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testDoctorEmail,
          password: 'DoctorPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.name).toBe('Milla Chagas');
      expect(data.user.role).toBe('PROFESSIONAL');
    });

    it('deve rejeitar identificadores informais como "dr lucas" ou "luca"', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'dr lucas',
          password: 'DoctorPassword123!'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.message).toContain('E-mail inválido');
    });

    it('deve rejeitar senhas fracas ou informais como "123456" para e-mail corporativo', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'lucas@omnisaude.com.br',
          password: '123456'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.message).toContain('Credenciais inválidas');
    });

    it('deve rejeitar credenciais com senha incorreta via bcrypt', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: testAdminEmail,
          password: 'WrongPassword'
        }
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.message).toContain('Credenciais inválidas');
    });

    it('deve rejeitar e-mail de perfil inexistente não cadastrado', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'naoexiste@omnisaude.com.br',
          password: 'AnyPassword123!'
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
          email: testAdminEmail
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
        payload: { email: testAdminEmail, password: 'AdminPassword123!' }
      });
      adminToken = resAdmin.json().token;

      // Login Doctor (PROFESSIONAL)
      const resDoc = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: testDoctorEmail, password: 'DoctorPassword123!' }
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

  describe('Criação & Gestão de Perfil Profissional', () => {
    const testEmail = `camila.perfil.${Date.now()}@omnisaude.com.br`;
    createdTestEmails.push(testEmail);
    let userToken: string;

    it('deve registrar usuário com perfil profissional multidisciplinar completo e vinculação a Care Team', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Dra. Camila Nogueira',
          email: testEmail,
          password: 'DoctorPassword123!',
          role: 'PROFESSIONAL',
          profession: 'Enfermagem',
          specialty: 'Estomaterapia & Lesões Cutâneas',
          councilNumber: 'COREN/SP 230.110',
          latitude: -23.565000,
          longitude: -46.657000
        }
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.name).toBe('Dra. Camila Nogueira');
      expect(data.user.role).toBe('PROFESSIONAL');
      expect(data.user.professionalId).toBeDefined();
      expect(data.user.professional?.crm).toBe('COREN/SP 230.110');
      expect(data.user.professional?.specialty).toBe('Estomaterapia & Lesões Cutâneas');

      userToken = data.token;
    });

    it('deve consultar perfil via GET /api/auth/me incluindo dados do conselho profissional', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.user.email).toBe(testEmail);
      expect(data.user.professional?.crm).toBe('COREN/SP 230.110');
      expect(data.user.professional?.latitude).toBeCloseTo(-23.565, 3);
    });

    it('deve atualizar dados do perfil via PUT /api/auth/profile com sucesso', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/auth/profile',
        headers: {
          Authorization: `Bearer ${userToken}`
        } as Record<string, string>,
        payload: {
          name: 'Dra. Camila Nogueira Atualizada',
          specialty: 'Enfermagem Oncológica & Domiciliar',
          councilNumber: 'COREN/SP 230.999'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.user.name).toBe('Dra. Camila Nogueira Atualizada');
      expect(data.user.professional?.specialty).toBe('Enfermagem Oncológica & Domiciliar');
      expect(data.user.professional?.crm).toBe('COREN/SP 230.999');
    });

    it('deve cadastrar novo profissional na equipe via POST /api/scheduler/professionals', async () => {
      const directEmail = `fernanda.fono.${Date.now()}@omnisaude.com.br`;
      createdTestEmails.push(directEmail);
      const response = await server.inject({
        method: 'POST',
        url: '/api/scheduler/professionals',
        payload: {
          name: 'Fernanda Prado',
          email: directEmail,
          profession: 'Fonoaudiologia',
          specialty: 'Reabilitação de Deglutição (Disfagia)',
          councilNumber: 'CRFa/SP 14.520',
          latitude: -23.563000,
          longitude: -46.653000
        }
      });

      expect(response.statusCode).toBe(201);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.professional.name).toBe('Fernanda Prado');
      expect(data.professional.crm).toBe('CRFa/SP 14.520');
      expect(data.professional.specialty).toBe('Reabilitação de Deglutição (Disfagia)');
    });
  });
});
