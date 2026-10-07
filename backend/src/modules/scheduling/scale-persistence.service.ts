// backend/src/modules/scheduling/scale-persistence.service.ts
import { PrismaClient, Schedule, ScheduleStatus, ScheduleType } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  CommitMonthlyScaleInput,
  CommitMonthlyScaleResult,
  ScheduleQueryFilter
} from './scheduling.types';

export class ScalePersistenceService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Persiste uma escala mensal completa diretamente nas tabelas do PostgreSQL via Prisma.
   *
   * Garantias Arquiteturais:
   * 1. Regra de Ouro (Care Team): Impede persistência se qualquer profissional não tiver vínculo ativo no CareTeam.
   * 2. Resolução de Endereço Domiciliar: Vincula automaticamente cada agendamento ao endereço ativo do paciente.
   * 3. Transação Atômica (prisma.$transaction): Garante tudo-ou-nada; se uma sessão falhar, toda a escala é revertida.
   * 4. Idempotência & Lote (batchId): Substitui com segurança sessões não iniciadas do mesmo período se overwriteExisting for true.
   */
  public async commitMonthlyScale(input: CommitMonthlyScaleInput): Promise<CommitMonthlyScaleResult> {
    const { year, month, sessions, overwriteExisting = true } = input;

    if (!sessions || sessions.length === 0) {
      throw new Error('Nenhuma sessão fornecida para persistência da escala.');
    }

    if (month < 1 || month > 12) {
      throw new Error(`Mês inválido: ${month}. Deve estar entre 1 e 12.`);
    }

    const batchId = input.batchId || randomUUID();

    // 1. Coleta IDs únicos de pacientes e profissionais
    const uniquePatientIds = Array.from(new Set(sessions.map((s) => s.patientId)));
    const uniqueProfIds = Array.from(new Set(sessions.map((s) => s.professionalId)));

    // 2. Validação Estrita do Care Team (Regra de Ouro)
    const activeCareTeams = await this.prisma.careTeamMember.findMany({
      where: {
        patientId: { in: uniquePatientIds },
        professionalId: { in: uniqueProfIds },
        isActive: true
      }
    });

    const careTeamLookup = new Set<string>();
    for (const ct of activeCareTeams) {
      careTeamLookup.add(`${ct.patientId}::${ct.professionalId}`);
    }

    for (const session of sessions) {
      const key = `${session.patientId}::${session.professionalId}`;
      if (!careTeamLookup.has(key)) {
        throw new Error(
          `Violação da Regra de Ouro (Care Team): O profissional '${session.professionalId}' não possui vínculo ativo na Equipe de Cuidado do paciente '${session.patientId}'. Agendamento rejeitado.`
        );
      }
    }

    // 3. Resolução dos Endereços dos Pacientes
    const patientAddresses = await this.prisma.patientAddress.findMany({
      where: {
        patientId: { in: uniquePatientIds }
      }
    });

    const defaultAddressMap = new Map<string, string>();
    for (const addr of patientAddresses) {
      if (addr.isDefault || !defaultAddressMap.has(addr.patientId)) {
        defaultAddressMap.set(addr.patientId, addr.id);
      }
    }

    for (const patientId of uniquePatientIds) {
      if (!defaultAddressMap.has(patientId)) {
        throw new Error(
          `O paciente '${patientId}' não possui endereço cadastrado na tabela 'patient_addresses'. Não é possível gerar atendimento domiciliar.`
        );
      }
    }

    // 4. Executa a Persistência em Transação Atômica no PostgreSQL
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const savedSchedules = await this.prisma.$transaction(async (tx) => {
      // Se solicitado, remove agendamentos institucionais anteriores ainda não realizados (SCHEDULED) no mesmo mês
      if (overwriteExisting) {
        await tx.schedule.deleteMany({
          where: {
            patientId: { in: uniquePatientIds },
            type: ScheduleType.INSTITUTIONAL_SCALE,
            status: ScheduleStatus.SCHEDULED,
            scheduledStart: { gte: monthStart, lte: monthEnd },
            attendance: null // Preserva agendamentos que já possuam check-in realizado
          }
        });
      }

      const createdList: Schedule[] = [];

      for (const session of sessions) {
        const [y, m, d] = session.date.split('-').map(Number);
        const [hours, minutes] = session.time.split(':').map(Number);

        const scheduledStart = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0));
        const scheduledEnd = new Date(scheduledStart.getTime() + session.durationMinutes * 60 * 1000);

        const addressId = session.addressId || defaultAddressMap.get(session.patientId)!;

        const schedule = await tx.schedule.create({
          data: {
            type: ScheduleType.INSTITUTIONAL_SCALE,
            batchId,
            patientId: session.patientId,
            professionalId: session.professionalId,
            addressId,
            scheduledStart,
            scheduledEnd,
            status: ScheduleStatus.SCHEDULED
          }
        });

        createdList.push(schedule);
      }

      return createdList;
    });

    return {
      success: true,
      batchId,
      year,
      month,
      committedCount: savedSchedules.length,
      schedules: savedSchedules,
      message: `Escala mensal de ${month}/${year} persistida com sucesso no PostgreSQL (${savedSchedules.length} agendamentos registrados no lote ${batchId}).`
    };
  }

  /**
   * Cancela em lote todos os agendamentos de uma determinada escala
   */
  public async cancelScaleBatch(batchId: string, cancelledByRole: 'PATIENT' | 'PROFESSIONAL' = 'PROFESSIONAL') {
    const status =
      cancelledByRole === 'PATIENT'
        ? ScheduleStatus.CANCELLED_BY_PATIENT
        : ScheduleStatus.CANCELLED_BY_PROFESSIONAL;

    return this.prisma.schedule.updateMany({
      where: {
        batchId,
        status: ScheduleStatus.SCHEDULED,
        attendance: null
      },
      data: {
        status
      }
    });
  }

  /**
   * Consulta os agendamentos da escala por lote ou intervalo de datas
   */
  public async listSchedules(filter: ScheduleQueryFilter) {
    const where: any = {};

    if (filter.batchId) {
      where.batchId = filter.batchId;
    }

    if (filter.professionalId) {
      where.professionalId = filter.professionalId;
    }

    if (filter.patientId) {
      where.patientId = filter.patientId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.startDate || filter.endDate) {
      where.scheduledStart = {};
      if (filter.startDate) where.scheduledStart.gte = filter.startDate;
      if (filter.endDate) where.scheduledStart.lte = filter.endDate;
    }

    return this.prisma.schedule.findMany({
      where,
      orderBy: { scheduledStart: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            documentNumber: true
          }
        },
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        },
        address: true,
        attendance: true
      }
    });
  }
}
