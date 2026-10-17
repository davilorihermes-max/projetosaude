// test/stable-weekly-routine.test.ts
import { describe, it, expect } from 'vitest';
import { MonthlyScaleGenerator } from '../src/services/monthly-scale-generator';

describe('Estabilidade e Repetição Idêntica das Semanas na Escala Mensal', () => {
  it('deve manter dias da semana, horários e profissionais fixos entre semanas para cada paciente', () => {
    const generator = new MonthlyScaleGenerator(28, 12);

    const demands = [
      {
        id: 'dem-1',
        patientId: 'pat-mariana',
        patientName: 'Mariana',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.315, longitude: -40.312 },
        address: 'Bento Ferreira, Vitória - ES'
      },
      {
        id: 'dem-2',
        patientId: 'pat-roberto',
        patientName: 'Roberto',
        therapyType: 'Fisioterapia Motora',
        sessionsPerWeek: 3,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.308, longitude: -40.301 },
        address: 'Praia do Canto, Vitória - ES'
      }
    ];

    const availabilities = [
      {
        professionalId: 'fisio-1',
        professionalName: 'Fisioterapeuta 1',
        specialty: 'Fisioterapia Motora',
        baseLocation: { latitude: -20.3012, longitude: -40.2925 }
      },
      {
        professionalId: 'fisio-2',
        professionalName: 'Fisioterapeuta 2',
        specialty: 'Fisioterapia Motora',
        baseLocation: { latitude: -20.3012, longitude: -40.2925 }
      }
    ];

    const careTeams = [
      { patientId: 'pat-mariana', professionalIds: ['fisio-1', 'fisio-2'] },
      { patientId: 'pat-roberto', professionalIds: ['fisio-1', 'fisio-2'] }
    ];

    const result = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands,
      availabilities,
      careTeams
    });

    expect(result.plannedSessions.length).toBeGreaterThan(0);

    // Para Mariana: compara a rotina da Semana 1 com a Semana 2, 3 e 4
    const getWeekSummary = (patientId: string, week: number) => {
      return result.plannedSessions
        .filter((s) => s.patientId === patientId && s.weekNumber === week)
        .map((s) => ({
          dayOfWeek: new Date(s.date + 'T12:00:00Z').getUTCDay(),
          time: s.time,
          professionalId: s.professionalId
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    };

    // Teste com mês iniciando em Segunda-feira (Junho de 2026) para que todas as semanas sejam completas
    const resultJune = generator.generateMonthlyScale({
      year: 2026,
      month: 6,
      demands,
      availabilities,
      careTeams
    });

    const getJuneWeekSummary = (patientId: string, week: number) => {
      return resultJune.plannedSessions
        .filter((s) => s.patientId === patientId && s.weekNumber === week)
        .map((s) => ({
          dayOfWeek: new Date(s.date + 'T12:00:00Z').getUTCDay(),
          time: s.time,
          professionalId: s.professionalId
        }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    };

    for (const pat of ['pat-mariana', 'pat-roberto']) {
      const w1 = getJuneWeekSummary(pat, 1);
      const w2 = getJuneWeekSummary(pat, 2);
      const w3 = getJuneWeekSummary(pat, 3);
      const w4 = getJuneWeekSummary(pat, 4);

      expect(w1.length).toBeGreaterThan(0);
      expect(w2).toEqual(w1);
      expect(w3).toEqual(w1);
      expect(w4).toEqual(w1);
    }
  });
});
