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

    it('deve persistir correção de valores (settlement_overrides) e atualizar duração/horário quando updateDetails=true', async () => {
      const patient = await prisma.patient.findFirst();
      const professional = await prisma.professional.findFirst();

      if (!patient || !professional) return;

      // 1. Cria agendamento concluído com duração 60 min
      const created = await prisma.appointment.create({
        data: {
          professionalId: professional.id,
          patientId: patient.id,
          scheduledTime: new Date('2026-10-20T09:00:00.000Z'),
          durationMinutes: 60,
          status: 'COMPLETED',
          notes: 'Sessão original'
        }
      });

      const overrideKey = `settlement_overrides_test_${Date.now()}`;

      try {
        // 2. Persiste override de valor ("Corrigir": R$ 150 -> R$ 135) na nuvem
        const overridesPayload = {
          [created.id]: {
            id: created.id,
            patientId: patient.id,
            dateStr: '2026-10-20',
            timeStr: '10:30',
            durationMinutes: 45,
            hourlyRate: 180,
            totalAmount: 135,
            notes: 'Valor corrigido no fechamento',
            ruleApplied: 'Valor Corrigido Manualmente',
            updatedAt: Date.now()
          }
        };

        const postOverrideRes = await app.inject({
          method: 'POST',
          url: `/api/scheduler/cloud-state/${overrideKey}`,
          payload: { value: overridesPayload }
        });
        expect(postOverrideRes.statusCode).toBe(200);

        const getOverrideRes = await app.inject({
          method: 'GET',
          url: `/api/scheduler/cloud-state/${overrideKey}`
        });
        expect(getOverrideRes.statusCode).toBe(200);
        expect(getOverrideRes.json().value[created.id].totalAmount).toBe(135);
        expect(getOverrideRes.json().value[created.id].hourlyRate).toBe(180);

        // 3. Atualiza metadados da sessão existente no PostgreSQL com updateDetails: true
        const patchDetailsRes = await app.inject({
          method: 'PATCH',
          url: `/api/scheduler/appointments/${created.id}/status`,
          payload: {
            status: 'COMPLETED',
            notes: 'Valor corrigido no fechamento',
            scheduledTime: '2026-10-20T10:30:00.000Z',
            durationMinutes: 45,
            updateDetails: true
          }
        });

        expect(patchDetailsRes.statusCode).toBe(200);
        const updatedApt = patchDetailsRes.json().appointment;
        expect(updatedApt.durationMinutes).toBe(45);
        expect(updatedApt.notes).toBe('Valor corrigido no fechamento');
        expect(new Date(updatedApt.scheduledTime).toISOString()).toBe('2026-10-20T10:30:00.000Z');
      } finally {
        await prisma.scalePlannerConfig.delete({ where: { key: overrideKey } }).catch(() => null);
        await prisma.appointment.delete({ where: { id: created.id } }).catch(() => null);
      }
    });

    it('deve persistir registros de trocas de escala (COVERED e CEDED) no estado de fechamento em nuvem', async () => {
      const manualKey = `settlement_manual_swap_test_${Date.now()}`;
      const manualPayload = [
        {
          id: 'manual-sess-covered-1',
          patientId: 'pat-davi',
          patientName: 'Davi B.',
          patientAddress: 'Jardim Guadalajara Vila velha',
          dateStr: '2026-10-22',
          timeStr: '08:00',
          durationMinutes: 90,
          hourlyRate: 135,
          totalAmount: 202.5,
          swapType: 'COVERED',
          swapPartnerName: 'Roberta',
          swapReason: 'Troquei pelo meu dia 15/10',
          isInformationalSwap: false
        },
        {
          id: 'swap-ceded-1',
          patientId: 'pat-davi',
          patientName: 'Davi B.',
          patientAddress: 'Jardim Guadalajara Vila velha',
          dateStr: '2026-10-15',
          timeStr: '08:00',
          durationMinutes: 60,
          hourlyRate: 0,
          totalAmount: 0,
          swapType: 'CEDED',
          swapPartnerName: 'Roberta',
          swapReason: 'Plantão feito pela Roberta em permuta',
          isInformationalSwap: true
        }
      ];

      try {
        const postRes = await app.inject({
          method: 'POST',
          url: `/api/scheduler/cloud-state/${manualKey}`,
          payload: { value: manualPayload }
        });
        expect(postRes.statusCode).toBe(200);

        const getRes = await app.inject({
          method: 'GET',
          url: `/api/scheduler/cloud-state/${manualKey}`
        });
        expect(getRes.statusCode).toBe(200);

        const saved = getRes.json().value;
        expect(saved).toHaveLength(2);
        expect(saved[0].swapType).toBe('COVERED');
        expect(saved[0].swapPartnerName).toBe('Roberta');
        expect(saved[0].totalAmount).toBe(202.5);
        expect(saved[1].swapType).toBe('CEDED');
        expect(saved[1].isInformationalSwap).toBe(true);
        expect(saved[1].totalAmount).toBe(0);
      } finally {
        await prisma.scalePlannerConfig.delete({ where: { key: manualKey } }).catch(() => null);
      }
    });
  });
});
