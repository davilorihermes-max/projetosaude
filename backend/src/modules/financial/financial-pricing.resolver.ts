import { PrismaClient, ContextualPrice } from '@prisma/client';
import { PricingResolution } from './financial.types';

export class ContextualPricingResolver {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolve o preço de uma sessão aplicando a matriz multidimensional de regras:
   * 1. Prioridade Máxima: Preço específico para o Profissional + Paciente + Endereço do atendimento.
   * 2. Prioridade Secundária: Preço específico para o Profissional + Paciente (sem restrição de endereço, addressId = null).
   * 3. Fallback: Caso não haja regra cadastrada vigente para a data da sessão, retorna NOT_CONFIGURED.
   */
  public async resolvePrice(
    professionalId: string,
    patientId: string,
    addressId: string,
    sessionDate: Date
  ): Promise<PricingResolution> {
    // Busca todas as regras de precificação vigentes para este par profissional-paciente
    const candidatePrices = await this.prisma.contextualPrice.findMany({
      where: {
        professionalId,
        patientId,
        effectiveFrom: { lte: sessionDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: sessionDate } }
        ]
      },
      orderBy: {
        effectiveFrom: 'desc'
      }
    });

    return this.evaluateBestMatchingPrice(candidatePrices, addressId);
  }

  /**
   * Método puro para avaliar os candidatos de preço em memória (útil também para testes unitários isolados).
   */
  public evaluateBestMatchingPrice(
    candidatePrices: ContextualPrice[],
    targetAddressId: string
  ): PricingResolution {
    // 1. Tenta correspondência exata de endereço
    const exactAddressMatch = candidatePrices.find(
      p => p.addressId !== null && p.addressId === targetAddressId
    );

    if (exactAddressMatch) {
      return {
        chargedAmount: Number(exactAddressMatch.pricePerSession),
        ruleApplied: 'EXACT_ADDRESS',
        contextualPriceId: exactAddressMatch.id
      };
    }

    // 2. Tenta regra padrão para o paciente (sem endereço especificado)
    const patientDefaultMatch = candidatePrices.find(
      p => p.addressId === null
    );

    if (patientDefaultMatch) {
      return {
        chargedAmount: Number(patientDefaultMatch.pricePerSession),
        ruleApplied: 'PATIENT_DEFAULT',
        contextualPriceId: patientDefaultMatch.id
      };
    }

    // 3. Nenhuma regra cadastrada
    return {
      chargedAmount: 0,
      ruleApplied: 'NOT_CONFIGURED'
    };
  }
}
