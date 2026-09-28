// test/e2e-auth-and-scheduler.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/lib/prisma.js';

describe('E2E Integration: Autenticação Estrita & Avaliação do Scheduler', () => {
  let server: FastifyInstance;
  let doctorToken: string;
  let professionalId: string;
  let patientMarianaId: string;
  let patientJulianaId: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    // Busca IDs reais do seed no Prisma
    const doctor = await prisma.user.findUnique({
      where: { email: 'lucas@omnisaude.com.br' },
      include: { professional: true }
    });
    professionalId = doctor!.professional!.id;

    const mariana = await prisma.patient.findFirst({
      where: { name: { contains: 'Mariana' } }
    });
    patientMarianaId = mariana!.id;

    const juliana = await prisma.patient.findFirst({
      where: { name: { contains: 'Juliana' } }
    });
    patientJulianaId = juliana!.id;
  });

  afterAll(async () => {
    await server.close();
  });

  describe('1. Política de Autenticação Estrita ("Harder" Login)', () => {
    it('deve REJEITAR identificadores informais como "dr lucas" com HTTP 400 Bad Request', async () => {
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
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('E-mail inválido');
    });

    it('deve REJEITAR identificadores informais como "luca" com HTTP 400 Bad Request', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'luca',
          password: 'DoctorPassword123!'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('E-mail inválido');
    });

    it('deve REJEITAR senha genérica "123456" com HTTP 401 Unauthorized via Bcrypt', async () => {
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
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Credenciais inválidas');
    });

    it('deve APROVAR autenticação estrita com e-mail corporativo e senha Bcrypt oficial', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'lucas@omnisaude.com.br',
          password: 'DoctorPassword123!'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.token).toBeDefined();
      expect(data.user.name).toBe('Dr. Lucas Silveira');
      expect(data.user.role).toBe('PROFESSIONAL');

      doctorToken = data.token;
    });
  });

  describe('2. Scheduler Geodésico & Viabilidade (/api/scheduler/evaluate)', () => {
    it('deve BARRAR (HTTP 401 Unauthorized) avaliação sem token JWT', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scheduler/evaluate',
        payload: {
          professionalId,
          patientId: patientMarianaId,
          proposedTime: '2026-09-27T14:00:00.000Z',
          durationMinutes: 45
        }
      });

      expect(response.statusCode).toBe(401);
      const data = response.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Token de autenticação');
    });

    it('deve AVALIAR COMO VIÁVEL horário livre para paciente com vínculo CareTeam (Mariana)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scheduler/evaluate',
        headers: {
          Authorization: `Bearer ${doctorToken}`
        },
        payload: {
          professionalId,
          patientId: patientMarianaId,
          proposedTime: '2026-09-27T14:00:00.000Z',
          durationMinutes: 45
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.report.viable).toBe(true);
      expect(data.report.distanceKm).toBeGreaterThan(0);
      expect(data.report.transitTimeMinutes).toBeGreaterThan(0);
      expect(data.report.estimatedTravelWindow).toBeDefined();
      expect(data.report.estimatedTravelWindow.departureTime).toBeDefined();
    });

    it('deve BARRAR avaliação para paciente SEM vínculo CareTeam com o profissional (Juliana)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/scheduler/evaluate',
        headers: {
          Authorization: `Bearer ${doctorToken}`
        },
        payload: {
          professionalId,
          patientId: patientJulianaId,
          proposedTime: '2026-09-27T14:00:00.000Z',
          durationMinutes: 45
        }
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.report.viable).toBe(false);
      expect(data.report.reason).toContain('não faz parte da equipe de cuidado (CareTeamMember)');
    });
  });
});
