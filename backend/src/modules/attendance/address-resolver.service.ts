import { PrismaClient } from '@prisma/client';
import { ResolvedAddressInfo } from './attendance.types';

export class AddressResolverService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Determina qual o endereço ativo de um paciente em uma data específica.
   * Regra de Negócio:
   * 1. Verifica se existe uma exceção cadastrada em `PatientAddressOverride` para o dia.
   *    (Exemplo: O paciente normalmente é atendido em casa, mas nesta terça-feira está na casa dos avós ou na clínica).
   * 2. Caso não haja exceção na data, utiliza o endereço marcado como padrão (`isDefault = true`).
   * 3. Caso não haja endereço padrão explicitado, utiliza o primeiro endereço cadastrado.
   */
  public async resolveActiveAddressForDate(
    patientId: string,
    targetDate: Date
  ): Promise<ResolvedAddressInfo> {
    // Normaliza para o início do dia UTC/Local para comparação com o tipo Date do Postgres
    const dateStart = new Date(targetDate);
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);

    // 1. Checa se há calendário de exceção para o paciente nesta data
    const override = await this.prisma.patientAddressOverride.findFirst({
      where: {
        patientId,
        overrideDate: {
          gte: dateStart,
          lte: dateEnd
        }
      },
      include: {
        address: true
      }
    });

    if (override && override.address) {
      const addr = override.address;
      return {
        addressId: addr.id,
        label: addr.label,
        street: addr.street,
        number: addr.number,
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state,
        location: {
          latitude: Number(addr.latitude),
          longitude: Number(addr.longitude)
        },
        isOverride: true,
        overrideReason: override.reason || 'Endereço de exceção programado para a data'
      };
    }

    // 2. Busca endereço padrão (isDefault = true)
    let standardAddress = await this.prisma.patientAddress.findFirst({
      where: {
        patientId,
        isDefault: true
      }
    });

    // 3. Fallback: Primeiro endereço cadastrado
    if (!standardAddress) {
      standardAddress = await this.prisma.patientAddress.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'asc' }
      });
    }

    if (!standardAddress) {
      throw new Error(`Paciente ${patientId} não possui nenhum endereço cadastrado no sistema.`);
    }

    return {
      addressId: standardAddress.id,
      label: standardAddress.label,
      street: standardAddress.street,
      number: standardAddress.number,
      neighborhood: standardAddress.neighborhood,
      city: standardAddress.city,
      state: standardAddress.state,
      location: {
        latitude: Number(standardAddress.latitude),
        longitude: Number(standardAddress.longitude)
      },
      isOverride: false
    };
  }
}
