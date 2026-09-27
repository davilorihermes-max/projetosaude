// test/scheduling-service.test.ts
import { describe, it, expect } from 'vitest';
import { SchedulingService } from '../src/services/SchedulingService.js';
import { prisma } from '../src/lib/prisma.js';

describe('SchedulingService - Prisma Integration & CareTeam Checks', () => {
  it('deve rejeitar agendamento se o profissional não fizer parte da equipe de cuidado (CareTeamMember) do paciente', async () => {
    // Busca Dr. Lucas
    const doctor = await prisma.professional.findFirst({
      where: { crm: 'CRM/SP 142.890' }
    });
    expect(doctor).toBeDefined();

    // Busca Juliana (que não tem o Dr. Lucas no CareTeamMember no seed)
    const patientJuliana = await prisma.patient.findFirst({
      where: { cpf: '418.992.301-85' }
    });
    expect(patientJuliana).toBeDefined();

    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor!.id,
      patientId: patientJuliana!.id,
      proposedTime: '2026-09-27T15:00:00Z',
      durationMinutes: 45
    });

    expect(report.viable).toBe(false);
    expect(report.reason).toContain('não faz parte da equipe de cuidado (CareTeamMember)');
  });

  it('deve aprovar agendamento quando o profissional estiver no CareTeamMember e houver horário livre', async () => {
    const doctor = await prisma.professional.findFirst({
      where: { crm: 'CRM/SP 142.890' }
    });

    const patientMariana = await prisma.patient.findFirst({
      where: { cpf: '284.912.839-44' }
    });

    // Proposto para as 14:00 (sem outros compromissos à tarde no seed)
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor!.id,
      patientId: patientMariana!.id,
      proposedTime: '2026-09-27T14:00:00Z',
      durationMinutes: 45
    });

    expect(report.viable).toBe(true);
    expect(report.distanceKm).toBeDefined();
    expect(report.transitTimeMinutes).toBeDefined();
  });

  it('deve detectar conflito de horário com agendamentos já gravados no Prisma', async () => {
    const doctor = await prisma.professional.findFirst({
      where: { crm: 'CRM/SP 142.890' }
    });

    const patientMariana = await prisma.patient.findFirst({
      where: { cpf: '284.912.839-44' }
    });

    // No seed, Mariana já tem consulta marcada às 09:00 (duração 45 min, até 09:45)
    // Tentativa às 09:15 deve colidir:
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor!.id,
      patientId: patientMariana!.id,
      proposedTime: '2026-09-27T09:15:00Z',
      durationMinutes: 45
    });

    expect(report.viable).toBe(false);
    expect(report.reason).toContain('Conflito de horário');
  });

  it('deve retornar erro adequado quando o paciente ou profissional não existirem', async () => {
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: 'invalid-doc-id',
      patientId: 'invalid-pat-id',
      proposedTime: '2026-09-27T10:00:00Z'
    });

    expect(report.viable).toBe(false);
    expect(report.reason).toContain('não encontrado');
  });
});
