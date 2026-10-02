// src/services/geofencing.calculator.ts

export enum CheckInStatus {
  ON_SITE_VALIDATED = 'ON_SITE_VALIDATED',
  OUT_OF_BOUNDS_ACCEPTED = 'OUT_OF_BOUNDS_ACCEPTED',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE'
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface CheckInAssessment {
  status: CheckInStatus;
  distanceMeters: number;
  isWithinGeofence: boolean;
  message: string;
}

export class GeofencingCalculator {
  // Raio de tolerância padrão para validação de presença no local (150 metros)
  public static readonly DEFAULT_GEOFENCE_RADIUS_METERS = 150;

  /**
   * Calcula a distância geodésica em metros entre dois pontos geográficos
   * utilizando a fórmula de Haversine.
   */
  public static calculateDistanceMeters(point1: GeoPoint, point2: GeoPoint): number {
    const EARTH_RADIUS_METERS = 6371000; // Raio médio da Terra em metros

    const dLat = this.deg2rad(point2.latitude - point1.latitude);
    const dLon = this.deg2rad(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(point1.latitude)) *
      Math.cos(this.deg2rad(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = EARTH_RADIUS_METERS * c;

    return Math.round(distanceMeters * 10) / 10;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Avalia a conformidade do check-in com base no raio de geofencing e justificativas.
   */
  public static assessCheckIn(
    checkInLocation: GeoPoint,
    targetAddressLocation: GeoPoint,
    overrideReason?: string,
    isManualOverride?: boolean,
    radiusMeters: number = this.DEFAULT_GEOFENCE_RADIUS_METERS
  ): CheckInAssessment {
    const distanceMeters = this.calculateDistanceMeters(checkInLocation, targetAddressLocation);
    const isWithinGeofence = distanceMeters <= radiusMeters;

    if (isManualOverride) {
      return {
        status: CheckInStatus.MANUAL_OVERRIDE,
        distanceMeters,
        isWithinGeofence,
        message: 'Check-in autorizado por sobreposição manual administrativa.'
      };
    }

    if (isWithinGeofence) {
      return {
        status: CheckInStatus.ON_SITE_VALIDATED,
        distanceMeters,
        isWithinGeofence: true,
        message: `Presença validada no local (${distanceMeters}m do domicílio cadastrado).`
      };
    }

    // Se estiver fora do raio, exige justificativa
    if (overrideReason && overrideReason.trim().length > 0) {
      return {
        status: CheckInStatus.OUT_OF_BOUNDS_ACCEPTED,
        distanceMeters,
        isWithinGeofence: false,
        message: `Check-in fora do raio permitido (${distanceMeters}m), aceito com justificativa: "${overrideReason.trim()}".`
      };
    }

    throw new Error(
      `Check-in fora do raio permitido (${distanceMeters}m de distância, máximo de ${radiusMeters}m). Para registrar fora do local, é obrigatório fornecer uma justificativa (overrideReason).`
    );
  }
}
