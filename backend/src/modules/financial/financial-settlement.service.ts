import { PrismaClient, SettlementStatus } from '@prisma/client';
import { ContextualPricingResolver } from './financial-pricing.resolver';
import {
  GenerateSettlementInput,
  SettlementPreviewItem,
  SettlementPreviewResult,
  UnpricedAttendanceAlert
} from './financial.types';

export class FinancialSettlementService {
  private readonly pricingResolver: ContextualPricingResolver;

  constructor(private readonly prisma: PrismaClient) {
    this.pricingResolver = new ContextualPricingResolver(prisma);
  }

  /**
   * Realiza uma prévia do fechamento financeiro sem persistir nada no banco de dados.
   * Permite ao gestor conferir as sessões executadas, valores calculados e eventuais pendências de tabela de preço.
   */
  public async previewSettlement(
    professionalId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: GenerateSettlementInput['periodType']
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

    // 2. Busca todos os atendimentos realizados no período que ainda não foram liquidados
    const eligibleAttendances = await this.prisma.attendance.findMany({
      where: {
        professionalId,
        checkInAt: {
          gte: periodStart,
          lte: periodEnd
        },
        settlementItem: null // Garante que a sessão não foi faturada anteriormente
      },
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
          ruleApplied: pricing.ruleApplied
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
      totalEligibleSessions: items.length,
      totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
      items,
      unpricedAttendances
    };
  }

  /**
   * Consolida e salva o fechamento financeiro com snapshots imutáveis em transação ACID.
   */
  public async generateSettlement(input: GenerateSettlementInput) {
    const preview = await this.previewSettlement(
      input.professionalId,
      input.periodStart,
      input.periodEnd,
      input.periodType
    );

    // Validação estrita de pendências de precificação
    if (preview.unpricedAttendances.length > 0 && !input.allowUnpricedOverride) {
      const pendingPatients = Array.from(new Set(preview.unpricedAttendances.map(p => p.patientName))).join(', ');
      throw new Error(
        `Impossível gerar fechamento financeiro: existem ${preview.unpricedAttendances.length} sessões sem precificação configurada para os pacientes: [${pendingPatients}]. Configure a tabela de preços ou use 'allowUnpricedOverride: true'.`
      );
    }

    if (preview.items.length === 0) {
      throw new Error('Nenhuma sessão elegível com valor precificado encontrada para o período informado.');
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
          items: true
        }
      });

      return settlement;
    });
  }

  /**
   * Aprova formalmente um fechamento em rascunho ou revisão.
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
   * Cancela um fechamento financeiro e remove os snapshots para liberar os atendimentos para nova apuração.
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
        throw new Error('Não é permitido cancelar um fechamento que já foi marcado como PAGO.');
      }

      // Deleta os itens do fechamento para liberar a unicidade de attendanceId
      await tx.settlementItem.deleteMany({
        where: { settlementId }
      });

      // Atualiza o fechamento para CANCELLED
      return tx.financialSettlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.CANCELLED
        }
      });
    });
  }
}
