// mobile/src/services/geofence.ts
import * as Location from 'expo-location';
import { GeoLocation, CheckInAssessment, CheckInStatus } from '../types';

export const EARTH_RADIUS_METERS = 6371000;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 150; // Tolerância máxima em metros para domicílio
export const URBAN_TORTUOSITY_FACTOR = 1.25; // Fator de tortuosidade urbana para estimativa de rota

/**
 * Calcula a distância geodésica linear (Haversine) em metros entre dois pontos
 */
export function calculateHaversineDistanceMeters(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const lat1 = toRad(point1.latitude);
  const lon1 = toRad(point1.longitude);
  const lat2 = toRad(point2.latitude);
  const lon2 = toRad(point2.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Estima a distância urbana real de deslocamento aplicando fator de tortuosidade
 */
export function estimateUrbanDistanceKm(
  point1: GeoLocation,
  point2: GeoLocation
): number {
  const linearMeters = calculateHaversineDistanceMeters(point1, point2);
  const urbanMeters = linearMeters * URBAN_TORTUOSITY_FACTOR;
  return Number((urbanMeters / 1000).toFixed(1));
}

/**
 * Avalia se o profissional está dentro do raio permitido de geofencing no domicílio
 */
export function evaluateGeofence(
  professionalCoords: GeoLocation,
  patientCoords: GeoLocation,
  allowedRadiusMeters: number = DEFAULT_GEOFENCE_RADIUS_METERS
): {
  distanceMeters: number;
  isWithinGeofence: boolean;
  status: CheckInStatus;
  message: string;
} {
  const distanceMeters = calculateHaversineDistanceMeters(
    professionalCoords,
    patientCoords
  );
  const isWithinGeofence = distanceMeters <= allowedRadiusMeters;

  if (isWithinGeofence) {
    return {
      distanceMeters,
      isWithinGeofence: true,
      status: 'ON_SITE_VALIDATED',
      message: `Presença confirmada no domicílio (${distanceMeters}m do ponto de atendimento).`,
    };
  }

  return {
    distanceMeters,
    isWithinGeofence: false,
    status: 'OUT_OF_BOUNDS_ACCEPTED',
    message: `Fora do perímetro permitido (${distanceMeters}m > ${allowedRadiusMeters}m). Justificativa obrigatória.`,
  };
}

/**
 * Obtém a localização GPS atual do dispositivo via expo-location com fallback seguro
 */
export async function getCurrentDeviceLocation(
  fallbackCoords?: GeoLocation
): Promise<{ location: GeoLocation; fromGps: boolean; error?: string }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return {
        location: fallbackCoords || { latitude: -23.563099, longitude: -46.654271 },
        fromGps: false,
        error: 'Permissão de localização GPS não concedida. Utilizando simulação.',
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      location: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      fromGps: true,
    };
  } catch (err: any) {
    return {
      location: fallbackCoords || { latitude: -23.563099, longitude: -46.654271 },
      fromGps: false,
      error: err?.message || 'Falha ao obter sinal de satélite GPS.',
    };
  }
}
