// backend/src/modules/scheduling/scale-persistence.service.test.ts
import { ScalePersistenceService } from './scale-persistence.service';
import { CommitMonthlyScaleInput } from './scheduling.types';
import { PrismaClient, ScheduleStatus, ScheduleType } from '@prisma/client';

export async function runScalePersistenceUnitTests() {
  console.log('🧪 Iniciando testes unitários do ScalePersistenceService (PostgreSQL + Prisma)...');

  const mockPatientId = 'pat-uuid-001';
  const mockProfId = 'prof-uuid-001';
  const mockAddressId = 'addr-uuid-001';
  const mockUnauthorizedProfId = 'prof-unauth-999';

  const validSessions = [
    {
      patientId: mockPatientId,
      professionalId: mockProfId,
      date: '2026-10-14',
      time: '09:00',
      durationMinutes: 45,
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora'
    },
    {
      patientId: mockPatientId,
      professionalId: mockProfId,
      date: '2026-10-16',
      time: '14:00',
      durationMinutes: 45,
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora'
    }
  ];

  // Mock do PrismaClient com banco em memória/espelho
  const createMockPrisma = (opts: {
    hasCareTeam?: boolean;
    hasAddress?: boolean;
  }) => {
    const deletedRecords: any[] = [];
    const createdRecords: any[] = [];

    const mockPrisma = {
      careTeamMember: {
        findMany: async ({ where }: any) => {
          if (opts.hasCareTeam !== false) {
            return [
              {
                id: 'ct-1',
                patientId: mockPatientId,
                professionalId: mockProfId,
                isActive: true
              }
            ];
          }
          return [];
        }
      },
      patientAddress: {
        findMany: async ({ where }: any) => {
          if (opts.hasAddress !== false) {
            return [
              {
                id: mockAddressId,
                patientId: mockPatientId,
                isDefault: true,
                street: 'Alameda Santos',
                number: '1000'
              }
            ];
          }
          return [];
        }
      },
      schedule: {
        deleteMany: async (args: any) => {
          deletedRecords.push(args);
          return { count: 1 };
        },
        create: async ({ data }: any) => {
          const rec = { id: `sch-${createdRecords.length + 1}`, ...data };
          createdRecords.push(rec);
          return rec;
        },
        findMany: async () => createdRecords
      },
      $transaction: async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }
    } as unknown as PrismaClient & {
      _getCreated: () => any[];
      _getDeleted: () => any[];
    };

    (mockPrisma as any)._getCreated = () => createdRecords;
    (mockPrisma as any)._getDeleted = () => deletedRecords;

    return mockPrisma;
  };

  // Teste 1: Bloqueio estrito se o profissional NÃO pertencer ao Care Team (Regra de Ouro)
  {
    const mockPrisma = createMockPrisma({ hasCareTeam: false });
    const service = new ScalePersistenceService(mockPrisma);

    let errorThrown = false;
    try {
      await service.commitMonthlyScale({
        year: 2026,
        month: 10,
        sessions: validSessions
      });
    } catch (err: any) {
      errorThrown = true;
      if (!err.message.includes('Regra de Ouro (Care Team)')) {
        throw new Error(`Mensagem inesperada de erro: ${err.message}`);
      }
      console.log(`  ✅ Regra de Ouro validada: Persistência bloqueada para profissional fora do Care Team.`);
    }

    if (!errorThrown) {
      throw new Error('Falha no Teste 1: Deveria ter bloqueado agendamento fora do Care Team!');
    }
  }

  // Teste 2: Bloqueio se o paciente não tiver endereço cadastrado para atendimento domiciliar
  {
    const mockPrisma = createMockPrisma({ hasCareTeam: true, hasAddress: false });
    const service = new ScalePersistenceService(mockPrisma);

    let errorThrown = false;
    try {
      await service.commitMonthlyScale({
        year: 2026,
        month: 10,
        sessions: validSessions
      });
    } catch (err: any) {
      errorThrown = true;
      if (!err.message.includes('patient_addresses')) {
        throw new Error(`Mensagem inesperada de erro: ${err.message}`);
      }
      console.log(`  ✅ Validação de Endereço: Persistência bloqueada quando paciente não possui endereço.`);
    }

    if (!errorThrown) {
      throw new Error('Falha no Teste 2: Deveria ter exigido endereço para home care!');
    }
  }

  // Teste 3: Persistência com Sucesso no PostgreSQL via Transação Atômica e Lote (batchId)
  {
    const mockPrisma = createMockPrisma({ hasCareTeam: true, hasAddress: true });
    const service = new ScalePersistenceService(mockPrisma);

    const result = await service.commitMonthlyScale({
      year: 2026,
      month: 10,
      sessions: validSessions,
      overwriteExisting: true
    });

    if (!result.success || result.committedCount !== 2) {
      throw new Error(`Falha no Teste 3: Esperado 2 agendamentos salvos, obtido ${result.committedCount}`);
    }

    if (!result.batchId) {
      throw new Error('Falha no Teste 3: batchId deve ser preenchido.');
    }

    const created = (mockPrisma as any)._getCreated();
    if (created.length !== 2) {
      throw new Error(`Esperado 2 registros criados no banco, obtido ${created.length}`);
    }

    // Valida propriedades dos registros persistidos
    const firstSchedule = created[0];
    if (firstSchedule.type !== ScheduleType.INSTITUTIONAL_SCALE) {
      throw new Error(`Esperado ScheduleType INSTITUTIONAL_SCALE, obtido ${firstSchedule.type}`);
    }
    if (firstSchedule.status !== ScheduleStatus.SCHEDULED) {
      throw new Error(`Esperado ScheduleStatus SCHEDULED, obtido ${firstSchedule.status}`);
    }
    if (firstSchedule.addressId !== mockAddressId) {
      throw new Error(`Esperado addressId '${mockAddressId}', obtido ${firstSchedule.addressId}`);
    }
    if (firstSchedule.batchId !== result.batchId) {
      throw new Error('batchId no registro do banco não coincide com o retornado no resultado.');
    }

    console.log(`  ✅ Transação Atômica: ${result.committedCount} agendamentos persistidos com batchId '${result.batchId}'.`);

    // Valida que overwriteExisting executou deleteMany para limpar agendamentos antigos do mesmo mês
    const deleted = (mockPrisma as any)._getDeleted();
    if (deleted.length === 0) {
      throw new Error('overwriteExisting deveria ter chamado deleteMany para garantir idempotência!');
    }
    console.log(`  ✅ Idempotência validada: Remoção prévia de agendamentos pendentes do mesmo mês realizada.`);
  }

  console.log('🎉 Todos os testes unitários do ScalePersistenceService passaram com sucesso!');
}

// Execução direta quando rodado via tsx
runScalePersistenceUnitTests().catch((err) => {
  console.error('❌ Erro nos testes de persistência da escala:', err);
  process.exit(1);
});
