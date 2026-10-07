import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
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
   * POST /api/scheduler/professionals
   * Cadastra novo profissional diretamente na equipe da clínica e associa ao Care Team
   */
  app.post<{
    Body: {
      name: string;
      email: string;
      password?: string;
      profession?: string;
      specialty?: string;
      councilNumber?: string;
      crm?: string;
      latitude?: number;
      longitude?: number;
    };
  }>('/professionals', async (request, reply) => {
    const {
      name,
      email,
      password = 'DoctorPassword123!',
      profession,
      specialty,
      councilNumber,
      crm,
      latitude,
      longitude
    } = request.body || {};

    if (!name || !email) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Nome e e-mail são obrigatórios.'
      });
    }

    const emailClean = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: emailClean }
    });

    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'E-mail já cadastrado.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const crmVal = councilNumber || crm || (profession ? `${profession} - Reg. Ativo` : 'CREFITO/SP 00.000');
    const specialtyVal = specialty || profession || 'Fisioterapia Domiciliar';

    const user = await prisma.user.create({
      data: {
        name,
        email: emailClean,
        passwordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crm: crmVal,
            specialty: specialtyVal,
            latitude: latitude ?? -23.585000,
            longitude: longitude ?? -46.638000
          }
        }
      },
      include: {
        professional: true
      }
    });

    // Vincula aos pacientes para compor o Care Team
    const existingPatients = await prisma.patient.findMany({ select: { id: true } });
    if (existingPatients.length > 0 && user.professional) {
      await Promise.all(
        existingPatients.map((p) =>
          prisma.careTeamMember.create({
            data: {
              patientId: p.id,
              professionalId: user.professional!.id,
              role: 'SPECIALIST',
              active: true
            }
          }).catch(() => null)
        )
      );
    }

    return reply.status(201).send({
      success: true,
      professional: {
        id: user.professional!.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        crm: user.professional!.crm,
        specialty: user.professional!.specialty,
        latitude: user.professional!.latitude,
        longitude: user.professional!.longitude
      }
    });
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


