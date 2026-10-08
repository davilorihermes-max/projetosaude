// test/scheduler-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  estimateTransitTimeMinutes,
  evaluateScheduleViability,
  ExistingAppointment
} from '../src/services/scheduler-engine.js';

describe('Scheduler Engine - Geodesic & Transit Calculations', () => {
  describe('calculateHaversineDistance', () => {
    it('deve retornar 0 quando as coordenadas de origem e destino forem idênticas', () => {
      const distance = calculateHaversineDistance(-23.561414, -46.655881, -23.561414, -46.655881);
      expect(distance).toBe(0);
    });

    it('deve calcular corretamente a distância entre Av. Paulista (MASP) e Pinheiros (Faria Lima)', () => {
      // MASP: -23.5614, -46.6559
      // Faria Lima / Pinheiros: -23.5673, -46.6934
      const distance = calculateHaversineDistance(-23.5614, -46.6559, -23.5673, -46.6934);
      // Distância geodésica em linha reta ~ 3.9 km
      expect(distance).toBeGreaterThan(3.5);
      expect(distance).toBeLessThan(4.3);
    });

    it('deve ser simétrica (distância de A para B igual a B para A)', () => {
      const d1 = calculateHaversineDistance(-23.5614, -46.6559, -23.6022, -46.6621);
      const d2 = calculateHaversineDistance(-23.6022, -46.6621, -23.5614, -46.6559);
      expect(d1).toBe(d2);
    });

    it('deve calcular corretamente distâncias interestaduais (São Paulo para Rio de Janeiro ~360 km)', () => {
      // SP: -23.5505, -46.6333 | RJ: -22.9068, -43.1729
      const distance = calculateHaversineDistance(-23.5505, -46.6333, -22.9068, -43.1729);
      expect(distance).toBeGreaterThan(350);
      expect(distance).toBeLessThan(370);
    });
  });

  describe('estimateTransitTimeMinutes', () => {
    it('deve retornar 0 para distâncias insignificantes ou no mesmo local', () => {
      expect(estimateTransitTimeMinutes(0.02)).toBe(0);
    });

    it('deve calcular tempo de trânsito considerando velocidade média urbana e margem de buffer', () => {
      // Distância: 15 km
      // Velocidade: 30 km/h -> 30 min de condução + 10 min de buffer = 40 min
      const time = estimateTransitTimeMinutes(15, 30, 10);
      expect(time).toBe(40);
    });

    it('deve aceitar parâmetros customizados de velocidade e buffer', () => {
      // Distância: 20 km
      // Velocidade: 40 km/h -> 30 min de condução + 15 min de buffer = 45 min
      const time = estimateTransitTimeMinutes(20, 40, 15);
      expect(time).toBe(45);
    });
  });

  describe('evaluateScheduleViability', () => {
    const baseClinic = { latitude: -23.561684, longitude: -46.655981 };
    const patientA = { latitude: -23.563099, longitude: -46.654271 }; // Perto da clínica (~200m)
    const patientB = { latitude: -23.567300, longitude: -46.693400 }; // Pinheiros (~3.9km)

    it('deve aprovar agendamento viável sem conflitos de horário e com tempo hábil de trânsito', () => {
      const existing: ExistingAppointment[] = [
        {
          id: 'appt-1',
          scheduledTime: new Date('2026-09-27T08:00:00Z'),
          durationMinutes: 45,
          latitude: baseClinic.latitude,
          longitude: baseClinic.longitude
        }
      ];

      // Proposto para as 10:00 (1h15 após término do appt-1)
      const proposedTime = new Date('2026-09-27T10:00:00Z');
      const report = evaluateScheduleViability(proposedTime, 45, patientA, existing, baseClinic);

      expect(report.viable).toBe(true);
      expect(report.estimatedTravelWindow).toBeDefined();
    });

    it('deve reprovar agendamento que colida diretamente com horário de consulta existente (Overlap)', () => {
      const existing: ExistingAppointment[] = [
        {
          id: 'appt-conflict-1',
          scheduledTime: new Date('2026-09-27T09:00:00Z'),
          durationMinutes: 60 // 09:00 às 10:00
        }
      ];

      // Proposto para 09:30 (dentro do intervalo do appt-conflict-1)
      const proposedTime = new Date('2026-09-27T09:30:00Z');
      const report = evaluateScheduleViability(proposedTime, 45, patientA, existing);

      expect(report.viable).toBe(false);
      expect(report.conflictWithAppointmentId).toBe('appt-conflict-1');
      expect(report.reason).toContain('Conflito de horário');
    });

    it('deve reprovar quando não houver tempo suficiente para o deslocamento após a consulta anterior', () => {
      const existing: ExistingAppointment[] = [
        {
          id: 'appt-prev',
          scheduledTime: new Date('2026-09-27T09:00:00Z'),
          durationMinutes: 45, // Termina às 09:45 na Paulista
          latitude: -23.5614,
          longitude: -46.6559
        }
      ];

      // Proposto em Pinheiros (3.9 km -> aprox 18 min de trânsito) às 09:50 (apenas 5 min após o término)
      const proposedTime = new Date('2026-09-27T09:50:00Z');
      const report = evaluateScheduleViability(proposedTime, 45, patientB, existing);

      expect(report.viable).toBe(false);
      expect(report.conflictWithAppointmentId).toBe('appt-prev');
      expect(report.reason).toContain('Tempo de deslocamento insuficiente');
    });

    it('deve reprovar quando a nova consulta não permitir tempo hábil para chegar ao próximo compromisso', () => {
      const existing: ExistingAppointment[] = [
        {
          id: 'appt-next',
          scheduledTime: new Date('2026-09-27T11:00:00Z'), // Começa às 11:00 em Pinheiros
          durationMinutes: 45,
          latitude: patientB.latitude,
          longitude: patientB.longitude
        }
      ];

      // Proposta na Paulista das 10:10 às 10:55 (termina 10:55, apenas 5 min para percorrer 3.9 km)
      const proposedTime = new Date('2026-09-27T10:10:00Z');
      const report = evaluateScheduleViability(proposedTime, 45, patientA, existing);

      expect(report.viable).toBe(false);
      expect(report.conflictWithAppointmentId).toBe('appt-next');
      expect(report.reason).toContain('Tempo insuficiente para chegar ao próximo atendimento');
    });
  });
});
