// test/load-balancing-professionals.test.ts
import { describe, it, expect } from 'vitest';
import { MonthlyScaleGenerator, PatientTherapyDemand, ProfessionalAvailability, CareTeamRelation } from '../src/services/monthly-scale-generator.js';

describe('Balanceamento de Carga entre Profissionais', () => {
  it('deve distribuir os atendimentos de forma equilibrada entre múltiplos profissionais da mesma especialidade', () => {
    const generator = new MonthlyScaleGenerator(30, 15);

    // 2 Fisioterapeutas disponíveis de Segunda a Sexta das 08:00 às 18:00
    const availabilities: ProfessionalAvailability[] = [
      {
        professionalId: 'fisio-1',
        professionalName: 'Dr. Lucas Silveira',
        specialty: 'Fisioterapia',
        specialties: ['Fisioterapia'],
        baseLocation: { latitude: -20.3155, longitude: -40.3128 },
        weekdayWindows: {
          1: { enabled: true, startTime: '08:00', endTime: '18:00' },
          2: { enabled: true, startTime: '08:00', endTime: '18:00' },
          3: { enabled: true, startTime: '08:00', endTime: '18:00' },
          4: { enabled: true, startTime: '08:00', endTime: '18:00' },
          5: { enabled: true, startTime: '08:00', endTime: '18:00' }
        }
      },
      {
        professionalId: 'fisio-2',
        professionalName: 'Dra. Beatriz Santos',
        specialty: 'Fisioterapia',
        specialties: ['Fisioterapia'],
        baseLocation: { latitude: -20.3160, longitude: -40.3130 },
        weekdayWindows: {
          1: { enabled: true, startTime: '08:00', endTime: '18:00' },
          2: { enabled: true, startTime: '08:00', endTime: '18:00' },
          3: { enabled: true, startTime: '08:00', endTime: '18:00' },
          4: { enabled: true, startTime: '08:00', endTime: '18:00' },
          5: { enabled: true, startTime: '08:00', endTime: '18:00' }
        }
      }
    ];

    // 4 Pacientes que precisam de Fisioterapia 2x por semana
    const demands: PatientTherapyDemand[] = [
      {
        id: 'dem-1',
        patientId: 'pat-1',
        patientName: 'Paciente Alfa',
        therapyType: 'Fisioterapia',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'any',
        location: { latitude: -20.318, longitude: -40.315 },
        address: 'Bairro A'
      },
      {
        id: 'dem-2',
        patientId: 'pat-2',
        patientName: 'Paciente Beta',
        therapyType: 'Fisioterapia',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'any',
        location: { latitude: -20.320, longitude: -40.316 },
        address: 'Bairro B'
      },
      {
        id: 'dem-3',
        patientId: 'pat-3',
        patientName: 'Paciente Gama',
        therapyType: 'Fisioterapia',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'any',
        location: { latitude: -20.322, longitude: -40.317 },
        address: 'Bairro C'
      },
      {
        id: 'dem-4',
        patientId: 'pat-4',
        patientName: 'Paciente Delta',
        therapyType: 'Fisioterapia',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        preferredShift: 'any',
        location: { latitude: -20.324, longitude: -40.318 },
        address: 'Bairro D'
      }
    ];

    // Ambos os profissionais estão autorizados no Care Team de todos os 4 pacientes
    const careTeams: CareTeamRelation[] = [
      { patientId: 'pat-1', professionalIds: ['fisio-1', 'fisio-2'] },
      { patientId: 'pat-2', professionalIds: ['fisio-1', 'fisio-2'] },
      { patientId: 'pat-3', professionalIds: ['fisio-1', 'fisio-2'] },
      { patientId: 'pat-4', professionalIds: ['fisio-1', 'fisio-2'] }
    ];

    const result = generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands,
      availabilities,
      careTeams
    });

    const sessionsFisio1 = result.plannedSessions.filter((s) => s.professionalId === 'fisio-1').length;
    const sessionsFisio2 = result.plannedSessions.filter((s) => s.professionalId === 'fisio-2').length;
    const totalSessions = result.plannedSessions.length;

    console.log(`Total de sessões: ${totalSessions} | Fisio 1: ${sessionsFisio1} | Fisio 2: ${sessionsFisio2}`);

    // Ambos devem receber sessões
    expect(sessionsFisio1).toBeGreaterThan(0);
    expect(sessionsFisio2).toBeGreaterThan(0);

    // A diferença entre eles não deve exceder um limiar razoável (distribuição equilibrada)
    const difference = Math.abs(sessionsFisio1 - sessionsFisio2);
    expect(difference).toBeLessThanOrEqual(4);
  });
});
