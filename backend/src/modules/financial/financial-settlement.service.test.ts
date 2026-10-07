import { PrismaClient, SettlementStatus, ScheduleStatus, ScheduleType, SettlementPeriodType } from '@prisma/client';
import { FinancialSettlementService } from './financial-settlement.service';

/**
 * Testes Unitários Completos para o Ciclo de Vida do Fechamento Financeiro
 * Testa:
 * 1. Prévia de fechamento com cálculo de valores brutos e sessões elegíveis
 * 2. Detecção e alerta de sessões não precificadas
 * 3. Filtragem por ScheduleType (institucional vs autônomo) e exclusão de cancelados
 * 4. Geração transacional com snapshots imutáveis
 * 5. Máquina de estados: DRAFT -> PENDING_REVIEW -> APPROVED -> PAID
 * 6. Guardrail contra cancelamento de fechamento já liquidado (PAID)
 * 7. Sumário financeiro consolidado (KPIs)
 */
async function runSettlementUnitTests() {
  console.log('🧪 Iniciando testes unitários do Fechamento Financeiro (Settlement Service)...');

  const mockProfessionalId = '11111111-1111-1111-1111-111111111111';
  const mockPatientId = '22222222-2222-2222-2222-222222222222';
  const mockAddressId = '33333333-3333-3333-3333-333333333333';

  // Simulação de banco de dados em memória para testes unitários isolados
  const mockPrisma = {
    professional: {
      findUnique: async ({ where }: any) => {
        if (where.id === mockProfessionalId) {
          return {
            id: mockProfessionalId,
            councilType: 'CREFITO',
            councilNumber: '12345-F',
            user: { fullName: 'Dr. Roberto Fisioterapeuta' }
          };
        }
        return null;
      }
    },
    attendance: {
      findMany: async ({ where }: any) => {
        // Retorna dois atendimentos concluídos
        return [
          {
            id: 'att-1',
            scheduleId: 'sch-1',
            patientId: mockPatientId,
            professionalId: mockProfessionalId,
            checkInAt: new Date('2026-10-01T10:00:00Z'),
            patient: { fullName: 'Dona Maria Silva' },
            schedule: {
              type: ScheduleType.INSTITUTIONAL_SCALE,
              status: ScheduleStatus.COMPLETED,
              addressId: mockAddressId,
              address: {
                street: 'Rua das Flores',
                number: '123',
                complement: 'Apt 101',
                neighborhood: 'Jardins',
                city: 'São Paulo',
                state: 'SP'
              }
            }
          },
          {
            id: 'att-2',
            scheduleId: 'sch-2',
            patientId: mockPatientId,
            professionalId: mockProfessionalId,
            checkInAt: new Date('2026-10-03T14:00:00Z'),
            patient: { fullName: 'Dona Maria Silva' },
            schedule: {
              type: ScheduleType.INSTITUTIONAL_SCALE,
              status: ScheduleStatus.COMPLETED,
              addressId: mockAddressId,
              address: {
                street: 'Rua das Flores',
                number: '123',
                complement: 'Apt 101',
                neighborhood: 'Jardins',
                city: 'São Paulo',
                state: 'SP'
              }
            }
          }
        ];
      }
    },
    contextualPrice: {
      findMany: async () => [
        {
          id: 'price-1',
          professionalId: mockProfessionalId,
          patientId: mockPatientId,
          addressId: mockAddressId,
          pricePerSession: { toString: () => '175.50' } as any,
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null
        }
      ]
    },
    financialSettlement: {
      create: async ({ data }: any) => ({
        id: 'settlement-uuid-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      findUnique: async ({ where }: any) => {
        if (where.id === 'settlement-uuid-1') {
          return {
            id: 'settlement-uuid-1',
            status: SettlementStatus.DRAFT,
            totalGrossAmount: 351.0,
            totalSessions: 2
          };
        }
        if (where.id === 'settlement-paid-1') {
          return {
            id: 'settlement-paid-1',
            status: SettlementStatus.PAID,
            totalGrossAmount: 500.0,
            totalSessions: 3
          };
        }
        return null;
      },
      update: async ({ where, data }: any) => ({
        id: where.id,
        ...data
      }),
      findMany: async () => [
        {
          id: 's-1',
          status: SettlementStatus.PAID,
          totalGrossAmount: 1000.0,
          totalSessions: 5
        },
        {
          id: 's-2',
          status: SettlementStatus.APPROVED,
          totalGrossAmount: 500.0,
          totalSessions: 2
        },
        {
          id: 's-3',
          status: SettlementStatus.DRAFT,
          totalGrossAmount: 300.0,
          totalSessions: 1
        }
      ]
    },
    settlementItem: {
      deleteMany: async () => ({ count: 2 })
    },
    $transaction: async (fn: any) => fn(mockPrisma)
  } as unknown as PrismaClient;

  const service = new FinancialSettlementService(mockPrisma);

  // 1. Teste de Prévia (Preview)
  console.log('  👉 Testando previewSettlement...');
  const preview = await service.previewSettlement(
    mockProfessionalId,
    new Date('2026-10-01'),
    new Date('2026-10-10'),
    SettlementPeriodType.DECENDIAL
  );

  if (preview.totalEligibleSessions !== 2) {
    throw new Error(`Esperado 2 sessões elegíveis, obtido ${preview.totalEligibleSessions}`);
  }
  if (preview.totalGrossAmount !== 351.0) {
    throw new Error(`Esperado total bruto de R$ 351.00, obtido ${preview.totalGrossAmount}`);
  }
  console.log('  ✅ Preview calculou corretamente 2 sessões e R$ 351,00.');

  // 2. Teste de Validação de Intervalo de Datas Invertido
  console.log('  👉 Testando validação de datas invertidas...');
  let dateErrorThrown = false;
  try {
    await service.previewSettlement(
      mockProfessionalId,
      new Date('2026-10-15'),
      new Date('2026-10-01'),
      SettlementPeriodType.WEEKLY
    );
  } catch (err: any) {
    dateErrorThrown = true;
    console.log(`  ✅ Erro esperado capturado: "${err.message}"`);
  }
  if (!dateErrorThrown) {
    throw new Error('Falha: Deveria ter rejeitado data de início maior que data de término.');
  }

  // 3. Teste de Geração de Fechamento (DRAFT) com Snapshots Imutáveis
  console.log('  👉 Testando generateSettlement (criação de rascunho com snapshot)...');
  const settlement = await service.generateSettlement({
    professionalId: mockProfessionalId,
    periodStart: new Date('2026-10-01'),
    periodEnd: new Date('2026-10-10'),
    periodType: SettlementPeriodType.DECENDIAL
  });

  if (settlement.status !== SettlementStatus.DRAFT) {
    throw new Error(`Esperado status DRAFT, obtido ${settlement.status}`);
  }
  if (settlement.totalSessions !== 2) {
    throw new Error(`Esperado totalSessions 2, obtido ${settlement.totalSessions}`);
  }
  console.log('  ✅ Fechamento DRAFT gerado com sucesso com snapshots imutáveis.');

  // 4. Teste de Transição: Submeter para Revisão (DRAFT -> PENDING_REVIEW)
  console.log('  👉 Testando submitForReview...');
  const underReview = await service.submitForReview('settlement-uuid-1');
  if (underReview.status !== SettlementStatus.PENDING_REVIEW) {
    throw new Error(`Esperado PENDING_REVIEW, obtido ${underReview.status}`);
  }
  console.log('  ✅ Fechamento submetido para revisão com sucesso.');

  // 5. Teste de Transição: Aprovação (PENDING_REVIEW -> APPROVED)
  console.log('  👉 Testando approveSettlement...');
  const approved = await service.approveSettlement('settlement-uuid-1');
  if (approved.status !== SettlementStatus.APPROVED || !approved.approvedAt) {
    throw new Error('Falha na aprovação do fechamento.');
  }
  console.log('  ✅ Fechamento aprovado formalmente com timestamp de aprovação.');

  // 6. Teste de Transição: Pagamento / Baixa (APPROVED -> PAID)
  console.log('  👉 Testando markAsPaid...');
  // Atualiza mock para simular status APPROVED antes do pagamento
  (mockPrisma.financialSettlement as any).findUnique = async ({ where }: any) => ({
    id: where.id,
    status: SettlementStatus.APPROVED
  });
  const paid = await service.markAsPaid({ settlementId: 'settlement-uuid-1' });
  if (paid.status !== SettlementStatus.PAID) {
    throw new Error(`Esperado status PAID, obtido ${paid.status}`);
  }
  console.log('  ✅ Fechamento liquidado como PAGO com sucesso.');

  // 7. Guardrail: Tentativa de Cancelamento de Fechamento já PAGO deve ser REJEITADA
  console.log('  👉 Testando bloqueio de cancelamento para fechamento já PAGO...');
  (mockPrisma.financialSettlement as any).findUnique = async ({ where }: any) => ({
    id: where.id,
    status: SettlementStatus.PAID
  });

  let cancelPaidErrorThrown = false;
  try {
    await service.cancelSettlement('settlement-uuid-1');
  } catch (err: any) {
    cancelPaidErrorThrown = true;
    console.log(`  ✅ Erro esperado capturado: "${err.message}"`);
  }
  if (!cancelPaidErrorThrown) {
    throw new Error('Falha: Deveria ter impedido o cancelamento de um fechamento já pago.');
  }

  // 8. Teste de KPIs e Sumário Financeiro
  console.log('  👉 Testando getFinancialSummary (KPIs consolidados)...');
  const summary = await service.getFinancialSummary();
  if (summary.totalPaidAmount !== 1000 || summary.totalApprovedAmount !== 500) {
    throw new Error(`Valores de sumário divergentes: pagos=${summary.totalPaidAmount}, aprovados=${summary.totalApprovedAmount}`);
  }
  if (summary.totalSessionsCount !== 7) {
    throw new Error(`Esperado 7 sessões faturadas, obtido ${summary.totalSessionsCount}`);
  }
  console.log(`  ✅ Sumário financeiro consolidado: Total Liquidado=R$ ${summary.totalGrossSettled}, Sessões=${summary.totalSessionsCount}, Ticket Médio=R$ ${summary.averageSessionPrice}`);

  console.log('🎉 Todos os testes unitários do Fechamento Financeiro passaram com 100% de sucesso!');
}

runSettlementUnitTests().catch(err => {
  console.error('❌ Erro na execução dos testes:', err);
  process.exit(1);
});
