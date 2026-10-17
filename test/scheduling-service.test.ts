// test/scheduling-service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SchedulingService } from '../src/services/SchedulingService.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

describe('SchedulingService - Prisma Integration & CareTeam Checks', () => {
  let doctor: { id: string };
  let testUserId: string;
  let patientMariana: { id: string; latitude: number; longitude: number };
  let patientJuliana: { id: string };
  let baselineAppointmentId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('DoctorPassword123!', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Dr. Test Scheduler',
        email: `sched.test.${Date.now()}@omnisaude.com.br`,
        passwordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crm: `CRM/SP ${Math.floor(100000 + Math.random() * 900000)}`,
            specialty: 'Cardiologia',
            latitude: -23.561684,
            longitude: -46.655981
          }
        }
      },
      include: { professional: true }
    });
    testUserId = user.id;
    doctor = { id: user.professional!.id };

    const patCareTeam = await prisma.patient.create({
      data: {
        name: 'Mariana Souza Lima',
        cpf: `777.${Math.floor(100 + Math.random() * 900)}.111-77`,
        latitude: -23.563099,
        longitude: -46.654271,
        address: 'Alameda Santos, 1000 - Cerqueira César, São Paulo - SP'
      }
    });
    patientMariana = patCareTeam;

    await prisma.careTeamMember.create({
      data: {
        patientId: patientMariana.id,
        professionalId: doctor.id,
        role: 'PRIMARY_CARE',
        active: true
      }
    });

    const patNoCareTeam = await prisma.patient.create({
      data: {
        name: 'Juliana Mendes Prado',
        cpf: `666.${Math.floor(100 + Math.random() * 900)}.222-66`,
        latitude: -23.602200,
        longitude: -46.662100,
        address: 'Av. Moema, 350 - Moema, São Paulo - SP'
      }
    });
    patientJuliana = patNoCareTeam;

    // Cria agendamento base às 09:00 para testar detecção de colisão
    const baseApt = await prisma.appointment.create({
      data: {
        professionalId: doctor.id,
        patientId: patientMariana.id,
        scheduledTime: new Date('2026-09-27T09:00:00Z'),
        durationMinutes: 45,
        status: 'SCHEDULED',
        latitude: patientMariana.latitude,
        longitude: patientMariana.longitude,
        notes: 'Consulta matinal inicial'
      }
    });
    baselineAppointmentId = baseApt.id;
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { professionalId: doctor.id } });
    await prisma.careTeamMember.deleteMany({ where: { professionalId: doctor.id } });
    await prisma.patient.deleteMany({ where: { id: { in: [patientMariana.id, patientJuliana.id] } } });
    await prisma.professional.delete({ where: { id: doctor.id } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('deve rejeitar agendamento se o profissional não fizer parte da equipe de cuidado (CareTeamMember) do paciente', async () => {
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor.id,
      patientId: patientJuliana.id,
      proposedTime: '2026-09-27T15:00:00Z',
      durationMinutes: 45
    });

    expect(report.viable).toBe(false);
    expect(report.reason).toContain('não faz parte da equipe de cuidado (CareTeamMember)');
  });

  it('deve aprovar agendamento quando o profissional estiver no CareTeamMember e houver horário livre', async () => {
    // Proposto para as 14:00 (sem outros compromissos à tarde)
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor.id,
      patientId: patientMariana.id,
      proposedTime: '2026-09-27T14:00:00Z',
      durationMinutes: 45
    });

    expect(report.viable).toBe(true);
    expect(report.distanceKm).toBeDefined();
    expect(report.transitTimeMinutes).toBeDefined();
  });

  it('deve detectar conflito de horário com agendamentos já gravados no Prisma', async () => {
    // Consulta existente às 09:00 (duração 45 min, até 09:45). Tentativa às 09:15 deve colidir:
    const report = await SchedulingService.evaluateProposedSchedule({
      professionalId: doctor.id,
      patientId: patientMariana.id,
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

  it('deve rejeitar createAppointment quando o agendamento for inviável (ex: sem CareTeam)', async () => {
    const result = await SchedulingService.createAppointment({
      professionalId: doctor.id,
      patientId: patientJuliana.id,
      scheduledTime: '2026-09-27T16:00:00Z',
      durationMinutes: 45
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('não faz parte da equipe de cuidado (CareTeamMember)');
  });

  it('deve criar agendamento no banco Prisma e listá-lo com sucesso quando for viável', async () => {
    // 17:00 horário livre
    const result = await SchedulingService.createAppointment({
      professionalId: doctor.id,
      patientId: patientMariana.id,
      scheduledTime: '2026-09-27T17:00:00Z',
      durationMinutes: 45,
      notes: 'Sessão domiciliar de fisioterapia motora pós-alta'
    });

    expect(result.success).toBe(true);
    expect(result.appointment).toBeDefined();
    expect(result.appointment!.id).toBeDefined();
    expect(result.appointment!.notes).toBe('Sessão domiciliar de fisioterapia motora pós-alta');
    expect(result.appointment!.latitude).toBe(patientMariana.latitude);

    // Lista agendamentos para o profissional no dia
    const list = await SchedulingService.listAppointments({
      professionalId: doctor.id,
      date: '2026-09-27'
    });

    expect(list.length).toBeGreaterThan(0);
    const createdInList = list.find((a) => a.id === result.appointment!.id);
    expect(createdInList).toBeDefined();
    expect(createdInList?.patient.name).toBe('Mariana Souza Lima');

    // Cleanup: remove appointment criado pelo teste
    await prisma.appointment.delete({
      where: { id: result.appointment!.id }
    });
  });
});
