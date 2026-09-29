import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SchedulingService } from '../services/SchedulingService.js';
import { authenticate } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

interface EvaluateBody {
  professionalId: string;
  patientId: string;
  proposedTime: string;
  durationMinutes?: number;
}

export const schedulerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /api/scheduler/evaluate
   * Avalia a viabilidade geodésica e temporal de um agendamento proposto
   */
  app.post<{ Body: EvaluateBody }>(
    '/evaluate',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { professionalId, patientId, proposedTime, durationMinutes } = request.body || {};

      if (!professionalId || !patientId || !proposedTime) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campos professionalId, patientId e proposedTime são obrigatórios.'
        });
      }

      const report = await SchedulingService.evaluateProposedSchedule({
        professionalId,
        patientId,
        proposedTime,
        durationMinutes
      });

      return reply.status(200).send({
        success: true,
        report
      });
    }
  );

  /**
   * GET /api/scheduler/appointments
   * Lista os agendamentos registrados no banco Prisma
   */
  app.get<{ Querystring: { professionalId?: string; date?: string } }>(
    '/appointments',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { professionalId, date } = request.query || {};

      const appointments = await SchedulingService.listAppointments({
        professionalId,
        date
      });

      return reply.status(200).send({
        success: true,
        count: appointments.length,
        appointments
      });
    }
  );

  /**
   * POST /api/scheduler/appointments
   * Cria um agendamento após validação estrita de viabilidade (CareTeam e deslocamento)
   */
  app.post<{
    Body: {
      professionalId: string;
      patientId: string;
      scheduledTime: string;
      durationMinutes?: number;
      notes?: string;
    };
  }>(
    '/appointments',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { professionalId, patientId, scheduledTime, durationMinutes, notes } = request.body || {};

      if (!professionalId || !patientId || !scheduledTime) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campos professionalId, patientId e scheduledTime são obrigatórios.'
        });
      }

      const result = await SchedulingService.createAppointment({
        professionalId,
        patientId,
        scheduledTime,
        durationMinutes,
        notes
      });

      if (!result.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Unviable Schedule',
          message: result.reason || 'Agendamento inviável.',
          report: result.report
        });
      }

      return reply.status(201).send({
        success: true,
        appointment: result.appointment,
        report: result.report
      });
    }
  );

  /**
   * GET /api/scheduler/professionals
   * Lista profissionais cadastrados para uso no agendamento
   */
  app.get('/professionals', async (_request, reply) => {
    const list = await prisma.professional.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    return reply.status(200).send({ success: true, professionals: list });
  });

  /**
   * GET /api/scheduler/patients
   * Lista pacientes cadastrados com coordenadas e equipe de cuidado
   */
  app.get('/patients', async (_request, reply) => {
    const list = await prisma.patient.findMany({
      include: {
        careTeamMembers: {
          where: { active: true },
          select: { professionalId: true, role: true }
        }
      }
    });
    return reply.status(200).send({ success: true, patients: list });
  });
};


