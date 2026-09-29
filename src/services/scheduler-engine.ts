// src/services/scheduler-engine.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ExistingAppointment {
  id: string;
  scheduledTime: Date;
  durationMinutes: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ScheduleViabilityReport {
  viable: boolean;
  reason?: string;
  conflictWithAppointmentId?: string;
  distanceKm?: number;
  transitTimeMinutes?: number;
  bufferMinutes?: number;
  estimatedTravelWindow?: {
    departureTime: Date;
    arrivalTime: Date;
  };
}

/**
 * Fórmula de Haversine para cálculo da distância geodésica em quilômetros
 * entre dois pontos geográficos (latitude e longitude)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const EARTH_RADIUS_KM = 6371; // Raio médio da Terra em km

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return parseFloat(distance.toFixed(3)); // Retorna com precisão de metros
}

/**
 * Estima o tempo de deslocamento em trânsito urbano em minutos
 * @param distanceKm Distância em km
 * @param averageSpeedKmh Velocidade média em trânsito urbano (default: 30 km/h)
 * @param bufferMinutes Margem de segurança / estacionamento / elevador (default: 10 min)
 */
export function estimateTransitTimeMinutes(
  distanceKm: number,
  averageSpeedKmh: number = 30,
  bufferMinutes: number = 10
): number {
  if (distanceKm <= 0.05) {
    return 0; // Mesmo local físico ou menos de 50 metros
  }

  const travelTimeHours = distanceKm / averageSpeedKmh;
  const travelTimeMinutes = travelTimeHours * 60;

  return Math.ceil(travelTimeMinutes + bufferMinutes);
}

/**
 * Avalia se o horário proposto para atendimento é viável considerando
 * sobreposição de horários e tempo de deslocamento até o local do paciente
 */
export function evaluateScheduleViability(
  proposedTime: Date,
  durationMinutes: number,
  patientLocation: Coordinates,
  existingAppointments: ExistingAppointment[],
  professionalBaseLocation?: Coordinates | null,
  averageSpeedKmh: number = 30,
  bufferMinutes: number = 10
): ScheduleViabilityReport {
  const proposedStart = new Date(proposedTime).getTime();
  const proposedEnd = proposedStart + durationMinutes * 60 * 1000;

  // 1. Checagem de sobreposição direta (Overlap) com atendimentos existentes
  for (const appt of existingAppointments) {
    const apptStart = new Date(appt.scheduledTime).getTime();
    const apptEnd = apptStart + appt.durationMinutes * 60 * 1000;

    // Dois intervalos se sobrepõem se max(start1, start2) < min(end1, end2)
    const hasOverlap = Math.max(proposedStart, apptStart) < Math.min(proposedEnd, apptEnd);

    if (hasOverlap) {
      return {
        viable: false,
        reason: `Conflito de horário com atendimento já existente (ID: ${appt.id}) das ${new Date(apptStart).toISOString().substring(11, 16)} às ${new Date(apptEnd).toISOString().substring(11, 16)}.`,
        conflictWithAppointmentId: appt.id
      };
    }
  }

  // 2. Ordena os atendimentos existentes cronologicamente
  const sorted = [...existingAppointments].sort(
    (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
  );

  // 3. Localiza o atendimento imediatamente anterior e o posterior
  let prevAppt: ExistingAppointment | null = null;
  let nextAppt: ExistingAppointment | null = null;

  for (const appt of sorted) {
    const apptEnd = new Date(appt.scheduledTime).getTime() + appt.durationMinutes * 60 * 1000;
    if (apptEnd <= proposedStart) {
      prevAppt = appt;
    } else if (new Date(appt.scheduledTime).getTime() >= proposedEnd && !nextAppt) {
      nextAppt = appt;
    }
  }

  // 4. Checa tempo de trânsito vindo do atendimento anterior (ou da base clínica)
  let originLocation = professionalBaseLocation;
  let originDepartureTime = proposedStart;

  if (prevAppt && prevAppt.latitude != null && prevAppt.longitude != null) {
    originLocation = {
      latitude: prevAppt.latitude,
      longitude: prevAppt.longitude
    };
    originDepartureTime =
      new Date(prevAppt.scheduledTime).getTime() + prevAppt.durationMinutes * 60 * 1000;
  }

  let distanceKm = 0;
  let transitTimeMinutes = 0;

  if (originLocation) {
    distanceKm = calculateHaversineDistance(
      originLocation.latitude,
      originLocation.longitude,
      patientLocation.latitude,
      patientLocation.longitude
    );

    transitTimeMinutes = estimateTransitTimeMinutes(distanceKm, averageSpeedKmh, bufferMinutes);

    const availableTransitTimeMinutes = (proposedStart - originDepartureTime) / (60 * 1000);

    if (availableTransitTimeMinutes < transitTimeMinutes) {
      return {
        viable: false,
        reason: `Tempo de deslocamento insuficiente vindo do compromisso anterior (${distanceKm} km). Necessário: ${transitTimeMinutes} min, disponível: ${Math.round(availableTransitTimeMinutes)} min.`,
        distanceKm,
        transitTimeMinutes,
        conflictWithAppointmentId: prevAppt?.id
      };
    }
  }

  // 5. Checa se após o atendimento haverá tempo suficiente para chegar ao próximo compromisso
  if (nextAppt && nextAppt.latitude != null && nextAppt.longitude != null) {
    const nextStart = new Date(nextAppt.scheduledTime).getTime();
    const distanceToNextKm = calculateHaversineDistance(
      patientLocation.latitude,
      patientLocation.longitude,
      nextAppt.latitude,
      nextAppt.longitude
    );

    const transitToNextMinutes = estimateTransitTimeMinutes(
      distanceToNextKm,
      averageSpeedKmh,
      bufferMinutes
    );

    const availableTimeToNextMinutes = (nextStart - proposedEnd) / (60 * 1000);

    if (availableTimeToNextMinutes < transitToNextMinutes) {
      return {
        viable: false,
        reason: `Tempo insuficiente para chegar ao próximo atendimento após a consulta (${distanceToNextKm} km). Necessário: ${transitToNextMinutes} min, disponível: ${Math.round(availableTimeToNextMinutes)} min.`,
        distanceKm: distanceToNextKm,
        transitTimeMinutes: transitToNextMinutes,
        conflictWithAppointmentId: nextAppt.id
      };
    }
  }

  // Se passou em todas as verificações, o agendamento é perfeitamente viável
  const departureDate = new Date(proposedStart - transitTimeMinutes * 60 * 1000);

  return {
    viable: true,
    distanceKm,
    transitTimeMinutes,
    bufferMinutes,
    estimatedTravelWindow: {
      departureTime: departureDate,
      arrivalTime: new Date(proposedStart)
    }
  };
}
