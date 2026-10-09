import {
  PrismaClient,
  SettlementStatus,
  ScheduleStatus,
  ScheduleType
} from '@prisma/client';
import { ContextualPricingResolver } from './financial-pricing.resolver';
import {
  GenerateSettlementInput,
  SettlementPreviewItem,
  SettlementPreviewResult,
  UnpricedAttendanceAlert,
  MarkAsPaidInput,
  FinancialSummaryFilters,
  FinancialSummaryResult,
  PaginatedResult
} from './financial.types';
import { ListSettlementsQuery } from './financial.schemas';

export class FinancialSettlementService {
  private readonly pricingResolver: ContextualPricingResolver;

  constructor(private readonly prisma: PrismaClient) {
    this.pricingResolver = new ContextualPricingResolver(prisma);
  }

  /**
   * Realiza uma prévia do fechamento financeiro sem persistir nada no banco de dados.
   * Permite ao gestor e ao profissional conferir as sessões executadas, valores calculados
   * e identificar pendências de tabela de preço antes de gerar a fatura.
   */
  public async previewSettlement(
    professionalId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: GenerateSettlementInput['periodType'],
    scheduleTypeFilter: 'ALL' | 'INSTITUTIONAL_SCALE' | 'AUTONOMOUS_APPOINTMENT' = 'ALL'
  ): Promise<SettlementPreviewResult> {
    if (periodStart > periodEnd) {
      throw new Error('A data de início do período não pode ser maior que a data de término.');
    }

    // 1. Busca dados do profissional e credenciais do conselho
    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: true }
    });

    if (!professional) {
      throw new Error(`Profissional com ID ${professionalId} não foi encontrado.`);
    }

    // 2. Monta filtros de busca com guardrails de integridade clínica:
    // - Somente sessões no período informado
    // - Que ainda não foram faturadas (settlementItem = null)
    // - Cujo agendamento NÃO foi cancelado ou marcado como No-Show
    const whereCondition: any = {
      professionalId,
      checkInAt: {
        gte: periodStart,
        lte: periodEnd
      },
      settlementItem: null,
      schedule: {
        status: {
          notIn: [
            ScheduleStatus.CANCELLED_BY_PATIENT,
            ScheduleStatus.CANCELLED_BY_PROFESSIONAL,
            ScheduleStatus.NO_SHOW
          ]
        }
      }
    };

    if (scheduleTypeFilter !== 'ALL') {
      whereCondition.schedule.type = scheduleTypeFilter as ScheduleType;
    }

    const eligibleAttendances = await this.prisma.attendance.findMany({
      where: whereCondition,
      include: {
        patient: true,
        schedule: {
          include: {
            address: true
          }
        }
      },
      orderBy: {
        checkInAt: 'asc'
      }
    });

    const items: SettlementPreviewItem[] = [];
    const unpricedAttendances: UnpricedAttendanceAlert[] = [];
    let totalGrossAmount = 0;

    // 3. Itera calculando o preço contextual de cada sessão
    for (const attendance of eligibleAttendances) {
      const address = attendance.schedule.address;
      const formattedAddress = `${address.street}, ${address.number}${
        address.complement ? ` (${address.complement})` : ''
      } - ${address.neighborhood}, ${address.city}/${address.state}`;

      const pricing = await this.pricingResolver.resolvePrice(
        professionalId,
        attendance.patientId,
        attendance.schedule.addressId,
        attendance.checkInAt
      );

      if (pricing.ruleApplied === 'NOT_CONFIGURED') {
        unpricedAttendances.push({
          attendanceId: attendance.id,
          scheduleId: attendance.scheduleId,
          patientId: attendance.patientId,
          patientName: attendance.patient.fullName,
          executedAt: attendance.checkInAt,
          addressId: attendance.schedule.addressId,
          reason: 'Nenhuma precificação configurada (nem por endereço, nem padrão do paciente).'
        });
      } else {
        totalGrossAmount += pricing.chargedAmount;
        items.push({
          attendanceId: attendance.id,
          scheduleId: attendance.scheduleId,
          patientId: attendance.patientId,
          patientName: attendance.patient.fullName,
          executedAt: attendance.checkInAt,
          addressId: attendance.schedule.addressId,
          addressFormatted: formattedAddress,
          chargedAmount: pricing.chargedAmount,
          ruleApplied: pricing.ruleApplied,
          scheduleType: attendance.schedule.type
        });
      }
    }

    return {
      professionalId,
      professionalName: professional.user.fullName,
      councilRegistration: `${professional.councilType} ${professional.councilNumber}`,
      periodType,
      periodStart,
      periodEnd,
      scheduleTypeFilter,
      totalEligibleSessions: items.length,
      totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
      items,
      unpricedAttendances
    };
  }

  /**
   * Consolida e salva o fechamento financeiro com snapshots imutáveis em transação ACID.
   * Cria o fechamento inicialmente no status DRAFT.
   */
  public async generateSettlement(input: GenerateSettlementInput) {
    const preview = await this.previewSettlement(
      input.professionalId,
      input.periodStart,
      input.periodEnd,
      input.periodType,
      input.scheduleTypeFilter || 'ALL'
    );

    // Validação estrita de pendências de precificação
    if (preview.unpricedAttendances.length > 0 && !input.allowUnpricedOverride) {
      const pendingPatients = Array.from(new Set(preview.unpricedAttendances.map(p => p.patientName))).join(', ');
      throw new Error(
        `Impossível gerar fechamento financeiro: existem ${preview.unpricedAttendances.length} sessões sem precificação configurada para os pacientes: [${pendingPatients}]. Configure a tabela de preços ou utilize 'allowUnpricedOverride: true'.`
      );
    }

    if (preview.items.length === 0) {
      throw new Error('Nenhuma sessão elegível com valor precificado foi encontrada para o período informado.');
    }

    // Gravação transacional com snapshots imutáveis
    return this.prisma.$transaction(async tx => {
      const settlement = await tx.financialSettlement.create({
        data: {
          professionalId: input.professionalId,
          periodType: input.periodType,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          totalSessions: preview.items.length,
          totalGrossAmount: preview.totalGrossAmount,
          status: SettlementStatus.DRAFT,
          items: {
            create: preview.items.map(item => ({
              attendanceId: item.attendanceId,
              patientNameSnapshot: item.patientName,
              addressSnapshot: item.addressFormatted,
              executedAt: item.executedAt,
              chargedAmount: item.chargedAmount
            }))
          }
        },
        include: {
          items: true,
          professional: {
            include: {
              user: true
            }
          }
        }
      });

      return settlement;
    });
  }

  /**
   * Submete um fechamento em DRAFT para auditoria do gestor (PENDING_REVIEW).
   */
  public async submitForReview(settlementId: string) {
    const settlement = await this.prisma.financialSettlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    if (settlement.status !== SettlementStatus.DRAFT) {
      throw new Error(`Apenas fechamentos no status 'DRAFT' podem ser enviados para revisão. Status atual: '${settlement.status}'.`);
    }

    return this.prisma.financialSettlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.PENDING_REVIEW
      }
    });
  }

  /**
   * Aprova formalmente um fechamento em rascunho ou revisão (APPROVED).
   */
  public async approveSettlement(settlementId: string) {
    const settlement = await this.prisma.financialSettlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    if (settlement.status === SettlementStatus.APPROVED || settlement.status === SettlementStatus.PAID) {
      throw new Error(`Fechamento já se encontra no status '${settlement.status}'.`);
    }

    if (settlement.status === SettlementStatus.CANCELLED) {
      throw new Error('Não é possível aprovar um fechamento cancelado.');
    }

    return this.prisma.financialSettlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.APPROVED,
        approvedAt: new Date()
      }
    });
  }

  /**
   * Registra a efetivação do pagamento/repasse financeiro ao profissional (PAID).
   */
  public async markAsPaid(input: MarkAsPaidInput) {
    const settlement = await this.prisma.financialSettlement.findUnique({
      where: { id: input.settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${input.settlementId} não encontrado.`);
    }

    if (settlement.status !== SettlementStatus.APPROVED) {
      throw new Error(`Apenas fechamentos no status 'APPROVED' podem ser liquidados como pagos. Status atual: '${settlement.status}'.`);
    }

    return this.prisma.financialSettlement.update({
      where: { id: input.settlementId },
      data: {
        status: SettlementStatus.PAID
      }
    });
  }

  /**
   * Cancela um fechamento financeiro e remove os snapshots para liberar os atendimentos
   * para uma nova apuração futura.
   */
  public async cancelSettlement(settlementId: string, reason?: string) {
    return this.prisma.$transaction(async tx => {
      const settlement = await tx.financialSettlement.findUnique({
        where: { id: settlementId },
        include: { items: true }
      });

      if (!settlement) {
        throw new Error(`Fechamento ${settlementId} não encontrado.`);
      }

      if (settlement.status === SettlementStatus.PAID) {
        throw new Error('Operação negada: não é permitido cancelar um fechamento que já foi liquidado como PAGO.');
      }

      // Deleta os itens do fechamento para liberar a chave única de attendanceId
      await tx.settlementItem.deleteMany({
        where: { settlementId }
      });

      // Atualiza o status do fechamento para CANCELLED
      return tx.financialSettlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.CANCELLED
        }
      });
    });
  }

  /**
   * Busca um fechamento específico com detalhes completos dos itens faturados.
   */
  public async getSettlementById(settlementId: string) {
    const settlement = await this.prisma.financialSettlement.findUnique({
      where: { id: settlementId },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        items: {
          orderBy: {
            executedAt: 'asc'
          }
        }
      }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    return settlement;
  }

  /**
   * Listagem paginada de fechamentos com filtros avançados.
   */
  public async listSettlements(query: ListSettlementsQuery): Promise<PaginatedResult<any>> {
    const where: any = {};

    if (query.professionalId) {
      where.professionalId = query.professionalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.periodType) {
      where.periodType = query.periodType;
    }

    if (query.startDate && query.endDate) {
      where.periodStart = { gte: query.startDate };
      where.periodEnd = { lte: query.endDate };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.financialSettlement.count({ where }),
      this.prisma.financialSettlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          professional: {
            include: {
              user: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Consolida métricas financeiras (KPIs) para visão gerencial da clínica.
   */
  public async getFinancialSummary(filters: FinancialSummaryFilters = {}): Promise<FinancialSummaryResult> {
    const where: any = {};

    if (filters.professionalId) {
      where.professionalId = filters.professionalId;
    }

    if (filters.startDate || filters.endDate) {
      where.periodStart = {};
      if (filters.startDate) where.periodStart.gte = filters.startDate;
      if (filters.endDate) where.periodStart.lte = filters.endDate;
    }

    const settlements = await this.prisma.financialSettlement.findMany({
      where
    });

    let totalGrossSettled = 0;
    let totalDraftAmount = 0;
    let totalApprovedAmount = 0;
    let totalPaidAmount = 0;
    let totalSessionsCount = 0;

    const settlementsCount = {
      draft: 0,
      pendingReview: 0,
      approved: 0,
      paid: 0,
      cancelled: 0
    };

    for (const s of settlements) {
      const amount = Number(s.totalGrossAmount);

      switch (s.status) {
        case SettlementStatus.DRAFT:
          settlementsCount.draft++;
          totalDraftAmount += amount;
          break;
        case SettlementStatus.PENDING_REVIEW:
          settlementsCount.pendingReview++;
          totalDraftAmount += amount;
          break;
        case SettlementStatus.APPROVED:
          settlementsCount.approved++;
          totalApprovedAmount += amount;
          totalGrossSettled += amount;
          totalSessionsCount += s.totalSessions;
          break;
        case SettlementStatus.PAID:
          settlementsCount.paid++;
          totalPaidAmount += amount;
          totalGrossSettled += amount;
          totalSessionsCount += s.totalSessions;
          break;
        case SettlementStatus.CANCELLED:
          settlementsCount.cancelled++;
          break;
      }
    }

    const averageSessionPrice =
      totalSessionsCount > 0
        ? Math.round((totalGrossSettled / totalSessionsCount) * 100) / 100
        : 0;

    return {
      totalGrossSettled: Math.round(totalGrossSettled * 100) / 100,
      totalDraftAmount: Math.round(totalDraftAmount * 100) / 100,
      totalApprovedAmount: Math.round(totalApprovedAmount * 100) / 100,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      totalSessionsCount,
      averageSessionPrice,
      settlementsCount
    };
  }
}
