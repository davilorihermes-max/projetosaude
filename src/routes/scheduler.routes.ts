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
   * GET /api/scheduler/schedule
   * Lista de agendamentos da escala ativa para sincronização Web/Mobile (PWA e React Native)
   */
  app.get<{ Querystring: { professionalId?: string; date?: string } }>(
    '/schedule',
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

  /**
   * POST /api/scheduler/patients
   * Cadastra ou atualiza paciente no banco Prisma com coordenadas geodésicas e vincula ao Care Team
   */
  app.post<{
    Body: {
      id?: string;
      name: string;
      cpf: string;
      email?: string;
      phone?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      professionalId?: string;
      careTeamProfessionalIds?: string[];
    };
  }>('/patients', async (request, reply) => {
    const {
      id,
      name,
      cpf,
      email,
      phone,
      address,
      latitude,
      longitude,
      professionalId,
      careTeamProfessionalIds
    } = request.body || {};

    if (!name || !cpf) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Nome e CPF são obrigatórios para cadastro do paciente.'
      });
    }

    const cleanCpf = cpf.trim();
    const existingById = id && !id.startsWith('pat-')
      ? await prisma.patient.findUnique({ where: { id } })
      : null;
    const existingByCpf = await prisma.patient.findUnique({
      where: { cpf: cleanCpf }
    });
    const existing = existingById || existingByCpf;

    let validProfId: string | null = null;
    if (professionalId) {
      const prof = await prisma.professional.findFirst({
        where: {
          OR: [{ id: professionalId }, { userId: professionalId }]
        }
      });
      if (prof) {
        validProfId = prof.id;
      }
    }

    const allProfs = await prisma.professional.findMany({ select: { id: true } });
    const targetProfIds =
      Array.isArray(careTeamProfessionalIds) && careTeamProfessionalIds.length > 0
        ? allProfs.filter((p) => careTeamProfessionalIds.includes(p.id)).map((p) => p.id)
        : allProfs.map((p) => p.id);

    if (existing) {
      if (Array.isArray(careTeamProfessionalIds) && careTeamProfessionalIds.length > 0) {
        await prisma.careTeamMember.deleteMany({ where: { patientId: existing.id } });
        for (const profId of targetProfIds) {
          await prisma.careTeamMember.create({
            data: {
              patientId: existing.id,
              professionalId: profId,
              role: profId === validProfId ? 'PRIMARY_CARE' : 'SPECIALIST',
              active: true
            }
          });
        }
      }

      const updatedPatient = await prisma.patient.update({
        where: { id: existing.id },
        data: {
          name,
          cpf: cleanCpf,
          email: email || existing.email,
          phone: phone || existing.phone,
          address: address || existing.address,
          latitude: latitude ?? existing.latitude,
          longitude: longitude ?? existing.longitude
        },
        include: {
          careTeamMembers: true
        }
      });

      return reply.status(200).send({
        success: true,
        patient: updatedPatient
      });
    }

    const careTeamCreates = targetProfIds.map((profId) => ({
      professionalId: profId,
      role: profId === validProfId ? 'PRIMARY_CARE' : 'SPECIALIST',
      active: true
    }));

    const newPatient = await prisma.patient.create({
      data: {
        name,
        cpf: cleanCpf,
        email: email || null,
        phone: phone || null,
        address: address || null,
        latitude: latitude ?? -23.585,
        longitude: longitude ?? -46.638,
        ...(careTeamCreates.length > 0
          ? {
              careTeamMembers: {
                create: careTeamCreates
              }
            }
          : {})
      },
      include: {
        careTeamMembers: true
      }
    });

    return reply.status(201).send({
      success: true,
      patient: newPatient
    });
  });

  /**
   * DELETE /api/scheduler/patients/:id
   * Remove um paciente cadastrado e seus vínculos no banco Prisma
   */
  app.delete<{ Params: { id: string } }>('/patients/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ID do paciente é obrigatório.'
      });
    }

    await prisma.patient.deleteMany({
      where: { id }
    });

    return reply.status(200).send({
      success: true
    });
  });

  /**
   * POST /api/scheduler/monthly-plan/generate
   * Gera o plano de escala mensal automatizado cruzando demandas, disponibilidades e Care Team
   */
  app.post<{
    Body: {
      year?: number;
      month?: number;
      demands?: any[];
      availabilities?: any[];
      careTeams?: any[];
    };
  }>('/monthly-plan/generate', async (request, reply) => {
    const { year, month, demands, availabilities, careTeams } = request.body || {};

    const plan = await SchedulingService.generateMonthlyScalePlan({
      year,
      month,
      demands,
      availabilities,
      careTeams
    });

    return reply.status(200).send({
      success: true,
      plan
    });
  });

  /**
   * POST /api/scheduler/monthly-plan/commit
   * Grava em lote as sessões aprovadas da escala mensal no banco de dados Prisma
   */
  app.post<{
    Body: {
      sessions: any[];
    };
  }>('/monthly-plan/commit', { preHandler: [authenticate] }, async (request, reply) => {
    const { sessions } = request.body || {};

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'A lista de sessões para commit é obrigatória.'
      });
    }

    const result = await SchedulingService.commitMonthlyPlan(sessions);
    return reply.status(201).send(result);
  });
};


