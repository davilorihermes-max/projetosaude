// src/services/monthly-scale-generator.ts
import {
  Coordinates,
  calculateHaversineDistance,
  estimateTransitTimeMinutes
} from './scheduler-engine.js';

export interface PatientTherapyDemand {
  patientId: string;
  patientName: string;
  therapyType: string; // Ex: 'Fisioterapia Motora', 'Fisioterapia Respiratória', 'Fonoaudiologia', 'Enfermagem'
  sessionsPerWeek: number; // Ex: 2 ou 3 vezes por semana
  durationMinutes: number; // Ex: 45 ou 60 minutos
  preferredShift: 'morning' | 'afternoon' | 'any';
  location: Coordinates;
  address: string;
}

export interface ProfessionalAvailability {
  professionalId: string;
  professionalName: string;
  specialty: string;
  availableDaysOfWeek: number[]; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex
  shifts: ('morning' | 'afternoon')[];
  baseLocation: Coordinates;
  maxDailySessions: number;
}

export interface CareTeamRelation {
  patientId: string;
  professionalIds: string[];
}

export interface PlannedSession {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  therapyType: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  location: Coordinates;
  address: string;
  transitKmFromPrevious: number;
  transitTimeMinutes: number;
  weekNumber: number;
}

export interface PatientCoverageReport {
  patientId: string;
  patientName: string;
  therapyType: string;
  weeklyTarget: number;
  demandedMonthlySessions: number;
  allocatedMonthlySessions: number;
  coveragePercent: number;
  status: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'CRITICAL_DEFICIT';
}

export interface ScaleBottleneck {
  patientId: string;
  patientName: string;
  therapyType: string;
  weekNumber: number;
  missingSessions: number;
  reason: 'NO_CARE_TEAM_SPECIALIST' | 'PROFESSIONAL_CAPACITY_EXCEEDED' | 'TRANSIT_TIME_VIOLATION' | 'TIME_CONFLICT';
  suggestedAction: string;
}

export interface MonthlyScaleResult {
  year: number;
  month: number; // 1 - 12
  monthLabel: string;
  totalDaysInMonth: number;
  plannedSessions: PlannedSession[];
  coverageReports: PatientCoverageReport[];
  bottlenecks: ScaleBottleneck[];
  summary: {
    totalDemandedSessions: number;
    totalAllocatedSessions: number;
    globalCoveragePercent: number;
    totalEstimatedTransitKm: number;
    totalEstimatedTransitHours: number;
    activeCareTeamCount: number;
  };
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Motor Inteligente de Geração de Escala Mensal Domiciliar
 * Cruza:
 * 1. Necessidades terapêuticas dos pacientes (Plano Terapêutico)
 * 2. Disponibilidade dos profissionais de saúde
 * 3. Regra de Ouro: Vínculo estrito de Care Team
 * 4. Roteirização Urbana: Cálculo de Haversine + tempo de trânsito entre domicílios
 */
export class MonthlyScaleGenerator {
  private averageSpeedKmh: number;
  private bufferMinutes: number;

  constructor(averageSpeedKmh: number = 28, bufferMinutes: number = 15) {
    this.averageSpeedKmh = averageSpeedKmh;
    this.bufferMinutes = bufferMinutes;
  }

  /**
   * Executa a geração em lote da escala para o mês selecionado
   */
  public generateMonthlyScale(params: {
    year: number;
    month: number; // 1 a 12
    demands: PatientTherapyDemand[];
    availabilities: ProfessionalAvailability[];
    careTeams: CareTeamRelation[];
  }): MonthlyScaleResult {
    const { year, month, demands, availabilities, careTeams } = params;

    // 1. Mapear dias úteis do mês (Segunda a Sexta)
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays: { dateStr: string; dayOfWeek: number; weekNumber: number; dayOfMonth: number }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Semana do mês (1 a 5)
        const weekNumber = Math.min(Math.ceil(day / 7), 5);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        workingDays.push({
          dateStr,
          dayOfWeek,
          weekNumber,
          dayOfMonth: day
        });
      }
    }

    const totalWeeksInMonth = Math.max(...workingDays.map((w) => w.weekNumber), 4);

    // Mapeamento rápido do Care Team por Paciente
    const careTeamMap = new Map<string, Set<string>>();
    for (const ct of careTeams) {
      careTeamMap.set(ct.patientId, new Set(ct.professionalIds));
    }

    // Mapa de agenda dos profissionais por dia: 'YYYY-MM-DD' -> Map<profId, Array de sessões alocadas>
    const dailyProfessionalSchedule = new Map<
      string,
      Map<string, { startMinutes: number; endMinutes: number; location: Coordinates }[]>
    >();

    const plannedSessions: PlannedSession[] = [];
    const bottlenecks: ScaleBottleneck[] = [];

    // Janelas de horários padrão para slots domiciliares
    const morningSlots = [
      { start: '08:30', startMin: 8 * 60 + 30 },
      { start: '10:00', startMin: 10 * 60 },
      { start: '11:15', startMin: 11 * 60 + 15 }
    ];

    const afternoonSlots = [
      { start: '13:30', startMin: 13 * 60 + 30 },
      { start: '15:00', startMin: 15 * 60 },
      { start: '16:30', startMin: 16 * 60 + 30 }
    ];

    // Para cada demanda terapêutica de cada paciente
    for (const demand of demands) {
      const allowedProfessionals = careTeamMap.get(demand.patientId) || new Set<string>();

      // Candidatos da equipe de cuidado que atendem a especialidade/demanda
      const eligibleProfessionals = availabilities.filter((prof) => {
        // Regra 1: Deve pertencer ao Care Team
        if (!allowedProfessionals.has(prof.professionalId)) {
          return false;
        }
        // Regra 2: Especialidade compatível
        return this.isSpecialtyCompatible(prof.specialty, demand.therapyType);
      });

      if (eligibleProfessionals.length === 0) {
        // Gargalo crítico imediato: Não há nenhum profissional no Care Team com essa especialidade
        for (let w = 1; w <= totalWeeksInMonth; w++) {
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: w,
            missingSessions: demand.sessionsPerWeek,
            reason: 'NO_CARE_TEAM_SPECIALIST',
            suggestedAction: `Cadastrar ou associar um profissional com especialidade em ${demand.therapyType} à Equipe de Cuidado (Care Team) de ${demand.patientName}.`
          });
        }
        continue;
      }

      // Distribuição semanal contínua para este paciente
      for (let week = 1; week <= totalWeeksInMonth; week++) {
        const weekDays = workingDays.filter((w) => w.weekNumber === week);
        let sessionsAllocatedInWeek = 0;

        // Dias sugeridos com espaçamento para evitar dias consecutivos (ex: Seg/Qua ou Ter/Qui)
        const targetDayPatterns = demand.sessionsPerWeek >= 3 
          ? [1, 3, 5] // Seg, Qua, Sex
          : demand.sessionsPerWeek === 2 
            ? [2, 4]  // Ter, Qui
            : [3];    // Qua

        // Tenta primeiro os dias com melhor espaçamento
        const candidateDays = [
          ...weekDays.filter((d) => targetDayPatterns.includes(d.dayOfWeek)),
          ...weekDays.filter((d) => !targetDayPatterns.includes(d.dayOfWeek))
        ];

        for (const day of candidateDays) {
          if (sessionsAllocatedInWeek >= demand.sessionsPerWeek) break;

          // Já possui sessão desta mesma terapia neste mesmo dia?
          const alreadyHasSessionToday = plannedSessions.some(
            (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.date === day.dateStr
          );
          if (alreadyHasSessionToday) continue;

          let allocatedForThisDay = false;

          // Testa profissionais elegíveis
          for (const professional of eligibleProfessionals) {
            if (allocatedForThisDay) break;

            // Profissional atende neste dia da semana?
            if (!professional.availableDaysOfWeek.includes(day.dayOfWeek)) continue;

            // Inicializa agenda do dia do profissional
            if (!dailyProfessionalSchedule.has(day.dateStr)) {
              dailyProfessionalSchedule.set(day.dateStr, new Map());
            }
            const dayProfMap = dailyProfessionalSchedule.get(day.dateStr)!;
            if (!dayProfMap.has(professional.professionalId)) {
              dayProfMap.set(professional.professionalId, []);
            }
            const profDaySessions = dayProfMap.get(professional.professionalId)!;

            if (profDaySessions.length >= professional.maxDailySessions) continue;

            // Determinar turnos elegíveis
            const shiftsToTry: ('morning' | 'afternoon')[] = [];
            if (demand.preferredShift === 'morning' || demand.preferredShift === 'any') {
              if (professional.shifts.includes('morning')) shiftsToTry.push('morning');
            }
            if (demand.preferredShift === 'afternoon' || demand.preferredShift === 'any') {
              if (professional.shifts.includes('afternoon')) shiftsToTry.push('afternoon');
            }

            for (const shift of shiftsToTry) {
              if (allocatedForThisDay) break;
              const slots = shift === 'morning' ? morningSlots : afternoonSlots;

              for (const slot of slots) {
                const sessionStartMin = slot.startMin;
                const sessionEndMin = sessionStartMin + demand.durationMinutes;

                // 1. Checa sobreposição direta de horário
                const hasTimeOverlap = profDaySessions.some(
                  (s) => Math.max(sessionStartMin, s.startMinutes) < Math.min(sessionEndMin, s.endMinutes)
                );
                if (hasTimeOverlap) continue;

                // 2. Checa viabilidade de deslocamento com o atendimento anterior do profissional no dia
                const prevSession = [...profDaySessions]
                  .filter((s) => s.endMinutes <= sessionStartMin)
                  .sort((a, b) => b.endMinutes - a.endMinutes)[0];

                let originLocation = professional.baseLocation;
                let originEndMin = 8 * 60; // Início do expediente padrão

                if (prevSession) {
                  originLocation = prevSession.location;
                  originEndMin = prevSession.endMinutes;
                }

                const distanceKm = calculateHaversineDistance(
                  originLocation.latitude,
                  originLocation.longitude,
                  demand.location.latitude,
                  demand.location.longitude
                );

                const transitMinutes = estimateTransitTimeMinutes(
                  distanceKm,
                  this.averageSpeedKmh,
                  this.bufferMinutes
                );

                const availableGapMinutes = sessionStartMin - originEndMin;

                // Se houver atendimento anterior, o intervalo deve cobrir o tempo de trânsito
                if (prevSession && availableGapMinutes < transitMinutes) {
                  continue; // Trânsito insuficiente
                }

                // 3. Checa viabilidade com o próximo atendimento (se houver)
                const nextSession = [...profDaySessions]
                  .filter((s) => s.startMinutes >= sessionEndMin)
                  .sort((a, b) => a.startMinutes - b.startMinutes)[0];

                if (nextSession) {
                  const distToNextKm = calculateHaversineDistance(
                    demand.location.latitude,
                    demand.location.longitude,
                    nextSession.location.latitude,
                    nextSession.location.longitude
                  );
                  const transitToNext = estimateTransitTimeMinutes(
                    distToNextKm,
                    this.averageSpeedKmh,
                    this.bufferMinutes
                  );
                  const gapToNext = nextSession.startMinutes - sessionEndMin;
                  if (gapToNext < transitToNext) {
                    continue; // Trânsito para o próximo inviável
                  }
                }

                // SUCESSO! Alocação viável encontrada
                const sessionId = `plan-${day.dateStr}-${professional.professionalId}-${demand.patientId}-${sessionStartMin}`;

                plannedSessions.push({
                  id: sessionId,
                  patientId: demand.patientId,
                  patientName: demand.patientName,
                  professionalId: professional.professionalId,
                  professionalName: professional.professionalName,
                  therapyType: demand.therapyType,
                  date: day.dateStr,
                  time: slot.start,
                  durationMinutes: demand.durationMinutes,
                  location: demand.location,
                  address: demand.address,
                  transitKmFromPrevious: distanceKm,
                  transitTimeMinutes: transitMinutes,
                  weekNumber: week
                });

                profDaySessions.push({
                  startMinutes: sessionStartMin,
                  endMinutes: sessionEndMin,
                  location: demand.location
                });

                profDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);
                allocatedForThisDay = true;
                sessionsAllocatedInWeek++;
                break;
              }
            }
          }
        }

        // Se a semana não atingiu a meta do paciente, registra o gargalo com ação sugerida
        if (sessionsAllocatedInWeek < demand.sessionsPerWeek) {
          const missing = demand.sessionsPerWeek - sessionsAllocatedInWeek;
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: week,
            missingSessions: missing,
            reason: 'PROFESSIONAL_CAPACITY_EXCEEDED',
            suggestedAction: `Os profissionais autorizados do Care Team (${eligibleProfessionals.map((p) => p.professionalName).join(', ')}) atingiram o limite de vagas na Semana ${week}. Sugestão: autorizar profissional adicional no Care Team ou flexibilizar o turno preferencial.`
          });
        }
      }
    }

    // Ordenar sessões cronologicamente
    plannedSessions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    // 4. Calcular Relatórios de Cobertura por Paciente
    const coverageReports: PatientCoverageReport[] = demands.map((demand) => {
      const demandedMonthly = demand.sessionsPerWeek * totalWeeksInMonth;
      const allocatedMonthly = plannedSessions.filter(
        (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType
      ).length;

      const coveragePercent = demandedMonthly > 0 ? Math.round((allocatedMonthly / demandedMonthly) * 100) : 100;
      let status: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'CRITICAL_DEFICIT' = 'FULL_COVERAGE';
      if (coveragePercent < 60) {
        status = 'CRITICAL_DEFICIT';
      } else if (coveragePercent < 100) {
        status = 'PARTIAL_COVERAGE';
      }

      return {
        patientId: demand.patientId,
        patientName: demand.patientName,
        therapyType: demand.therapyType,
        weeklyTarget: demand.sessionsPerWeek,
        demandedMonthlySessions: demandedMonthly,
        allocatedMonthlySessions: allocatedMonthly,
        coveragePercent,
        status
      };
    });

    // Métricas globais
    const totalDemanded = coverageReports.reduce((acc, c) => acc + c.demandedMonthlySessions, 0);
    const totalAllocated = coverageReports.reduce((acc, c) => acc + c.allocatedMonthlySessions, 0);
    const globalCoveragePercent = totalDemanded > 0 ? Math.round((totalAllocated / totalDemanded) * 100) : 100;

    const totalEstimatedTransitKm = parseFloat(
      plannedSessions.reduce((acc, s) => acc + s.transitKmFromPrevious, 0).toFixed(1)
    );
    const totalEstimatedTransitMinutes = plannedSessions.reduce((acc, s) => acc + s.transitTimeMinutes, 0);
    const totalEstimatedTransitHours = parseFloat((totalEstimatedTransitMinutes / 60).toFixed(1));

    return {
      year,
      month,
      monthLabel: `${MONTH_NAMES[month - 1]} de ${year}`,
      totalDaysInMonth: daysInMonth,
      plannedSessions,
      coverageReports,
      bottlenecks,
      summary: {
        totalDemandedSessions: totalDemanded,
        totalAllocatedSessions: totalAllocated,
        globalCoveragePercent,
        totalEstimatedTransitKm,
        totalEstimatedTransitHours,
        activeCareTeamCount: careTeams.length
      }
    };
  }

  /**
   * Valida se a especialidade do profissional atende ao tipo de terapia solicitado
   */
  private isSpecialtyCompatible(professionalSpecialty: string, demandedTherapy: string): boolean {
    const profSpec = professionalSpecialty.toLowerCase();
    const demand = demandedTherapy.toLowerCase();

    if (demand.includes('fisioterapia') && profSpec.includes('fisioterapia')) {
      return true;
    }
    if (demand.includes('fono') && profSpec.includes('fono')) {
      return true;
    }
    if (demand.includes('enfermagem') && profSpec.includes('enfermagem')) {
      return true;
    }
    if (demand.includes('terapia ocupacional') && profSpec.includes('terapia ocupacional')) {
      return true;
    }
    if (demand.includes('médic') || demand.includes('clínic') || demand.includes('consulta')) {
      return profSpec.includes('medicina') || profSpec.includes('clínica') || profSpec.includes('família');
    }
    return profSpec.includes(demand) || demand.includes(profSpec);
  }
}
