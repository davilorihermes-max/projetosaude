// src/routes/scheduler.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SchedulingService } from '../services/SchedulingService.js';
import { authenticate } from '../middlewares/auth.js';

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
};
