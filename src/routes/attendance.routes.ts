// src/routes/attendance.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AttendanceService, AttendanceError } from '../services/AttendanceService.js';
import { authenticate } from '../middlewares/auth.js';

interface CheckInBody {
  appointmentId: string;
  latitude: number;
  longitude: number;
  overrideReason?: string;
  isManualOverride?: boolean;
}

interface CheckOutBody {
  attendanceId?: string;
  appointmentId?: string;
  latitude?: number;
  longitude?: number;
}

export const attendanceRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * POST /api/attendance/check-in
   * Registra presença do profissional no domicílio via validação por geofencing (150m)
   */
  app.post<{ Body: CheckInBody }>(
    '/check-in',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { appointmentId, latitude, longitude, overrideReason, isManualOverride } = request.body || {};
      const user = (request as any).user;

      if (!appointmentId || latitude === undefined || longitude === undefined) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Os campos appointmentId, latitude e longitude são obrigatórios.'
        });
      }

      try {
        const result = await AttendanceService.performCheckIn({
          appointmentId,
          professionalId: user?.userId || 'unknown-user',
          latitude: Number(latitude),
          longitude: Number(longitude),
          overrideReason,
          isManualOverride
        });

        return reply.status(201).send({
          success: true,
          attendance: result.attendance,
          assessment: result.assessment,
          appointment: result.appointment
        });
      } catch (err: any) {
        if (err instanceof AttendanceError) {
          return reply.status(400).send({
            statusCode: 400,
            error: err.requiresOverride ? 'Geofence Violation' : 'Attendance Error',
            message: err.message,
            requiresOverride: err.requiresOverride,
            distanceMeters: err.distanceMeters
          });
        }

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: err.message || 'Erro inesperado ao registrar check-in.'
        });
      }
    }
  );

  /**
   * POST /api/attendance/check-out
   * Finaliza atendimento domiciliar com registro de duração real
   */
  app.post<{ Body: CheckOutBody }>(
    '/check-out',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { attendanceId, appointmentId, latitude, longitude } = request.body || {};
      const user = (request as any).user;

      if (!attendanceId && !appointmentId) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'É necessário informar ao menos attendanceId ou appointmentId para check-out.'
        });
      }

      try {
        const result = await AttendanceService.performCheckOut({
          attendanceId,
          appointmentId,
          professionalId: user?.userId,
          latitude: latitude !== undefined ? Number(latitude) : undefined,
          longitude: longitude !== undefined ? Number(longitude) : undefined
        });

        return reply.status(200).send({
          success: true,
          attendance: result.attendance,
          actualDurationMin: result.actualDurationMin,
          appointment: result.appointment
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Check-out Error',
          message: err.message
        });
      }
    }
  );

  /**
   * GET /api/attendance/:appointmentId
   * Consulta o registro de presença de um agendamento
   */
  app.get<{ Params: { appointmentId: string } }>(
    '/:appointmentId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { appointmentId } = request.params;
      const attendance = await AttendanceService.getAttendanceByAppointmentId(appointmentId);

      if (!attendance) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Nenhum registro de check-in encontrado para este agendamento.'
        });
      }

      return reply.status(200).send({
        success: true,
        attendance
      });
    }
  );
};
