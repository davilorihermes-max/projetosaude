import { describe, it, expect, beforeEach } from 'vitest';
// @ts-ignore
import { getPlannedAppointments, SCALE_STORAGE_KEY } from '../src/components/MonthlyScalePlannerView.jsx';
// @ts-ignore
import { DOCTORS, INITIAL_PATIENTS } from '../src/data/mockData.js';

describe('Integração da Escala Planejada com a Agenda de Atendimentos', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = String(val); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    (globalThis as any).localStorage = mockStorage;
  });

  it('deve gerar sessões da escala planejada e convertê-las para o formato de agendamentos da agenda', () => {
    const plannedAppointments = getPlannedAppointments(INITIAL_PATIENTS, DOCTORS);

    expect(plannedAppointments.length).toBeGreaterThan(0);

    const firstApt = plannedAppointments[0];
    expect(firstApt).toHaveProperty('id');
    expect(firstApt.id.startsWith('apt-plan-')).toBe(true);
    expect(firstApt).toHaveProperty('patientId');
    expect(firstApt).toHaveProperty('doctorId');
    expect(firstApt).toHaveProperty('date');
    expect(firstApt).toHaveProperty('time');
    expect(firstApt).toHaveProperty('durationMinutes');
    expect(firstApt.isPlannedScale).toBe(true);
    expect(firstApt.status).toBe('scheduled');
  });

  it('deve recuperar sessões previamente salvas no SCALE_STORAGE_KEY mantendo fidelidade de rotas', () => {
    // Simula uma escala previamente salva
    const fakePlannedSession = {
      id: 'sess-test-99',
      patientId: 'pat-es-1',
      professionalId: 'prof-es-1',
      date: '2026-10-21',
      time: '08:30',
      status: 'scheduled',
      therapyType: 'Fisioterapia Cardiorrespiratória',
      address: 'Rua Aleixo Netto, 800 - Praia do Canto, Vitória - ES',
      transitTimeMinutes: 12,
      transitKmFromPrevious: 3.5,
      durationMinutes: 45
    };

    localStorage.setItem(
      SCALE_STORAGE_KEY,
      JSON.stringify({
        selectedMonth: '2026-10',
        scaleResult: {
          plannedSessions: [fakePlannedSession]
        }
      })
    );

    const recovered = getPlannedAppointments(INITIAL_PATIENTS, DOCTORS);
    expect(recovered.length).toBe(1);
    expect(recovered[0].id).toBe('apt-plan-sess-test-99');
    expect(recovered[0].patientId).toBe('pat-es-1');
    expect(recovered[0].doctorId).toBe('prof-es-1');
    expect(recovered[0].date).toBe('2026-10-21');
    expect(recovered[0].time).toBe('08:30');
    expect(recovered[0].transitTimeMinutes).toBe(12);
    expect(recovered[0].transitKmFromPrevious).toBe(3.5);
    expect(recovered[0].isPlannedScale).toBe(true);
  });

  it('deve permitir agrupar e navegar pelas datas geradas da escala planejada na agenda', () => {
    const plannedAppointments = getPlannedAppointments(INITIAL_PATIENTS, DOCTORS);
    const dates = Array.from(new Set(plannedAppointments.map((a: any) => a.date))).sort();

    expect(dates.length).toBeGreaterThan(0);
    // Cada data deve conter ao menos 1 atendimento
    dates.forEach((dateStr) => {
      const aptsOnDate = plannedAppointments.filter((a: any) => a.date === dateStr);
      expect(aptsOnDate.length).toBeGreaterThan(0);
    });
  });
});
