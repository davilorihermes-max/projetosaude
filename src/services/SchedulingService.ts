// src/services/SchedulingService.ts
import { prisma } from '../lib/prisma.js';
import {
  evaluateScheduleViability,
  ScheduleViabilityReport,
  ExistingAppointment
} from './scheduler-engine.js';

export interface EvaluateScheduleInput {
  professionalId: string;
  patientId: string;
  proposedTime: Date | string;
  durationMinutes?: number;
}

export class SchedulingService {
  /**
   * Avalia a viabilidade de um agendamento proposto:
   * 1. Valida existência do profissional e do paciente
   * 2. Verifica se o profissional é membro ativo da equipe de cuidado (CareTeamMember) do paciente
   * 3. Busca os atendimentos reais do profissional no mesmo dia
   * 4. Executa a engine de cálculo de distâncias (Haversine) e tempos de trânsito
   */
  static async evaluateProposedSchedule(
    input: EvaluateScheduleInput
  ): Promise<ScheduleViabilityReport> {
    const { professionalId, patientId, durationMinutes = 45 } = input;
    const proposedDate = new Date(input.proposedTime);

    if (isNaN(proposedDate.getTime())) {
      return {
        viable: false,
        reason: 'Data e horário propostos inválidos.'
      };
    }

    // 1. Busca profissional no banco
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: true }
    });

    if (!professional) {
      return {
        viable: false,
        reason: `Profissional de saúde com ID ${professionalId} não encontrado.`
      };
    }

    // 2. Busca paciente no banco
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return {
        viable: false,
        reason: `Paciente com ID ${patientId} não encontrado.`
      };
    }

    // 3. Checa vínculo na Equipe de Cuidado (CareTeamMember)
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        patientId,
        professionalId,
        active: true
      }
    });

    if (!careTeamMember) {
      return {
        viable: false,
        reason: `O profissional ${professional.user.name} não faz parte da equipe de cuidado (CareTeamMember) do paciente ${patient.name}.`
      };
    }

    // 4. Busca atendimentos reais do profissional no mesmo dia
    const startOfDay = new Date(proposedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(proposedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dbAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    const existingAppointments: ExistingAppointment[] = dbAppointments.map((appt) => ({
      id: appt.id,
      scheduledTime: appt.scheduledTime,
      durationMinutes: appt.durationMinutes,
      latitude: appt.latitude,
      longitude: appt.longitude
    }));

    // Localização base da clínica/profissional
    const baseLocation =
      professional.latitude != null && professional.longitude != null
        ? { latitude: professional.latitude, longitude: professional.longitude }
        : null;

    // 5. Executa o parecer de viabilidade da engine
    return evaluateScheduleViability(
      proposedDate,
      durationMinutes,
      { latitude: patient.latitude, longitude: patient.longitude },
      existingAppointments,
      baseLocation
    );
  }

  /**
   * Cria um agendamento no banco Prisma após validação estrita de viabilidade:
   * Rejeita se não for viável (fora do CareTeam ou conflito de horário/deslocamento).
   */
  static async createAppointment(input: {
    professionalId: string;
    patientId: string;
    scheduledTime: Date | string;
    durationMinutes?: number;
    notes?: string;
  }) {
    const { professionalId, patientId, scheduledTime, durationMinutes = 45, notes } = input;

    // 1. Avalia viabilidade antes de persistir
    const viability = await this.evaluateProposedSchedule({
      professionalId,
      patientId,
      proposedTime: scheduledTime,
      durationMinutes
    });

    if (!viability.viable) {
      return {
        success: false,
        reason: viability.reason,
        report: viability
      };
    }

    // 2. Busca coordenadas do domicílio do paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    // 3. Persiste o agendamento no Prisma
    const appointment = await prisma.appointment.create({
      data: {
        professionalId,
        patientId,
        scheduledTime: new Date(scheduledTime),
        durationMinutes,
        latitude: patient?.latitude ?? null,
        longitude: patient?.longitude ?? null,
        notes: notes || null,
        status: 'SCHEDULED'
      },
      include: {
        patient: true,
        professional: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    return {
      success: true,
      appointment,
      report: viability
    };
  }

  /**
   * Lista agendamentos com filtro opcional por profissional e/ou data
   */
  static async listAppointments(filter?: {
    professionalId?: string;
    date?: string; // Formato YYYY-MM-DD
  }) {
    const where: any = {
      status: { not: 'CANCELLED' }
    };

    if (filter?.professionalId) {
      where.professionalId = filter.professionalId;
    }

    if (filter?.date) {
      const startOfDay = new Date(`${filter.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${filter.date}T23:59:59.999Z`);
      where.scheduledTime = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    return prisma.appointment.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
      include: {
        patient: true,
        professional: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
  }
}

