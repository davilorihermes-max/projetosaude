import { describe, it, expect } from 'vitest';
import {
  resolveAddressCoordinates,
  ALL_PRESET_LOCATIONS,
  CITY_COORDINATES_MAP
} from '../src/services/geocodingService.js';
import {
  calculateHaversineDistance,
  evaluateScheduleViability
} from '../src/services/scheduler-engine.js';

describe('Universal Geocoding & Nationwide Routing', () => {
  it('deve resolver coordenadas para Curitiba - PR', async () => {
    const coords = await resolveAddressCoordinates('Av. do Batel, 1500 - Batel, Curitiba - PR');
    expect(coords.latitude).toBeCloseTo(-25.44, 1);
    expect(coords.longitude).toBeCloseTo(-49.28, 1);
  });

  it('deve resolver coordenadas para Rio de Janeiro - RJ', async () => {
    const coords = await resolveAddressCoordinates('Av. Atlântica, 1500 - Copacabana, Rio de Janeiro - RJ');
    expect(coords.latitude).toBeCloseTo(-22.97, 1);
    expect(coords.longitude).toBeCloseTo(-43.18, 1);
  });

  it('deve resolver coordenadas para Belo Horizonte - MG', async () => {
    const coords = await resolveAddressCoordinates('Rua da Bahia, 1800 - Lourdes, Belo Horizonte - MG');
    expect(coords.latitude).toBeCloseTo(-19.92, 1);
    expect(coords.longitude).toBeCloseTo(-43.94, 1);
  });

  it('deve resolver coordenadas para Brasília - DF', async () => {
    const coords = await resolveAddressCoordinates('SHCS EQS 208 - Asa Sul, Brasília - DF');
    expect(coords.latitude).toBeCloseTo(-15.81, 1);
    expect(coords.longitude).toBeCloseTo(-47.90, 1);
  });

  it('deve calcular rota urbana viável dentro de Curitiba', () => {
    // Batel (-25.4428, -49.2889) até Água Verde (-25.4522, -49.2819) (~1.2 km)
    const distanceKm = calculateHaversineDistance(-25.4428, -49.2889, -25.4522, -49.2819);
    expect(distanceKm).toBeGreaterThan(0.8);
    expect(distanceKm).toBeLessThan(2.0);

    const baseCuritiba = { latitude: -25.4428, longitude: -49.2889 };
    const patientCuritiba = { latitude: -25.4522, longitude: -49.2819 };

    const proposedTime = new Date('2026-10-20T10:00:00.000Z');
    const report = evaluateScheduleViability(
      proposedTime,
      45,
      patientCuritiba,
      [],
      baseCuritiba
    );

    expect(report.viable).toBe(true);
    expect(report.distanceKm).toBe(distanceKm);
    expect(report.transitTimeMinutes).toBeLessThan(30);
  });

  it('deve calcular rota urbana viável dentro do Rio de Janeiro', () => {
    // Copacabana (-22.9711, -43.1825) até Ipanema (-22.9844, -43.2003) (~2.3 km)
    const distanceKm = calculateHaversineDistance(-22.9711, -43.1825, -22.9844, -43.2003);
    expect(distanceKm).toBeGreaterThan(1.5);
    expect(distanceKm).toBeLessThan(3.5);

    const baseRio = { latitude: -22.9711, longitude: -43.1825 };
    const patientRio = { latitude: -22.9844, longitude: -43.2003 };

    const proposedTime = new Date('2026-10-20T14:00:00.000Z');
    const report = evaluateScheduleViability(
      proposedTime,
      50,
      patientRio,
      [],
      baseRio
    );

    expect(report.viable).toBe(true);
    expect(report.distanceKm).toBe(distanceKm);
  });
});
