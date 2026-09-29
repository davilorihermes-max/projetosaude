import { ContextualPrice, PrismaClient } from '@prisma/client';
import { ContextualPricingResolver } from './financial-pricing.resolver';

function runPricingUnitTests() {
  console.log('🧪 Iniciando testes unitários de Precificação Contextual...');
  const resolver = new ContextualPricingResolver({} as PrismaClient);

  const mockAddress1 = '11111111-1111-1111-1111-111111111111';
  const mockAddress2 = '22222222-2222-2222-2222-222222222222';
  const otherAddress = '33333333-3333-3333-3333-333333333333';

  const mockCandidatePrices: ContextualPrice[] = [
    {
      id: 'price-1-address-specific',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      addressId: mockAddress1,
      pricePerSession: { toString: () => '220.00' } as any,
      notes: 'Atendimento Domiciliar Zona Sul',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null
    },
    {
      id: 'price-2-patient-default',
      professionalId: 'prof-1',
      patientId: 'patient-1',
      addressId: null, // Padrão para qualquer outro endereço do paciente
      pricePerSession: { toString: () => '180.00' } as any,
      notes: 'Valor padrão do paciente',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null
    }
  ];

  // Caso 1: Endereço com valor diferenciado (mockAddress1) -> deve retornar 220.00 (EXACT_ADDRESS)
  const result1 = resolver.evaluateBestMatchingPrice(mockCandidatePrices, mockAddress1);
  if (result1.chargedAmount !== 220 || result1.ruleApplied !== 'EXACT_ADDRESS') {
    throw new Error(`Falha no Caso 1: esperado 220 (EXACT_ADDRESS), obtido ${result1.chargedAmount} (${result1.ruleApplied})`);
  }
  console.log('  ✅ Caso 1: Correspondência exata de endereço (Prioridade 1) validada com sucesso (R$ 220).');

  // Caso 2: Endereço sem valor específico (mockAddress2) -> deve fazer fallback para o padrão do paciente (180.00)
  const result2 = resolver.evaluateBestMatchingPrice(mockCandidatePrices, mockAddress2);
  if (result2.chargedAmount !== 180 || result2.ruleApplied !== 'PATIENT_DEFAULT') {
    throw new Error(`Falha no Caso 2: esperado 180 (PATIENT_DEFAULT), obtido ${result2.chargedAmount} (${result2.ruleApplied})`);
  }
  console.log('  ✅ Caso 2: Fallback para valor padrão do paciente (Prioridade 2) validado com sucesso (R$ 180).');

  // Caso 3: Paciente sem nenhuma regra cadastrada
  const result3 = resolver.evaluateBestMatchingPrice([], otherAddress);
  if (result3.ruleApplied !== 'NOT_CONFIGURED' || result3.chargedAmount !== 0) {
    throw new Error(`Falha no Caso 3: esperado NOT_CONFIGURED, obtido ${result3.ruleApplied}`);
  }
  console.log('  ✅ Caso 3: Alerta de regra não configurada disparado corretamente.');

  console.log('🎉 Todos os testes de precificação passaram com sucesso!');
}

runPricingUnitTests();
