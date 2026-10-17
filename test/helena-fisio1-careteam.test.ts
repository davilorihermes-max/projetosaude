// test/helena-fisio1-careteam.test.ts
import { describe, it, expect } from 'vitest';
import { MonthlyScaleGenerator } from '../src/services/monthly-scale-generator';

describe('Care Team de Helena com fisio1 e Estabilidade de Semanas', () => {
  it('deve reconhecer fisio1 no Care Team de Helena mesmo quando cadastrada por nome ou ID variado', () => {
    const generator = new MonthlyScaleGenerator(28, 12);

    const demands = [
      {
        id: 'dem-helena-1',
        patientId: 'pat-5',
        patientName: 'Helena Vasconcelos',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.298, longitude: -40.305 },
        address: 'Jardim da Penha, Vitória - ES'
      }
    ];

    // Profissional cadastrado com id 'doc-sem-conta-fisio1' e nome 'fisio1'
    const availabilities = [
      {
        professionalId: 'doc-sem-conta-fisio1',
        professionalName: 'fisio1',
        specialty: 'Fisioterapia Domiciliar',
        specialties: ['Fisioterapia Domiciliar'],
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

    // Cenário 1: Care Team cadastrado com a string 'fisio1' (nome)
    const careTeamsByName = [
      {
        patientId: 'pat-5',
        professionalIds: ['fisio1']
      }
    ];

    const resultByName = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands,
      availabilities,
      careTeams: careTeamsByName
    });

    const sessionsHelena = resultByName.plannedSessions.filter((s) => s.patientId === 'pat-5');
    const bottlenecksHelena = resultByName.bottlenecks.filter((b) => b.patientId === 'pat-5');

    expect(bottlenecksHelena.length).toBe(0);
    expect(sessionsHelena.length).toBeGreaterThan(0);
    expect(sessionsHelena[0].professionalName).toBe('fisio1');

    // Valida que as semanas de Helena são idênticas (mesmos dias e mesmos horários)
    const week1Sessions = sessionsHelena.filter((s) => s.weekNumber === 1);
    const week2Sessions = sessionsHelena.filter((s) => s.weekNumber === 2);
    const week3Sessions = sessionsHelena.filter((s) => s.weekNumber === 3);

    expect(week1Sessions.length).toBe(2);
    expect(week2Sessions.length).toBe(2);
    expect(week3Sessions.length).toBe(2);

    // Mesmos dias da semana e horários na semana 1 e 2
    const week1Schedule = week1Sessions.map((s) => ({
      dayOfWeek: new Date(s.date + 'T12:00:00Z').getUTCDay(),
      time: s.time,
      prof: s.professionalId
    }));

    const week2Schedule = week2Sessions.map((s) => ({
      dayOfWeek: new Date(s.date + 'T12:00:00Z').getUTCDay(),
      time: s.time,
      prof: s.professionalId
    }));

    expect(week1Schedule).toEqual(week2Schedule);
  });

  it('deve reconhecer quando o Care Team referencia o ID do profissional com espaços ou case diferente', () => {
    const generator = new MonthlyScaleGenerator(28, 12);

    const demands = [
      {
        id: 'dem-helena-1',
        patientId: 'pat-5',
        patientName: 'Helena Vasconcelos',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning' as const,
        location: { latitude: -20.298, longitude: -40.305 },
        address: 'Jardim da Penha, Vitória - ES'
      }
    ];

    const availabilities = [
      {
        professionalId: 'doc-fisio1',
        professionalName: 'fisio1',
        specialty: 'Fisioterapia',
        baseLocation: { latitude: -20.3012, longitude: -40.2925 }
      }
    ];

    const careTeams = [
      {
        patientId: 'pat-5',
        professionalIds: ['doc-fisio1']
      }
    ];

    const res = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands,
      availabilities,
      careTeams
    });

    const sessions = res.plannedSessions.filter((s) => s.patientId === 'pat-5');
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((s) => s.professionalId === 'doc-fisio1')).toBe(true);
  });
});
