import { PrismaClient, ContextualPrice } from '@prisma/client';
import { CreateContextualPriceInput, UpdateContextualPriceInput } from './financial.schemas';

export interface ContextualPriceFilter {
  professionalId?: string;
  patientId?: string;
  onlyActive?: boolean;
  referenceDate?: Date;
}

export class ContextualPricingService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Cadastra uma nova regra na matriz de precificação contextual (Profissional x Paciente x Endereço).
   * Validações de Integridade:
   * 1. Existência de profissional e paciente.
   * 2. Caso addressId seja informado, garante que o endereço pertence legitimamente ao paciente.
   * 3. Previne sobreposição de períodos de vigência para a mesma tupla (profissional, paciente, endereço).
   */
  public async createPrice(input: CreateContextualPriceInput): Promise<ContextualPrice> {
    // 1. Valida existência do profissional
    const professional = await this.prisma.professional.findUnique({
      where: { id: input.professionalId }
    });
    if (!professional) {
      throw new Error(`Profissional com ID ${input.professionalId} não encontrado.`);
    }

    // 2. Valida existência do paciente
    const patient = await this.prisma.patient.findUnique({
      where: { id: input.patientId }
    });
    if (!patient) {
      throw new Error(`Paciente com ID ${input.patientId} não encontrado.`);
    }

    // 3. Valida se o endereço pertence ao paciente (se informado)
    if (input.addressId) {
      const address = await this.prisma.patientAddress.findFirst({
        where: {
          id: input.addressId,
          patientId: input.patientId
        }
      });
      if (!address) {
        throw new Error(
          `Endereço ${input.addressId} não pertence ao paciente informado (${patient.fullName}).`
        );
      }
    }

    // 4. Previne sobreposição de vigência para a mesma combinação
    await this.validateNoOverlappingRules({
      professionalId: input.professionalId,
      patientId: input.patientId,
      addressId: input.addressId ?? null,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null
    });

    // 5. Persiste o preço contextual
    return this.prisma.contextualPrice.create({
      data: {
        professionalId: input.professionalId,
        patientId: input.patientId,
        addressId: input.addressId ?? null,
        pricePerSession: input.pricePerSession,
        notes: input.notes,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null
      }
    });
  }

  /**
   * Atualiza valor, observação ou encerra a vigência de uma regra de preço existente.
   */
  public async updatePrice(
    priceId: string,
    input: UpdateContextualPriceInput
  ): Promise<ContextualPrice> {
    const existing = await this.prisma.contextualPrice.findUnique({
      where: { id: priceId }
    });

    if (!existing) {
      throw new Error(`Regra de preço contextual ${priceId} não encontrada.`);
    }

    if (input.effectiveTo && input.effectiveTo < existing.effectiveFrom) {
      throw new Error('A data final de vigência não pode ser anterior à data de início da regra.');
    }

    return this.prisma.contextualPrice.update({
      where: { id: priceId },
      data: {
        ...(input.pricePerSession !== undefined && { pricePerSession: input.pricePerSession }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.effectiveTo !== undefined && { effectiveTo: input.effectiveTo })
      }
    });
  }

  /**
   * Encerra a vigência de uma regra na data de hoje (ou em data especificada),
   * preservando o histórico para apurações retroativas.
   */
  public async expirePrice(priceId: string, expireAt: Date = new Date()): Promise<ContextualPrice> {
    return this.updatePrice(priceId, { effectiveTo: expireAt });
  }

  /**
   * Remove fisicamente uma regra caso tenha sido cadastrada por engano e não possua histórico relevante.
   */
  public async deletePrice(priceId: string): Promise<ContextualPrice> {
    const existing = await this.prisma.contextualPrice.findUnique({
      where: { id: priceId }
    });

    if (!existing) {
      throw new Error(`Regra de preço contextual ${priceId} não encontrada.`);
    }

    return this.prisma.contextualPrice.delete({
      where: { id: priceId }
    });
  }

  /**
   * Lista as regras de precificação com filtros opcionais.
   */
  public async listPrices(filters: ContextualPriceFilter = {}): Promise<ContextualPrice[]> {
    const where: any = {};

    if (filters.professionalId) {
      where.professionalId = filters.professionalId;
    }

    if (filters.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters.onlyActive) {
      const refDate = filters.referenceDate || new Date();
      where.effectiveFrom = { lte: refDate };
      where.OR = [
        { effectiveTo: null },
        { effectiveTo: { gte: refDate } }
      ];
    }

    return this.prisma.contextualPrice.findMany({
      where,
      orderBy: [
        { effectiveFrom: 'desc' }
      ]
    });
  }

  /**
   * Verifica se há sobreposição temporal entre a nova regra e regras já existentes.
   */
  private async validateNoOverlappingRules(params: {
    professionalId: string;
    patientId: string;
    addressId: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    excludeId?: string;
  }): Promise<void> {
    const existingRules = await this.prisma.contextualPrice.findMany({
      where: {
        professionalId: params.professionalId,
        patientId: params.patientId,
        addressId: params.addressId,
        ...(params.excludeId && { id: { not: params.excludeId } })
      }
    });

    for (const rule of existingRules) {
      const ruleStart = rule.effectiveFrom;
      const ruleEnd = rule.effectiveTo || new Date('9999-12-31');
      const newStart = params.effectiveFrom;
      const newEnd = params.effectiveTo || new Date('9999-12-31');

      // Dois intervalos [A, B] e [C, D] se sobrepõem se max(A, C) <= min(B, D)
      const maxStart = newStart > ruleStart ? newStart : ruleStart;
      const minEnd = newEnd < ruleEnd ? newEnd : ruleEnd;

      if (maxStart <= minEnd) {
        throw new Error(
          `Conflito de vigência: já existe uma regra de preço (${rule.id}) vigente entre ` +
          `${ruleStart.toISOString().split('T')[0]} e ` +
          `${rule.effectiveTo ? rule.effectiveTo.toISOString().split('T')[0] : 'indeterminado'} ` +
          `para a mesma combinação de profissional, paciente e endereço.`
        );
      }
    }
  }
}
