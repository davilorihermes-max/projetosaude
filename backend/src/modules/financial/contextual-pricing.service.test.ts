import { PrismaClient } from '@prisma/client';
import { ContextualPricingService } from './contextual-pricing.service';

/**
 * Testes unitários para o serviço de gestão da matriz de precificação contextual
 */
async function runContextualPricingServiceTests() {
  console.log('🧪 Iniciando testes de gestão da Matriz de Precificação Contextual...');

  const mockProfessionalId = '11111111-1111-1111-1111-111111111111';
  const mockPatientId = '22222222-2222-2222-2222-222222222222';
  const mockAddressId = '33333333-3333-3333-3333-333333333333';
  const alienAddressId = '99999999-9999-9999-9999-999999999999';

  const mockPricesDB: any[] = [];

  const mockPrisma = {
    professional: {
      findUnique: async ({ where }: any) => {
        if (where.id === mockProfessionalId) return { id: mockProfessionalId, name: 'Dr. Roberto' };
        return null;
      }
    },
    patient: {
      findUnique: async ({ where }: any) => {
        if (where.id === mockPatientId) return { id: mockPatientId, fullName: 'Dona Maria' };
        return null;
      }
    },
    patientAddress: {
      findFirst: async ({ where }: any) => {
        if (where.id === mockAddressId && where.patientId === mockPatientId) {
          return { id: mockAddressId, label: 'Casa' };
        }
        return null;
      }
    },
    contextualPrice: {
      findMany: async ({ where }: any) => {
        return mockPricesDB.filter(p =>
          p.professionalId === where.professionalId &&
          p.patientId === where.patientId &&
          p.addressId === where.addressId
        );
      },
      findUnique: async ({ where }: any) => {
        return mockPricesDB.find(p => p.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const created = { id: `rule-${mockPricesDB.length + 1}`, ...data };
        mockPricesDB.push(created);
        return created;
      },
      update: async ({ where, data }: any) => {
        const item = mockPricesDB.find(p => p.id === where.id);
        if (!item) throw new Error('Not found');
        Object.assign(item, data);
        return item;
      },
      delete: async ({ where }: any) => {
        const idx = mockPricesDB.findIndex(p => p.id === where.id);
        if (idx === -1) throw new Error('Not found');
        return mockPricesDB.splice(idx, 1)[0];
      }
    }
  } as unknown as PrismaClient;

  const service = new ContextualPricingService(mockPrisma);

  // 1. Cadastro bem-sucedido de regra por endereço
  const rule1 = await service.createPrice({
    professionalId: mockProfessionalId,
    patientId: mockPatientId,
    addressId: mockAddressId,
    pricePerSession: 210.0,
    effectiveFrom: new Date('2026-01-01'),
    effectiveTo: new Date('2026-06-30'),
    notes: 'Primeiro semestre 2026'
  });

  if (rule1.id !== 'rule-1') {
    throw new Error('Falha ao cadastrar regra 1');
  }
  console.log('  ✅ Regra de preço por endereço específico cadastrada com sucesso.');

  // 2. Bloqueio de endereço que não pertence ao paciente
  let alienAddressBlocked = false;
  try {
    await service.createPrice({
      professionalId: mockProfessionalId,
      patientId: mockPatientId,
      addressId: alienAddressId,
      pricePerSession: 200.0,
      effectiveFrom: new Date('2026-07-01'),
      effectiveTo: null
    });
  } catch (err: any) {
    alienAddressBlocked = true;
    console.log(`  ✅ Bloqueio de integridade territorial funcionou: "${err.message}"`);
  }
  if (!alienAddressBlocked) {
    throw new Error('Falha: Deveria ter impedido associar endereço alheio ao paciente.');
  }

  // 3. Bloqueio de sobreposição de período vigente para a mesma tupla
  let overlapBlocked = false;
  try {
    await service.createPrice({
      professionalId: mockProfessionalId,
      patientId: mockPatientId,
      addressId: mockAddressId,
      pricePerSession: 220.0,
      effectiveFrom: new Date('2026-03-01'), // Dentro do intervalo 2026-01-01 a 2026-06-30 já existente
      effectiveTo: new Date('2026-08-31')
    });
  } catch (err: any) {
    overlapBlocked = true;
    console.log(`  ✅ Bloqueio de conflito de vigência funcionou: "${err.message}"`);
  }
  if (!overlapBlocked) {
    throw new Error('Falha: Deveria ter impedido cadastro com sobreposição de vigência.');
  }

  // 4. Cadastro bem-sucedido para período subsequente
  const rule2 = await service.createPrice({
    professionalId: mockProfessionalId,
    patientId: mockPatientId,
    addressId: mockAddressId,
    pricePerSession: 230.0,
    effectiveFrom: new Date('2026-07-01'),
    effectiveTo: null,
    notes: 'Segundo semestre 2026 em diante'
  });
  if (rule2.id !== 'rule-2') {
    throw new Error('Falha ao cadastrar regra subsequente sem conflito');
  }
  console.log('  ✅ Regra para período subsequente cadastrada sem conflitos.');

  console.log('🎉 Todos os testes de gestão de precificação contextual passaram com sucesso!');
}

runContextualPricingServiceTests().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
