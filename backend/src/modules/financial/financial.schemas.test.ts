import {
  createContextualPriceSchema,
  previewSettlementSchema,
  cancelSettlementSchema
} from './financial.schemas';

function runSchemaTests() {
  console.log('🧪 Iniciando testes de validação com Schemas Zod...');

  // 1. Validação de Preço Contextual Válido
  const validPriceInput = {
    professionalId: '11111111-1111-1111-1111-111111111111',
    patientId: '22222222-2222-2222-2222-222222222222',
    addressId: '33333333-3333-3333-3333-333333333333',
    pricePerSession: 190.0,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    notes: 'Valor negociado com a família'
  };
  const parsedPrice = createContextualPriceSchema.safeParse(validPriceInput);
  if (!parsedPrice.success) {
    throw new Error(`Falha ao validar preço correto: ${JSON.stringify(parsedPrice.error.format())}`);
  }
  console.log('  ✅ Schema de criação de preço contextual validou payload correto.');

  // 2. Rejeição de Valor Negativo ou Zero
  const invalidNegativePrice = {
    ...validPriceInput,
    pricePerSession: -50.0
  };
  const parsedNegative = createContextualPriceSchema.safeParse(invalidNegativePrice);
  if (parsedNegative.success) {
    throw new Error('Falha: Deveria ter rejeitado valor negativo por sessão.');
  }
  console.log('  ✅ Schema rejeitou corretamente valor de sessão negativo.');

  // 3. Rejeição de Data Final Anterior à Inicial
  const invalidDatePrice = {
    ...validPriceInput,
    effectiveFrom: '2026-12-31',
    effectiveTo: '2026-01-01'
  };
  const parsedInvalidDate = createContextualPriceSchema.safeParse(invalidDatePrice);
  if (parsedInvalidDate.success) {
    throw new Error('Falha: Deveria ter rejeitado effectiveTo anterior a effectiveFrom.');
  }
  console.log('  ✅ Schema rejeitou corretamente effectiveTo < effectiveFrom.');

  // 4. Validação de Prévia de Fechamento com Datas Válidas
  const validPreview = {
    professionalId: '11111111-1111-1111-1111-111111111111',
    periodType: 'MONTHLY',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    scheduleTypeFilter: 'ALL'
  };
  const parsedPreview = previewSettlementSchema.safeParse(validPreview);
  if (!parsedPreview.success) {
    throw new Error(`Falha ao validar preview correto: ${JSON.stringify(parsedPreview.error.format())}`);
  }
  console.log('  ✅ Schema de preview validou payload mensal com sucesso.');

  // 5. Rejeição de Justificativa de Cancelamento Muito Curta
  const invalidCancel = {
    settlementId: '11111111-1111-1111-1111-111111111111',
    reason: 'abc' // menos de 5 caracteres
  };
  const parsedCancel = cancelSettlementSchema.safeParse(invalidCancel);
  if (parsedCancel.success) {
    throw new Error('Falha: Deveria ter rejeitado justificativa de cancelamento curta demais.');
  }
  console.log('  ✅ Schema de cancelamento rejeitou justificativa com menos de 5 caracteres.');

  console.log('🎉 Todos os testes de validação Zod passaram com sucesso!');
}

runSchemaTests();
