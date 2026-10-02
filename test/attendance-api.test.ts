// test/attendance-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/lib/prisma.js';

describe('HTTP API - Geofencing & Check-in / Check-out', () => {
  let server: FastifyInstance;
  let token: string;
  let doctorProfessionalId: string;
  let patientMariana: any;
  let patientRoberto: any;
  let appointmentMariana: any;
  let appointmentRoberto: any;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    // Obtém token de autenticação
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'lucas@omnisaude.com.br',
        password: 'DoctorPassword123!'
      }
    });

    const loginData = loginRes.json();
    token = loginData.token;

    // Busca dados do seed
    const doctor = await prisma.professional.findFirst({
      where: { crm: 'CRM/SP 142.890' }
    });
    doctorProfessionalId = doctor!.id;

    patientMariana = await prisma.patient.findFirst({
      where: { name: { contains: 'Mariana' } }
    });

    patientRoberto = await prisma.patient.findFirst({
      where: { name: { contains: 'Roberto' } }
    });

    // Cria agendamentos específicos para os testes de attendance
    appointmentMariana = await prisma.appointment.create({
      data: {
        professionalId: doctorProfessionalId,
        patientId: patientMariana.id,
        scheduledTime: new Date('2026-10-02T10:00:00Z'),
        durationMinutes: 45,
        status: 'SCHEDULED',
        latitude: patientMariana.latitude,
        longitude: patientMariana.longitude,
        notes: 'Sessão com validação de geofencing'
      }
    });

    appointmentRoberto = await prisma.appointment.create({
      data: {
        professionalId: doctorProfessionalId,
        patientId: patientRoberto.id,
        scheduledTime: new Date('2026-10-02T14:00:00Z'),
        durationMinutes: 45,
        status: 'SCHEDULED',
        latitude: patientRoberto.latitude,
        longitude: patientRoberto.longitude,
        notes: 'Sessão com teste fora do raio'
      }
    });
  });

  afterAll(async () => {
    // Limpeza dos agendamentos de teste
    if (appointmentMariana?.id) {
      await prisma.attendance.deleteMany({ where: { appointmentId: appointmentMariana.id } });
      await prisma.appointment.delete({ where: { id: appointmentMariana.id } });
    }
    if (appointmentRoberto?.id) {
      await prisma.attendance.deleteMany({ where: { appointmentId: appointmentRoberto.id } });
      await prisma.appointment.delete({ where: { id: appointmentRoberto.id } });
    }
    await server.close();
  });

  it('deve validar check-in com sucesso dentro do raio de 150m (ON_SITE_VALIDATED)', async () => {
    // Mariana está em: lat -23.563099, lon -46.654271
    // Profissional faz check-in a ~25m de distância
    const response = await server.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        appointmentId: appointmentMariana.id,
        latitude: -23.563200,
        longitude: -46.654200
      }
    });

    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.attendance).toBeDefined();
    expect(data.attendance.checkInStatus).toBe('ON_SITE_VALIDATED');
    expect(data.attendance.checkInDistanceMeters).toBeLessThanOrEqual(150);
    expect(data.appointment.status).toBe('IN_PROGRESS');
  });

  it('deve rejeitar tentativa de check-in duplicado no mesmo atendimento', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        appointmentId: appointmentMariana.id,
        latitude: -23.563200,
        longitude: -46.654200
      }
    });

    expect(response.statusCode).toBe(400);
    const data = response.json();
    expect(data.error).toBe('Attendance Error');
    expect(data.message).toContain('Check-in já foi realizado');
  });

  it('deve bloquear check-in fora do raio de 150m quando não houver justificativa', async () => {
    // Roberto está em: lat -23.567300, lon -46.693400 (Pinheiros)
    // Profissional tenta check-in na Av. Paulista (-23.563099, -46.654271) ~4 km de distância
    const response = await server.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        appointmentId: appointmentRoberto.id,
        latitude: -23.563099,
        longitude: -46.654271
      }
    });

    expect(response.statusCode).toBe(400);
    const data = response.json();
    expect(data.error).toBe('Geofence Violation');
    expect(data.requiresOverride).toBe(true);
    expect(data.distanceMeters).toBeGreaterThan(150);
    expect(data.message).toContain('Para registrar fora do local, é obrigatório fornecer uma justificativa');
  });

  it('deve aceitar check-in fora do raio quando fornecida justificativa válida (OUT_OF_BOUNDS_ACCEPTED)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        appointmentId: appointmentRoberto.id,
        latitude: -23.563099,
        longitude: -46.654271,
        overrideReason: 'Paciente aguardando no portão externo da praça próxima devido a obras no condomínio'
      }
    });

    expect(response.statusCode).toBe(201);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.attendance.checkInStatus).toBe('OUT_OF_BOUNDS_ACCEPTED');
    expect(data.attendance.overrideReason).toContain('Paciente aguardando no portão');
    expect(data.appointment.status).toBe('IN_PROGRESS');
  });

  it('deve realizar check-out com cálculo de duração e atualizar status para COMPLETED', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/attendance/check-out',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        appointmentId: appointmentMariana.id,
        latitude: -23.563200,
        longitude: -46.654200
      }
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.attendance.checkOutAt).toBeDefined();
    expect(data.actualDurationMin).toBeGreaterThanOrEqual(1);
    expect(data.appointment.status).toBe('COMPLETED');
  });

  it('deve consultar o histórico de presença com sucesso via GET /api/attendance/:appointmentId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/attendance/${appointmentMariana.id}`,
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.success).toBe(true);
    expect(data.attendance.appointmentId).toBe(appointmentMariana.id);
    expect(data.attendance.checkInStatus).toBe('ON_SITE_VALIDATED');
    expect(data.attendance.actualDurationMin).toBeDefined();
  });
});
