export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface PatientSlotDemand {
  patientId: string;
  patientName: string;
  date: Date;
  durationMinutes: number;
  location: GeoCoordinate;
  addressLabel: string;
}

export interface CandidateProfessional {
  professionalId: string;
  fullName: string;
  isInCareTeam: boolean;
  dailySchedule: {
    start: Date;
    end: Date;
    location: GeoCoordinate;
  }[];
}

export interface SchedulingResult {
  assigned: {
    patientId: string;
    professionalId: string;
    start: Date;
    end: Date;
    transitTimeMinutes: number;
  }[];
  unresolvedBottlenecks: {
    patientId: string;
    reason: 'NO_CARE_TEAM_AVAILABLE' | 'TRANSIT_TIME_VIOLATION' | 'TIME_CONFLICT';
    suggestedAction: string;
  }[];
}

export class HealthcareSchedulerEngine {
  private readonly BUFFER_MINUTES = 15;
  private readonly AVERAGE_URBAN_SPEED_KMH = 25; // Velocidade média com trânsito em km/h

  /**
   * Cálculo de distância e tempo estimado de trânsito utilizando a fórmula de Haversine
   * corrigida com o fator de tortuosidade urbana (1.35x a distância em linha reta).
   */
  public calculateEstimatedTransitMinutes(origin: GeoCoordinate, dest: GeoCoordinate): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(dest.latitude - origin.latitude);
    const dLon = this.deg2rad(dest.longitude - origin.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(origin.latitude)) *
      Math.cos(this.deg2rad(dest.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistanceKm = R * c;
    const urbanDistanceKm = straightDistanceKm * 1.35; // Fator de tortuosidade urbana

    const travelHours = urbanDistanceKm / this.AVERAGE_URBAN_SPEED_KMH;
    return Math.ceil(travelHours * 60);
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Valida rigorosamente se o profissional pode atender a demanda:
   * 1. Hard Constraint: Obrigatoriamente pertencer ao Care Team do paciente.
   * 2. Hard Constraint: Não ter sobreposição de horários.
   * 3. Hard Constraint: Ter tempo de trânsito + buffer suficiente entre o atendimento anterior e o próximo.
   */
  public evaluateCandidateViability(
    candidate: CandidateProfessional,
    demand: PatientSlotDemand,
    proposedStart: Date,
    proposedEnd: Date
  ): { viable: boolean; transitNeeded: number; reason?: string } {
    // 1. Hard Constraint: Care Team obrigatório
    if (!candidate.isInCareTeam) {
      return {
        viable: false,
        transitNeeded: 0,
        reason: 'O profissional não pertence ao Care Team deste paciente.'
      };
    }

    // 2. Hard Constraint: Verificação de sobreposição de horário direto
    const hasDirectOverlap = candidate.dailySchedule.some(
      session => proposedStart < session.end && proposedEnd > session.start
    );

    if (hasDirectOverlap) {
      return {
        viable: false,
        transitNeeded: 0,
        reason: 'Choque direto de horário com outro atendimento agendado.'
      };
    }

    // 3. Hard Constraint: Validação de deslocamento com a sessão anterior
    const previousSession = [...candidate.dailySchedule]
      .filter(s => s.end <= proposedStart)
      .sort((a, b) => b.end.getTime() - a.end.getTime())[0];

    let transitBefore = 0;
    if (previousSession) {
      transitBefore = this.calculateEstimatedTransitMinutes(previousSession.location, demand.location);
      const availableGapMinutes = (proposedStart.getTime() - previousSession.end.getTime()) / (1000 * 60);

      if (availableGapMinutes < transitBefore + this.BUFFER_MINUTES) {
        return {
          viable: false,
          transitNeeded: transitBefore,
          reason: `Janela de trânsito insuficiente em relação ao atendimento anterior. Necessário: ${transitBefore + this.BUFFER_MINUTES} min, Disponível: ${availableGapMinutes} min.`
        };
      }
    }

    // 4. Hard Constraint: Validação de deslocamento com a próxima sessão
    const nextSession = [...candidate.dailySchedule]
      .filter(s => s.start >= proposedEnd)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

    let transitAfter = 0;
    if (nextSession) {
      transitAfter = this.calculateEstimatedTransitMinutes(demand.location, nextSession.location);
      const availableGapMinutes = (nextSession.start.getTime() - proposedEnd.getTime()) / (1000 * 60);

      if (availableGapMinutes < transitAfter + this.BUFFER_MINUTES) {
        return {
          viable: false,
          transitNeeded: transitAfter,
          reason: `Janela de trânsito insuficiente para alcançar o próximo paciente. Necessário: ${transitAfter + this.BUFFER_MINUTES} min, Disponível: ${availableGapMinutes} min.`
        };
      }
    }

    return { viable: true, transitNeeded: transitBefore + transitAfter };
  }
}
