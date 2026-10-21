import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { SchedulingService } from '../services/SchedulingService.js';
import { authenticate, authenticateOptional } from '../middlewares/auth.js';
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
    { preHandler: [authenticateOptional] },
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
    const enrichedList = list.map((p) => {
      const emailLower = (p.user?.email || '').toLowerCase().trim();
      return {
        ...p,
        user: {
          ...p.user,
          avatar: emailLower === 'sabrinapradolucas@elohabilitar.com.br' ? '/avatars/sabrina-prado-lucas.png' : null
        }
      };
    });
    return reply.status(200).send({ success: true, professionals: enrichedList });
  });

  /**
   * POST /api/scheduler/professionals
   * Cadastra novo profissional diretamente na equipe da clínica e associa ao Care Team
   * Se o profissional não tiver perfil/login/senha, gera credenciais corporativas automaticamente
   */
  app.post<{
    Body: {
      name: string;
      email?: string;
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
      password,
      profession,
      specialty,
      councilNumber,
      crm,
      latitude,
      longitude
    } = request.body || {};

    if (!name || !name.trim()) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Nome do profissional é obrigatório.'
      });
    }

    const trimmedName = name.trim();
    let emailClean = (email || '').toLowerCase().trim();
    let effectivePassword = (password || '').trim();
    let wasGenerated = false;

    // Se não forneceu e-mail/login, gera automaticamente a partir do nome
    if (!emailClean) {
      wasGenerated = true;
      const cleanForEmail = trimmedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^(dr|dra|enf|ft|fono|nutri|prof)\.?\s+/i, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      const parts = cleanForEmail.split(/\s+/).filter(Boolean);
      const first = parts[0] || 'profissional';
      const last = parts.length > 1 ? parts[parts.length - 1] : 'saude';
      let candidate = `${first}.${last}@omnihome.med.br`;

      const checkExists = await prisma.user.findUnique({ where: { email: candidate } });
      if (checkExists) {
        candidate = `${first}.${last}.${Math.floor(10 + Math.random() * 90)}@omnihome.med.br`;
      }
      emailClean = candidate;
    }

    // Se não forneceu senha, gera senha segura e amigável automaticamente
    if (!effectivePassword) {
      wasGenerated = true;
      const cleanForPass = trimmedName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/^(dr|dra|enf|ft|fono|nutri|prof)\.?\s+/i, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
      const parts = cleanForPass.split(/\s+/).filter(Boolean);
      const word = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'Omni';
      effectivePassword = `Omni@${word}${Math.floor(100 + Math.random() * 900)}`;
    }

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

    const passwordHash = await bcrypt.hash(effectivePassword, 10);

    // Formatação inteligente do conselho profissional se o usuário digitou apenas números
    let crmVal = councilNumber || crm;
    const cleanProf = profession || 'Fisioterapia';
    if (crmVal && crmVal.trim() && crmVal !== 'Registro Ativo') {
      const trimmedCrm = crmVal.trim();
      if (/^\d/.test(trimmedCrm)) {
        if (cleanProf === 'Fisioterapia' || cleanProf === 'Terapia Ocupacional') {
          crmVal = `CREFITO-2/ES ${trimmedCrm}`;
        } else if (cleanProf === 'Enfermagem') {
          crmVal = `COREN-ES ${trimmedCrm}`;
        } else if (cleanProf === 'Fonoaudiologia') {
          crmVal = `CRFa-ES ${trimmedCrm}`;
        } else if (cleanProf === 'Nutrição') {
          crmVal = `CRN-ES ${trimmedCrm}`;
        } else if (cleanProf === 'Medicina') {
          crmVal = `CRM-ES ${trimmedCrm}`;
        }
      }
    } else {
      crmVal = `${cleanProf} - Reg. Ativo`;
    }

    const specialtyVal = specialty || profession || 'Fisioterapia Domiciliar';

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email: emailClean,
        passwordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crm: crmVal,
            specialty: specialtyVal,
            latitude: latitude ?? -20.3012,
            longitude: longitude ?? -40.2925
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
      for (const p of existingPatients) {
        try {
          await prisma.careTeamMember.upsert({
            where: {
              patientId_professionalId: {
                patientId: p.id,
                professionalId: user.professional.id
              }
            },
            update: { active: true },
            create: {
              patientId: p.id,
              professionalId: user.professional.id,
              role: 'SPECIALIST',
              active: true
            }
          });
        } catch {
          // Ignora caso paciente de teste tenha sido excluído concorrentemente
        }
      }
    }

    return reply.status(201).send({
      success: true,
      generatedCredentials: {
        login: emailClean,
        password: effectivePassword,
        wasGenerated
      },
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
   * DELETE /api/scheduler/professionals/:id
   * Remove profissional credenciado e seus vínculos na clínica
   */
  app.delete<{ Params: { id: string } }>('/professionals/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ID do profissional é obrigatório.'
      });
    }

    const prof = await prisma.professional.findUnique({
      where: { id }
    });

    if (!prof) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Profissional não encontrado.'
      });
    }

    // Remove appointments e careTeamMembers antes para manter integridade
    await prisma.careTeamMember.deleteMany({ where: { professionalId: id } }).catch(() => null);
    await prisma.appointment.deleteMany({ where: { professionalId: id } }).catch(() => null);
    await prisma.contextualPrice.deleteMany({ where: { professionalId: id } }).catch(() => null);

    // Se houver usuário vinculado, deleta o User (que deleta Professional em cascata). Caso contrário, deleta Professional.
    if (prof.userId) {
      await prisma.user.delete({
        where: { id: prof.userId }
      }).catch(async () => {
        await prisma.professional.delete({ where: { id } }).catch(() => null);
      });
    } else {
      await prisma.professional.delete({
        where: { id }
      }).catch(() => null);
    }

    return reply.status(200).send({
      success: true,
      message: 'Profissional removido com sucesso.'
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
      cpf?: string;
      email?: string;
      phone?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      professionalId?: string;
      careTeamProfessionalIds?: string[];
    };
  }>('/patients', async (request, reply) => {
    try {
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

      if (!name || !name.trim()) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Nome do paciente é obrigatório.'
        });
      }

      const existingById = id && !id.startsWith('pat-')
        ? await prisma.patient.findUnique({ where: { id } })
        : null;

      const cleanCpf = (cpf && cpf.trim()) || existingById?.cpf || `000.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-00`;

      const existingByCpf = cleanCpf && !cleanCpf.startsWith('000.')
        ? await prisma.patient.findUnique({ where: { cpf: cleanCpf } })
        : null;

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
      const rawProfIds =
        Array.isArray(careTeamProfessionalIds) && careTeamProfessionalIds.length > 0
          ? allProfs.filter((p) => careTeamProfessionalIds.includes(p.id)).map((p) => p.id)
          : allProfs.map((p) => p.id);
      const targetProfIds = Array.from(new Set(rawProfIds));

      if (existing) {
        if (Array.isArray(careTeamProfessionalIds) && careTeamProfessionalIds.length > 0) {
          await prisma.careTeamMember.deleteMany({ where: { patientId: existing.id } }).catch(() => null);
          for (const profId of targetProfIds) {
            await prisma.careTeamMember.upsert({
              where: {
                patientId_professionalId: {
                  patientId: existing.id,
                  professionalId: profId
                }
              },
              update: { active: true },
              create: {
                patientId: existing.id,
                professionalId: profId,
                role: profId === validProfId ? 'PRIMARY_CARE' : 'SPECIALIST',
                active: true
              }
            }).catch(() => null);
          }
        }

        const updatedPatient = await prisma.patient.update({
          where: { id: existing.id },
          data: {
            name: name.trim(),
            cpf: cleanCpf,
            email: email !== undefined ? email : existing.email,
            phone: phone !== undefined ? phone : existing.phone,
            address: address !== undefined ? address : existing.address,
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
          name: name.trim(),
          cpf: cleanCpf,
          email: email || null,
          phone: phone || null,
          address: address || null,
          latitude: latitude ?? -20.3012,
          longitude: longitude ?? -40.2925,
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
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Falha ao salvar paciente no banco de dados.'
      });
    }
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
  }>('/monthly-plan/commit', { preHandler: [authenticateOptional] }, async (request, reply) => {
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

  /**
   * GET /api/scheduler/fixed-appointments
   * Retorna os atendimentos fixados/travados da escala persistidos na nuvem
   */
  app.get('/fixed-appointments', async (_request, reply) => {
    try {
      const config = await prisma.scalePlannerConfig.findUnique({
        where: { key: 'fixed_appointments' }
      });

      if (config && config.value) {
        const parsed = JSON.parse(config.value);
        return reply.status(200).send({
          success: true,
          fixedAppointments: Array.isArray(parsed) ? parsed : []
        });
      }

      // Se ainda não houver configuração salva, monta os atendimentos fixados padrão da clínica
      const kadir = await prisma.patient.findFirst({ where: { name: { contains: 'Kadir' } } });
      const nilza = await prisma.patient.findFirst({ where: { name: { contains: 'Nilza' } } });
      const teresa = await prisma.patient.findFirst({ where: { name: { contains: 'Teresa' } } });

      const daviProf = await prisma.professional.findFirst({
        where: { user: { name: { contains: 'Davi' } } },
        include: { user: true }
      });
      const gabrielProf = await prisma.professional.findFirst({
        where: { user: { name: { contains: 'Gabriel' } } },
        include: { user: true }
      });

      const defaults: any[] = [];
      if (kadir && daviProf) {
        defaults.push({
          id: 'fix-kadir-seg',
          patientId: kadir.id,
          patientName: kadir.name,
          professionalId: daviProf.id,
          professionalName: daviProf.user.name,
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          recurrenceType: 'weekly',
          dayOfWeek: 1, // Segunda
          time: '09:00',
          durationMinutes: 180,
          notes: 'Atendimento fixo pré-estabelecido'
        });
      }
      if (nilza && daviProf) {
        defaults.push({
          id: 'fix-nilza-sex',
          patientId: nilza.id,
          patientName: nilza.name,
          professionalId: daviProf.id,
          professionalName: daviProf.user.name,
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          recurrenceType: 'weekly',
          dayOfWeek: 5, // Sexta
          time: '09:00',
          durationMinutes: 180,
          notes: 'Atendimento fixo pré-estabelecido'
        });
      }
      if (teresa && gabrielProf) {
        defaults.push({
          id: 'fix-teresa-sab',
          patientId: teresa.id,
          patientName: teresa.name,
          professionalId: gabrielProf.id,
          professionalName: gabrielProf.user.name,
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          recurrenceType: 'weekly',
          dayOfWeek: 6, // Sábado
          time: '09:00',
          durationMinutes: 180,
          notes: 'Atendimento fixo pré-estabelecido'
        });
      }

      if (defaults.length > 0) {
        await prisma.scalePlannerConfig.upsert({
          where: { key: 'fixed_appointments' },
          create: { key: 'fixed_appointments', value: JSON.stringify(defaults) },
          update: { value: JSON.stringify(defaults) }
        }).catch(() => null);
      }

      return reply.status(200).send({
        success: true,
        fixedAppointments: defaults
      });
    } catch {
      return reply.status(200).send({
        success: true,
        fixedAppointments: []
      });
    }
  });

  /**
   * POST /api/scheduler/fixed-appointments
   * Salva a lista de atendimentos fixados/travados da escala no PostgreSQL
   */
  app.post<{
    Body: {
      fixedAppointments?: any[];
      fixedAppointment?: any;
    };
  }>('/fixed-appointments', async (request, reply) => {
    try {
      const { fixedAppointments, fixedAppointment } = request.body || {};
      let list: any[] = [];

      if (Array.isArray(fixedAppointments)) {
        list = fixedAppointments;
      } else if (fixedAppointment) {
        const existing = await prisma.scalePlannerConfig.findUnique({
          where: { key: 'fixed_appointments' }
        });
        const current = existing && existing.value ? JSON.parse(existing.value) : [];
        const filtered = Array.isArray(current) ? current.filter((f) => f.id !== fixedAppointment.id) : [];
        list = [...filtered, fixedAppointment];
      }

      await prisma.scalePlannerConfig.upsert({
        where: { key: 'fixed_appointments' },
        create: { key: 'fixed_appointments', value: JSON.stringify(list) },
        update: { value: JSON.stringify(list) }
      });

      return reply.status(200).send({
        success: true,
        fixedAppointments: list
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Falha ao salvar atendimentos fixados.'
      });
    }
  });

  /**
   * DELETE /api/scheduler/fixed-appointments/:id
   * Remove um atendimento fixado pelo ID no PostgreSQL
   */
  app.delete<{
    Params: { id: string };
  }>('/fixed-appointments/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const existing = await prisma.scalePlannerConfig.findUnique({
        where: { key: 'fixed_appointments' }
      });
      const current = existing && existing.value ? JSON.parse(existing.value) : [];
      const updated = Array.isArray(current) ? current.filter((f) => f.id !== id) : [];

      await prisma.scalePlannerConfig.upsert({
        where: { key: 'fixed_appointments' },
        create: { key: 'fixed_appointments', value: JSON.stringify(updated) },
        update: { value: JSON.stringify(updated) }
      });

      return reply.status(200).send({
        success: true,
        fixedAppointments: updated
      });
    } catch (err: any) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: err.message || 'Falha ao remover atendimento fixado.'
      });
    }
  });
};


