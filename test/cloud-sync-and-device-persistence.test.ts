// test/cloud-sync-and-device-persistence.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { prisma } from '../src/lib/prisma.js';

describe('Cross-Device Persistence & Cloud State Synchronization', () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  describe('1. Universal Cloud State (GET & POST /api/scheduler/cloud-state/:key)', () => {
    it('deve persistir e recuperar estado da escala mensal na nuvem', async () => {
      const testKey = `test_scale_state_${Date.now()}`;
      const payload = {
        selectedMonth: '2026-10',
        demandsCount: 15,
        testFlag: true,
        nestedData: { status: 'FULL_COVERAGE' }
      };

      // POST
      const postRes = await app.inject({
        method: 'POST',
        url: `/api/scheduler/cloud-state/${testKey}`,
        payload: { value: payload }
      });

      expect(postRes.statusCode).toBe(200);
      const postBody = postRes.json();
      expect(postBody.success).toBe(true);
      expect(postBody.key).toBe(testKey);

      // GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/scheduler/cloud-state/${testKey}`
      });

      expect(getRes.statusCode).toBe(200);
      const getBody = getRes.json();
      expect(getBody.success).toBe(true);
      expect(getBody.value).toEqual(payload);

      // Limpeza
      await prisma.scalePlannerConfig.delete({ where: { key: testKey } }).catch(() => null);
    });

    it('deve retornar null se chave não existir', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/scheduler/cloud-state/non_existent_key_${Date.now()}`
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.value).toBeNull();
    });
  });

  describe('2. Appointment Status & Check-In Cloud Persistence', () => {
    it('deve atualizar status de agendamento existente para COMPLETED no PostgreSQL', async () => {
      // Pega um appointment existente
      const existing = await prisma.appointment.findFirst({
        where: { status: 'SCHEDULED' }
      });

      if (!existing) return;

      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/scheduler/appointments/${existing.id}/status`,
        payload: {
          status: 'COMPLETED',
          notes: 'Check-in confirmado via teste automatizado'
        }
      });

      expect(patchRes.statusCode).toBe(200);
      const patchBody = patchRes.json();
      expect(patchBody.success).toBe(true);
      expect(patchBody.appointment.status).toBe('COMPLETED');

      // Reverte para SCHEDULED para manter consistência dos dados
      await prisma.appointment.update({
        where: { id: existing.id },
        data: { status: 'SCHEDULED', notes: existing.notes }
      });
    });

    it('deve criar agendamento novo com status COMPLETED se for agendamento local/planejado', async () => {
      const patient = await prisma.patient.findFirst();
      const professional = await prisma.professional.findFirst();

      if (!patient || !professional) return;

      const localId = `apt-plan-test-${Date.now()}`;
      const patchRes = await app.inject({
        method: 'PATCH',
        url: `/api/scheduler/appointments/${localId}/status`,
        payload: {
          status: 'COMPLETED',
          notes: 'Atendimento manual faturado no fechamento',
          professionalId: professional.id,
          patientId: patient.id,
          scheduledTime: '2026-10-15T10:00:00.000Z',
          durationMinutes: 60
        }
      });

      expect(patchRes.statusCode).toBe(200);
      const patchBody = patchRes.json();
      expect(patchBody.success).toBe(true);
      expect(patchBody.appointment.status).toBe('COMPLETED');
      expect(patchBody.appointment.patientId).toBe(patient.id);

      // Limpeza
      await prisma.appointment.delete({ where: { id: patchBody.appointment.id } }).catch(() => null);
    });
  });
});
