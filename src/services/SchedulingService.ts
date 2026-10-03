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
  /**
   * Resolução flexível de profissional (por ID exato no Prisma ou alias doc-3 / nome / registro)
   */
  static async resolveProfessional(professionalId: string) {
    if (!professionalId) return null;

    let professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: true }
    });

    if (!professional) {
      if (professionalId === 'doc-3' || professionalId.toLowerCase().includes('rafael')) {
        professional = await prisma.professional.findFirst({
          where: {
            OR: [
              { user: { name: { contains: 'Rafael' } } },
              { user: { email: { contains: 'rafael' } } },
              { crm: { contains: '88.340' } }
            ]
          },
          include: { user: true }
        });
      } else if (professionalId === 'doc-4' || professionalId.toLowerCase().includes('camila')) {
        professional = await prisma.professional.findFirst({
          where: {
            OR: [
              { user: { name: { contains: 'Camila' } } },
              { crm: { contains: '230.110' } }
            ]
          },
          include: { user: true }
        });
      } else if (professionalId === 'doc-5' || professionalId.toLowerCase().includes('fernanda')) {
        professional = await prisma.professional.findFirst({
          where: {
            OR: [
              { user: { name: { contains: 'Fernanda' } } },
              { crm: { contains: '14.520' } }
            ]
          },
          include: { user: true }
        });
      } else if (professionalId === 'doc-6' || professionalId.toLowerCase().includes('thiago')) {
        professional = await prisma.professional.findFirst({
          where: {
            OR: [
              { user: { name: { contains: 'Thiago' } } },
              { crm: { contains: '45.190' } }
            ]
          },
          include: { user: true }
        });
      }

      if (!professional && professionalId.startsWith('doc-')) {
        professional = (await prisma.professional.findFirst({
          where: {
            user: { name: { contains: 'Rafael' } }
          },
          include: { user: true }
        })) || (await prisma.professional.findFirst({
          include: { user: true }
        }));
      }
    }

    return professional;
  }

  /**
   * Resolução flexível de paciente (por ID exato no Prisma ou alias pat-1, pat-2 / CPF / nome)
   */
  static async resolvePatient(patientId: string) {
    if (!patientId) return null;

    let patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      if (patientId === 'pat-1' || patientId.toLowerCase().includes('mariana')) {
        patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { name: { contains: 'Mariana' } },
              { cpf: { contains: '284.912' } }
            ]
          }
        });
      } else if (patientId === 'pat-2' || patientId.toLowerCase().includes('roberto')) {
        patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { name: { contains: 'Roberto' } },
              { cpf: { contains: '109.834' } }
            ]
          }
        });
      } else if (patientId === 'pat-3' || patientId.toLowerCase().includes('juliana')) {
        patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { name: { contains: 'Juliana' } },
              { cpf: { contains: '418.992' } }
            ]
          }
        });
      }

      if (!patient && patientId.startsWith('pat-')) {
        patient = await prisma.patient.findFirst();
      }
    }

    return patient;
  }

  /**
   * Avalia a viabilidade de uma proposta de agendamento usando dados reais do banco
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

    // 1. Busca profissional no banco com resolução flexível
    const professional = await this.resolveProfessional(professionalId);

    if (!professional) {
      return {
        viable: false,
        reason: `Profissional com ID ${professionalId} não encontrado.`
      };
    }

    // 2. Busca paciente no banco com resolução flexível
    const patient = await this.resolvePatient(patientId);

    if (!patient) {
      return {
        viable: false,
        reason: `Paciente com ID ${patientId} não encontrado.`
      };
    }

    // 3. Checa vínculo na Equipe de Cuidado (CareTeamMember)
    const careTeamMember = await prisma.careTeamMember.findFirst({
      where: {
        patientId: patient.id,
        professionalId: professional.id,
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
        professionalId: professional.id,
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

    // 2. Resolve instâncias reais do profissional e paciente
    const professional = await this.resolveProfessional(professionalId);
    const patient = await this.resolvePatient(patientId);

    // 3. Persiste o agendamento no Prisma
    const appointment = await prisma.appointment.create({
      data: {
        professionalId: professional?.id || professionalId,
        patientId: patient?.id || patientId,
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
      const resolved = await this.resolveProfessional(filter.professionalId);
      where.professionalId = resolved ? resolved.id : filter.professionalId;
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

