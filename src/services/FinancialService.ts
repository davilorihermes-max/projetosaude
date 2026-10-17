// src/services/FinancialService.ts
import { prisma } from '../lib/prisma.js';

export type PricingRuleType = 'EXACT_ADDRESS' | 'PATIENT_DEFAULT' | 'BASE_FALLBACK' | 'NOT_CONFIGURED';

export interface PricingResolution {
  chargedAmount: number;
  ruleApplied: PricingRuleType;
  contextualPriceId?: string;
}

export interface SettlementPreviewItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  scheduledTime: string;
  chargedAmount: number;
  ruleApplied: PricingRuleType;
  status: string;
}

export interface UnpricedAppointmentAlert {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientAddress: string;
  scheduledTime: string;
  reason: string;
}

export interface ProfessionalPreviewSummary {
  professionalId: string;
  professionalName: string;
  councilRegistration: string;
  specialty: string;
  totalSessions: number;
  totalGrossAmount: number;
  items: SettlementPreviewItem[];
  unpricedAlerts: UnpricedAppointmentAlert[];
}

export interface MonthlyPreviewResult {
  periodType: string;
  periodStart: string;
  periodEnd: string;
  year: number;
  month: number;
  totalSessions: number;
  totalGrossAmount: number;
  professionals: ProfessionalPreviewSummary[];
}

export interface CreateContextualPriceInput {
  professionalId: string;
  patientId: string;
  address?: string | null;
  pricePerSession: number;
  notes?: string;
  effectiveFrom?: Date | string;
  effectiveTo?: Date | string;
}

export interface GenerateSettlementInput {
  professionalId: string;
  year: number;
  month: number;
  periodType?: string;
  allowUnpricedOverride?: boolean;
}

export class FinancialService {
  /**
   * Resolução da Matriz Tridimensional de Preços (Profissional x Paciente x Endereço):
   * 1. Correspondência exata de endereço (EXACT_ADDRESS)
   * 2. Preço padrão configurado para o paciente (PATIENT_DEFAULT)
   * 3. Fallback ou alerta de não configurado
   */
  static async resolvePrice(
    professionalId: string,
    patientId: string,
    address?: string | null,
    referenceDate: Date = new Date()
  ): Promise<PricingResolution> {
    const prices = await prisma.contextualPrice.findMany({
      where: {
        professionalId,
        patientId,
        effectiveFrom: { lte: referenceDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: referenceDate } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // 1. Busca por endereço exato se houver endereço especificado
    if (address && address.trim()) {
      const normalizedTarget = address.trim().toLowerCase();
      const exactMatch = prices.find(
        (p) => p.address && p.address.trim().toLowerCase() === normalizedTarget
      );
      if (exactMatch) {
        return {
          chargedAmount: exactMatch.pricePerSession,
          ruleApplied: 'EXACT_ADDRESS',
          contextualPriceId: exactMatch.id
        };
      }
    }

    // 2. Busca por preço padrão do paciente (onde address é null ou vazio)
    const patientDefault = prices.find((p) => !p.address || p.address.trim() === '');
    if (patientDefault) {
      return {
        chargedAmount: patientDefault.pricePerSession,
        ruleApplied: 'PATIENT_DEFAULT',
        contextualPriceId: patientDefault.id
      };
    }

    // 3. Caso não haja regra configurada, retorna alerta
    return {
      chargedAmount: 150.0, // Preço base de referência
      ruleApplied: 'BASE_FALLBACK'
    };
  }

  /**
   * Calcula o intervalo de datas (início e término) de um mês de competência
   */
  static getMonthRange(year: number, month: number): { periodStart: Date; periodEnd: Date } {
    // month: 1 a 12
    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // Último dia do mês
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    return { periodStart, periodEnd };
  }

  /**
   * Gera a prévia do fechamento mensal para conferência (sem persistir nada)
   */
  static async previewMonthlySettlement(params: {
    year: number;
    month: number;
    professionalId?: string;
    periodType?: string;
  }): Promise<MonthlyPreviewResult> {
    const { year, month, professionalId, periodType = 'MONTHLY' } = params;
    const { periodStart, periodEnd } = this.getMonthRange(year, month);

    // Filtro dos profissionais a apurar
    const proWhere: any = {};
    if (professionalId) {
      proWhere.id = professionalId;
    }

    const professionals = await prisma.professional.findMany({
      where: proWhere,
      include: {
        user: true,
        appointments: {
          where: {
            scheduledTime: {
              gte: periodStart,
              lte: periodEnd
            },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
            settlementItem: null // apenas sessões ainda não faturadas
          },
          include: {
            patient: true
          },
          orderBy: { scheduledTime: 'asc' }
        }
      }
    });

    const proSummaries: ProfessionalPreviewSummary[] = [];
    let clinicTotalSessions = 0;
    let clinicTotalGross = 0;

    for (const pro of professionals) {
      const items: SettlementPreviewItem[] = [];
      const unpricedAlerts: UnpricedAppointmentAlert[] = [];
      let proTotalGross = 0;

      for (const apt of pro.appointments) {
        const patientAddress = apt.patient.address || 'Endereço não cadastrado';
        const pricing = await this.resolvePrice(
          pro.id,
          apt.patientId,
          patientAddress,
          apt.scheduledTime
        );

        if (pricing.ruleApplied === 'NOT_CONFIGURED') {
          unpricedAlerts.push({
            appointmentId: apt.id,
            patientId: apt.patientId,
            patientName: apt.patient.name,
            patientAddress,
            scheduledTime: apt.scheduledTime.toISOString(),
            reason: 'Nenhuma precificação configurada na matriz para este paciente/endereço.'
          });
        } else {
          proTotalGross += pricing.chargedAmount;
          items.push({
            appointmentId: apt.id,
            patientId: apt.patientId,
            patientName: apt.patient.name,
            patientAddress,
            scheduledTime: apt.scheduledTime.toISOString(),
            chargedAmount: pricing.chargedAmount,
            ruleApplied: pricing.ruleApplied,
            status: apt.status
          });
        }
      }

      clinicTotalSessions += items.length;
      clinicTotalGross += proTotalGross;

      proSummaries.push({
        professionalId: pro.id,
        professionalName: pro.user.name,
        councilRegistration: pro.crm,
        specialty: pro.specialty,
        totalSessions: items.length,
        totalGrossAmount: Math.round(proTotalGross * 100) / 100,
        items,
        unpricedAlerts
      });
    }

    return {
      periodType,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      year,
      month,
      totalSessions: clinicTotalSessions,
      totalGrossAmount: Math.round(clinicTotalGross * 100) / 100,
      professionals: proSummaries
    };
  }

  /**
   * Consolida e salva o fechamento financeiro em transação ACID com snapshots imutáveis
   */
  static async generateMonthlySettlement(input: GenerateSettlementInput) {
    const { year, month, professionalId, periodType = 'MONTHLY', allowUnpricedOverride = false } = input;
    const { periodStart, periodEnd } = this.getMonthRange(year, month);

    const preview = await this.previewMonthlySettlement({
      year,
      month,
      professionalId,
      periodType
    });

    const proSummary = preview.professionals.find((p) => p.professionalId === professionalId);
    if (!proSummary) {
      throw new Error(`Profissional com ID ${professionalId} não encontrado.`);
    }

    if (proSummary.unpricedAlerts.length > 0 && !allowUnpricedOverride) {
      const pendingNames = Array.from(new Set(proSummary.unpricedAlerts.map((a) => a.patientName))).join(', ');
      throw new Error(
        `Existem ${proSummary.unpricedAlerts.length} atendimentos sem precificação cadastrada para: [${pendingNames}]. Configure a tabela de preços antes de fechar o mês ou utilize allowUnpricedOverride.`
      );
    }

    if (proSummary.items.length === 0) {
      throw new Error('Nenhum atendimento faturável encontrado para este profissional no mês informado.');
    }

    // Persistência em transação ACID
    return prisma.$transaction(async (tx) => {
      const settlement = await tx.financialSettlement.create({
        data: {
          professionalId,
          periodType,
          periodStart,
          periodEnd,
          totalSessions: proSummary.items.length,
          totalGrossAmount: proSummary.totalGrossAmount,
          status: 'DRAFT',
          items: {
            create: proSummary.items.map((item) => ({
              appointmentId: item.appointmentId,
              patientNameSnapshot: item.patientName,
              addressSnapshot: item.patientAddress,
              executedAt: new Date(item.scheduledTime),
              chargedAmount: item.chargedAmount
            }))
          }
        },
        include: {
          items: true,
          professional: {
            include: { user: true }
          }
        }
      });

      return settlement;
    });
  }

  /**
   * Envia o fechamento para revisão do gestor
   */
  static async submitForReview(settlementId: string) {
    const settlement = await prisma.financialSettlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    if (settlement.status !== 'DRAFT') {
      throw new Error(`Apenas fechamentos em 'DRAFT' podem ser enviados para revisão. Status atual: ${settlement.status}`);
    }

    return prisma.financialSettlement.update({
      where: { id: settlementId },
      data: { status: 'PENDING_REVIEW' }
    });
  }

  /**
   * Aprovação formal do fechamento pelo gestor (APPROVED)
   */
  static async approveSettlement(settlementId: string) {
    const settlement = await prisma.financialSettlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    if (settlement.status === 'APPROVED' || settlement.status === 'PAID') {
      throw new Error(`Fechamento já se encontra no status ${settlement.status}.`);
    }

    if (settlement.status === 'CANCELLED') {
      throw new Error('Não é possível aprovar um fechamento cancelado.');
    }

    return prisma.financialSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      }
    });
  }

  /**
   * Liquidação de pagamento ao profissional (PAID)
   */
  static async markAsPaid(settlementId: string, notes?: string) {
    const settlement = await prisma.financialSettlement.findUnique({
      where: { id: settlementId }
    });

    if (!settlement) {
      throw new Error(`Fechamento ${settlementId} não encontrado.`);
    }

    if (settlement.status !== 'APPROVED') {
      throw new Error(`Apenas fechamentos aprovados podem ser marcados como pagos. Status atual: ${settlement.status}`);
    }

    return prisma.financialSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        ...(notes && { notes })
      }
    });
  }

  /**
   * Cancelamento de fechamento financeiro com liberação das sessões
   */
  static async cancelSettlement(settlementId: string) {
    return prisma.$transaction(async (tx) => {
      const settlement = await tx.financialSettlement.findUnique({
        where: { id: settlementId }
      });

      if (!settlement) {
        throw new Error(`Fechamento ${settlementId} não encontrado.`);
      }

      if (settlement.status === 'PAID') {
        throw new Error('Operação negada: não é permitido cancelar um fechamento já liquidado como PAGO.');
      }

      // Remove os itens vinculados para liberar os appointments
      await tx.settlementItem.deleteMany({
        where: { settlementId }
      });

      return tx.financialSettlement.update({
        where: { id: settlementId },
        data: { status: 'CANCELLED' }
      });
    });
  }

  /**
   * Consulta agregada de KPIs e Resumo Financeiro da Clínica
   */
  static async getFinancialSummary(filters: {
    year?: number;
    month?: number;
    professionalId?: string;
  } = {}) {
    const where: any = {};

    if (filters.professionalId) {
      where.professionalId = filters.professionalId;
    }

    if (filters.year && filters.month) {
      const { periodStart, periodEnd } = this.getMonthRange(filters.year, filters.month);
      where.periodStart = { gte: periodStart };
      where.periodEnd = { lte: periodEnd };
    }

    const settlements = await prisma.financialSettlement.findMany({
      where,
      include: {
        professional: {
          include: { user: true }
        }
      }
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
        case 'DRAFT':
          settlementsCount.draft++;
          totalDraftAmount += amount;
          break;
        case 'PENDING_REVIEW':
          settlementsCount.pendingReview++;
          totalDraftAmount += amount;
          break;
        case 'APPROVED':
          settlementsCount.approved++;
          totalApprovedAmount += amount;
          totalGrossSettled += amount;
          totalSessionsCount += s.totalSessions;
          break;
        case 'PAID':
          settlementsCount.paid++;
          totalPaidAmount += amount;
          totalGrossSettled += amount;
          totalSessionsCount += s.totalSessions;
          break;
        case 'CANCELLED':
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
      settlementsCount,
      recentSettlements: settlements.slice(0, 10)
    };
  }

  /**
   * Listagem de fechamentos com filtros
   */
  static async listSettlements(filters: {
    professionalId?: string;
    status?: string;
    periodType?: string;
  } = {}) {
    const where: any = {};
    if (filters.professionalId) where.professionalId = filters.professionalId;
    if (filters.status) where.status = filters.status;
    if (filters.periodType) where.periodType = filters.periodType;

    return prisma.financialSettlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        professional: {
          include: { user: true }
        },
        _count: {
          select: { items: true }
        }
      }
    });
  }

  /**
   * Detalhes de um fechamento específico com todos os itens e snapshots
   */
  static async getSettlementById(settlementId: string) {
    const settlement = await prisma.financialSettlement.findUnique({
      where: { id: settlementId },
      include: {
        professional: {
          include: { user: true }
        },
        items: {
          orderBy: { executedAt: 'asc' },
          include: {
            appointment: true
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
   * CRUD de Preços Contextuais
   */
  static async createContextualPrice(data: CreateContextualPriceInput) {
    return prisma.contextualPrice.create({
      data: {
        professionalId: data.professionalId,
        patientId: data.patientId,
        address: data.address?.trim() || null,
        pricePerSession: data.pricePerSession,
        notes: data.notes,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(0),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
      }
    });
  }

  static async listContextualPrices(filters: { professionalId?: string; patientId?: string } = {}) {
    const where: any = {};
    if (filters.professionalId) where.professionalId = filters.professionalId;
    if (filters.patientId) where.patientId = filters.patientId;

    return prisma.contextualPrice.findMany({
      where,
      include: {
        professional: { include: { user: true } },
        patient: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateContextualPrice(id: string, data: Partial<CreateContextualPriceInput>) {
    return prisma.contextualPrice.update({
      where: { id },
      data: {
        ...(data.pricePerSession !== undefined && { pricePerSession: data.pricePerSession }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.effectiveTo !== undefined && {
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null
        })
      }
    });
  }

  static async deleteContextualPrice(id: string) {
    return prisma.contextualPrice.delete({
      where: { id }
    });
  }
}
