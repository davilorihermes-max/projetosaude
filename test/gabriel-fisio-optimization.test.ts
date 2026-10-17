// test/gabriel-fisio-optimization.test.ts
import { describe, it, expect } from 'vitest';
import { MonthlyScaleGenerator } from '../src/services/monthly-scale-generator';

describe('Diagnóstico da Alocação de Gabriel e fisio1', () => {
  it('deve diagnosticar por que Gabriel não atinge as metas quando outros pacientes disputam a manhã', () => {
    const generator = new MonthlyScaleGenerator(28, 12);

    // Pacientes padrão como no sistema: Mariana, Roberto, Juliana e Gabriel
    const demands = [
      {
        id: 'dem-pat-1-1',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.3012, longitude: -40.2925 },
        address: 'Praia do Canto, Vitória - ES'
      },
      {
        id: 'dem-pat-2-1',
        patientId: 'pat-2',
        patientName: 'Roberto Carlos Peixoto',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.2915, longitude: -40.302 },
        address: 'Jardim da Penha, Vitória - ES'
      },
      {
        id: 'dem-pat-3-1',
        patientId: 'pat-3',
        patientName: 'Juliana Mendes Prado',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.315, longitude: -40.312 },
        address: 'Bento Ferreira, Vitória - ES'
      },
      {
        id: 'dem-pat-4-1',
        patientId: 'pat-4',
        patientName: 'Gabriel Santos Oliveira',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.3205, longitude: -40.3375 },
        address: 'Centro, Vitória - ES'
      }
    ];

    // Profissional fisio1 com horário 08:00 às 18:00
    const availabilities = [
      {
        professionalId: 'doc-fisio1',
        professionalName: 'fisio1',
        specialty: 'Fisioterapia Motora',
        specialties: ['Fisioterapia Motora'],
        baseLocation: { latitude: -20.3012, longitude: -40.2925 },
        weekdayWindows: {
          1: { enabled: true, startTime: '08:00', endTime: '18:00' },
          2: { enabled: true, startTime: '08:00', endTime: '18:00' },
          3: { enabled: true, startTime: '08:00', endTime: '18:00' },
          4: { enabled: true, startTime: '08:00', endTime: '18:00' },
          5: { enabled: true, startTime: '08:00', endTime: '18:00' }
        }
      }
    ];

    const careTeams = [
      { patientId: 'pat-1', professionalIds: ['doc-fisio1'] },
      { patientId: 'pat-2', professionalIds: ['doc-fisio1'] },
      { patientId: 'pat-3', professionalIds: ['doc-fisio1'] },
      { patientId: 'pat-4', professionalIds: ['doc-fisio1'] }
    ];

    const res = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands,
      availabilities,
      careTeams
    });

    const gabrielSessions = res.plannedSessions.filter((s) => s.patientId === 'pat-4');
    const gabrielCoverage = res.coverageReports.find((c) => c.patientId === 'pat-4');
    const gabrielBottlenecks = res.bottlenecks.filter((b) => b.patientId === 'pat-4');

    console.log('--- RESULTADO DO DIAGNÓSTICO ---');
    console.log('Total de sessões de Gabriel alocadas:', gabrielSessions.length);
    console.log('Cobertura de Gabriel:', gabrielCoverage);
    console.log('Gargalos de Gabriel:', gabrielBottlenecks);
    for (let w = 1; w <= 5; w++) {
      console.log(`\n--- Semana ${w} ---`);
      res.plannedSessions
        .filter((s) => s.weekNumber === w)
        .forEach((s) => {
          console.log(`  ${s.date} (dia da sem: ${new Date(s.date + 'T12:00:00').getDay()}) ${s.time} - ${s.patientName} (${s.professionalName})`);
        });
    }

    // Queremos que Gabriel atinja 100% de cobertura (8 sessões no mês de 4 semanas com 2/sem)
    expect(gabrielCoverage?.coveragePercent).toBe(100);
  });
});
