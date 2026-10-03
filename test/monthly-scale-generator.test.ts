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
  const locMoema = { latitude: -23.602200, longitude: -46.662100 }; // ~4.5km

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

  const mockAvailabilities: ProfessionalAvailability[] = [
    {
      professionalId: 'doc-3',
      professionalName: 'Dr. Rafael Fontes',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      availableDaysOfWeek: [2, 4], // Terça e Quinta
      shifts: ['morning'],
      baseLocation: locPaulista,
      maxDailySessions: 4
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
      month: 10, // Outubro 2026
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

  it('deve alocar ambos os pacientes quando ambos possuem o profissional no Care Team', () => {
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

    const marianaSessions = result.plannedSessions.filter((s) => s.patientId === 'pat-1');
    const robertoSessions = result.plannedSessions.filter((s) => s.patientId === 'pat-2');

    expect(marianaSessions.length).toBeGreaterThan(0);
    expect(robertoSessions.length).toBeGreaterThan(0);

    // Cada sessão deve possuir cálculo de distância e tempo de trânsito
    result.plannedSessions.forEach((session) => {
      expect(session.transitTimeMinutes).toBeGreaterThanOrEqual(0);
      expect(session.transitKmFromPrevious).toBeGreaterThanOrEqual(0);
    });

    // Todas as sessões devem ocorrer em Terça (2) ou Quinta (4)
    result.plannedSessions.forEach((session) => {
      const d = new Date(session.date + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay();
      expect([2, 4]).toContain(dayOfWeek);
    });
  });

  it('deve calcular corretamente a taxa de cobertura de metas terapêuticas', () => {
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

    const reportMariana = result.coverageReports.find((r) => r.patientId === 'pat-1');
    expect(reportMariana).toBeDefined();
    expect(reportMariana!.weeklyTarget).toBe(2);
    expect(reportMariana!.coveragePercent).toBeGreaterThan(70);

    expect(result.summary.totalDemandedSessions).toBeGreaterThan(0);
    expect(result.summary.totalAllocatedSessions).toBeGreaterThan(0);
    expect(result.summary.globalCoveragePercent).toBeGreaterThan(50);
  });
});
