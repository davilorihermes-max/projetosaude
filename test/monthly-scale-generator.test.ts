// test/monthly-scale-generator.test.ts
import { describe, it, expect } from 'vitest';
import {
  MonthlyScaleGenerator,
  PatientTherapyDemand,
  ProfessionalAvailability,
  CareTeamRelation
} from '../src/services/monthly-scale-generator.js';

describe('MonthlyScaleGenerator - Planejador de Escala Mensal Inteligente', () => {
  const generator = new MonthlyScaleGenerator(30, 10);

  // Coordenadas em São Paulo
  const locPaulista = { latitude: -23.561684, longitude: -46.655981 };
  const locCerqueiraCesar = { latitude: -23.563099, longitude: -46.654271 }; // ~200m da Paulista
  const locPinheiros = { latitude: -23.567300, longitude: -46.693400 }; // ~3.9km da Paulista

  const mockDemands: PatientTherapyDemand[] = [
    {
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning',
      location: locCerqueiraCesar,
      address: 'Alameda Santos, 1000 - Cerqueira César'
    },
    {
      patientId: 'pat-2',
      patientName: 'Roberto Carlos Peixoto',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning',
      location: locPinheiros,
      address: 'Rua Fradique Coutinho, 500 - Pinheiros'
    }
  ];

  // Profissional configurado com janelas de horário específicas por dia da semana
  const mockAvailabilities: ProfessionalAvailability[] = [
    {
      professionalId: 'doc-3',
      professionalName: 'Dr. Rafael Fontes',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      baseLocation: locPaulista,
      weekdayWindows: {
        1: { enabled: false, startTime: '08:00', endTime: '12:00' }, // Seg: Folga / outros pacientes
        2: { enabled: true, startTime: '08:00', endTime: '13:00' },  // Ter: Manhã até 13:00
        3: { enabled: false, startTime: '08:00', endTime: '12:00' }, // Qua: Folga
        4: { enabled: true, startTime: '08:00', endTime: '13:00' },  // Qui: Manhã até 13:00
        5: { enabled: false, startTime: '08:00', endTime: '12:00' }  // Sex: Folga
      }
    }
  ];

  it('deve gerar escala mensal respeitando estritamente a autorização do Care Team', () => {
    // Apenas Mariana tem Rafael no Care Team; Roberto NÃO tem
    const careTeams: CareTeamRelation[] = [
      { patientId: 'pat-1', professionalIds: ['doc-3'] },
      { patientId: 'pat-2', professionalIds: [] } // Roberto sem fisioterapeuta no Care Team
    ];

    const result = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: mockDemands,
      availabilities: mockAvailabilities,
      careTeams
    });

    // Mariana deve ter sessões alocadas
    const marianaSessions = result.plannedSessions.filter((s) => s.patientId === 'pat-1');
    expect(marianaSessions.length).toBeGreaterThan(0);
    marianaSessions.forEach((s) => {
      expect(s.professionalId).toBe('doc-3');
    });

    // Roberto NUNCA pode ter sessões com doc-3 pois não está no Care Team
    const robertoSessions = result.plannedSessions.filter((s) => s.patientId === 'pat-2');
    expect(robertoSessions.length).toBe(0);

    // Roberto deve ter gargalos registrados apontando ausência de Care Team
    const robertoBottlenecks = result.bottlenecks.filter((b) => b.patientId === 'pat-2');
    expect(robertoBottlenecks.length).toBeGreaterThan(0);
    expect(robertoBottlenecks[0].reason).toBe('NO_CARE_TEAM_SPECIALIST');
  });

  it('deve respeitar a janela de horário de início e fim da jornada diária do profissional', () => {
    const careTeams: CareTeamRelation[] = [
      { patientId: 'pat-1', professionalIds: ['doc-3'] },
      { patientId: 'pat-2', professionalIds: ['doc-3'] }
    ];

    const result = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: mockDemands,
      availabilities: mockAvailabilities,
      careTeams
    });

    // Rafael só atende Ter (2) e Qui (4) das 08:00 às 13:00
    result.plannedSessions.forEach((session) => {
      const d = new Date(session.date + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay();
      expect([2, 4]).toContain(dayOfWeek);

      const [hours, mins] = session.time.split(':').map(Number);
      const startMin = hours * 60 + mins;
      const endMin = startMin + session.durationMinutes;

      // Deve iniciar a partir das 08:00 (480 min) e terminar antes ou até 13:00 (780 min)
      expect(startMin).toBeGreaterThanOrEqual(8 * 60);
      expect(endMin).toBeLessThanOrEqual(13 * 60);
    });
  });

  it('deve suportar até 3 demandas terapêuticas por paciente sem sobreposição de horários', () => {
    // Paciente Mariana com 3 terapias diferentes:
    const multiDemands: PatientTherapyDemand[] = [
      {
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning',
        location: locCerqueiraCesar,
        address: 'Alameda Santos, 1000'
      },
      {
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        therapyType: 'Fonoaudiologia Domiciliar',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'morning',
        location: locCerqueiraCesar,
        address: 'Alameda Santos, 1000'
      },
      {
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        therapyType: 'Enfermagem Estomaterapeuta & Curativos',
        sessionsPerWeek: 1,
        durationMinutes: 45,
        preferredShift: 'afternoon',
        location: locCerqueiraCesar,
        address: 'Alameda Santos, 1000'
      }
    ];

    const multiAvailabilities: ProfessionalAvailability[] = [
      {
        professionalId: 'doc-3',
        professionalName: 'Dr. Rafael Fontes',
        specialty: 'Fisioterapia Cardiorrespiratória & Motora',
        baseLocation: locPaulista,
        weekdayWindows: {
          2: { enabled: true, startTime: '08:00', endTime: '12:00' },
          4: { enabled: true, startTime: '08:00', endTime: '12:00' }
        }
      },
      {
        professionalId: 'doc-fono',
        professionalName: 'Dra. Aline Castro',
        specialty: 'Fonoaudiologia Domiciliar',
        baseLocation: locPaulista,
        weekdayWindows: {
          2: { enabled: true, startTime: '09:00', endTime: '13:00' },
          4: { enabled: true, startTime: '09:00', endTime: '13:00' }
        }
      },
      {
        professionalId: 'doc-4',
        professionalName: 'Dra. Camila Nogueira',
        specialty: 'Enfermagem Estomaterapeuta & Curativos',
        baseLocation: locPaulista,
        weekdayWindows: {
          3: { enabled: true, startTime: '13:30', endTime: '18:00' }
        }
      }
    ];

    const careTeams: CareTeamRelation[] = [
      { patientId: 'pat-1', professionalIds: ['doc-3', 'doc-fono', 'doc-4'] }
    ];

    const result = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: multiDemands,
      availabilities: multiAvailabilities,
      careTeams
    });

    const marianaSessions = result.plannedSessions.filter((s) => s.patientId === 'pat-1');
    expect(marianaSessions.length).toBeGreaterThan(0);

    // Valida que em qualquer dia com mais de 1 terapia para Mariana, NÃO há sobreposição de horário!
    const sessionsByDate = new Map<string, typeof marianaSessions>();
    marianaSessions.forEach((s) => {
      if (!sessionsByDate.has(s.date)) sessionsByDate.set(s.date, []);
      sessionsByDate.get(s.date)!.push(s);
    });

    sessionsByDate.forEach((daySessions, date) => {
      for (let i = 0; i < daySessions.length; i++) {
        for (let j = i + 1; j < daySessions.length; j++) {
          const s1 = daySessions[i];
          const s2 = daySessions[j];

          const [h1, m1] = s1.time.split(':').map(Number);
          const start1 = h1 * 60 + m1;
          const end1 = start1 + s1.durationMinutes;

          const [h2, m2] = s2.time.split(':').map(Number);
          const start2 = h2 * 60 + m2;
          const end2 = start2 + s2.durationMinutes;

          const hasOverlap = Math.max(start1, start2) < Math.min(end1, end2);
          expect(hasOverlap, `Sobreposição detectada em ${date} entre ${s1.therapyType} (${s1.time}) e ${s2.therapyType} (${s2.time})`).toBe(false);
        }
      }
    });
  });
});
