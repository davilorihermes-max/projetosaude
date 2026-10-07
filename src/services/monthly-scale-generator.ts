// src/services/monthly-scale-generator.ts
import {
  Coordinates,
  calculateHaversineDistance,
  estimateTransitTimeMinutes
} from './scheduler-engine.js';

export interface TimeBlock {
  id?: string;
  dayOfWeek?: number; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex
  startTime: string;  // Formato "HH:mm", ex: "09:00"
  endTime: string;    // Formato "HH:mm", ex: "10:30"
  reason?: string;    // Ex: "Paciente particular", "Consulta médica", "Compromisso pessoal"
  dateStr?: string;   // Opcional para travar uma data específica YYYY-MM-DD
}

export interface PatientTherapyDemand {
  id?: string;
  patientId: string;
  patientName: string;
  therapyType: string; // Ex: 'Fisioterapia Cardiorrespiratória & Motora', 'Fisioterapia Motora', 'Fonoaudiologia'
  sessionsPerWeek: number; // Ex: 1 a 5 vezes por semana
  durationMinutes: number; // Ex: 45 ou 60 minutos
  preferredShift: 'morning' | 'afternoon' | 'any';
  location: Coordinates;
  address: string;
  // Bloqueios de indisponibilidade do paciente (consultas externas, diálise, compromissos familiares)
  unavailabilityBlocks?: TimeBlock[];
}

export interface DayTimeWindow {
  enabled: boolean;
  startTime: string; // Formato "HH:mm", ex: "08:00"
  endTime: string;   // Formato "HH:mm", ex: "13:30" ou "18:00"
}

export interface ProfessionalAvailability {
  professionalId: string;
  professionalName: string;
  specialty: string;
  baseLocation: Coordinates;
  // Disponibilidade por horário em cada dia da semana (1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex)
  weekdayWindows?: { [dayOfWeek: number]: DayTimeWindow };
  // Variação por dia específico do mês (ex: '2026-10-14' com compromisso particular)
  dateOverrides?: { [dateStr: string]: DayTimeWindow };
  // Blocos de indisponibilidade do profissional (pacientes particulares externos, compromissos pessoais, etc.)
  unavailabilityBlocks?: TimeBlock[];
  // Campos legados para compatibilidade reversa
  availableDaysOfWeek?: number[];
  shifts?: ('morning' | 'afternoon')[];
  maxDailySessions?: number;
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
 * Converte string "HH:mm" em minutos desde 00:00
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 8 * 60; // Default 08:00
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos em string "HH:mm"
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Motor Inteligente de Geração de Escala Mensal Domiciliar
 * Atualizado com:
 * 1. Disponibilidade por JANELA DE HORÁRIO real (Início e Fim por dia da semana) sem limites artificiais
 * 2. Suporte para até 3 demandas terapêuticas por paciente sem sobreposição de horários
 * 3. Regra de Ouro: Restrição estrita de Care Team
 * 4. Roteirização Urbana Geodésica (Haversine + Trânsito)
 */
export class MonthlyScaleGenerator {
  private averageSpeedKmh: number;
  private bufferMinutes: number;

  constructor(averageSpeedKmh: number = 28, bufferMinutes: number = 15) {
    this.averageSpeedKmh = averageSpeedKmh;
    this.bufferMinutes = bufferMinutes;
  }

  /**
   * Obtém a janela de horário de trabalho do profissional em uma data específica
   */
  public getProfessionalDayWindow(
    professional: ProfessionalAvailability,
    dateStr: string,
    dayOfWeek: number
  ): DayTimeWindow | null {
    // 1. Checa se há override específico para esta data do mês
    if (professional.dateOverrides && professional.dateOverrides[dateStr]) {
      const override = professional.dateOverrides[dateStr];
      return override.enabled ? override : null;
    }

    // 2. Checa configuração por dia da semana
    if (professional.weekdayWindows && professional.weekdayWindows[dayOfWeek]) {
      const window = professional.weekdayWindows[dayOfWeek];
      return window.enabled ? window : null;
    }

    // 3. Fallback para campos legados (se existirem)
    if (professional.availableDaysOfWeek) {
      if (!professional.availableDaysOfWeek.includes(dayOfWeek)) {
        return null;
      }
      const hasMorning = professional.shifts?.includes('morning') ?? true;
      const hasAfternoon = professional.shifts?.includes('afternoon') ?? true;

      const startTime = hasMorning ? '08:00' : '13:00';
      const endTime = hasAfternoon ? '18:00' : '12:30';

      return {
        enabled: true,
        startTime,
        endTime
      };
    }

    // Default se nada foi definido: Seg a Sex das 08:00 às 18:00
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return {
        enabled: true,
        startTime: '08:00',
        endTime: '18:00'
      };
    }

    return null;
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

    // Mapeamento do Care Team por Paciente
    const careTeamMap = new Map<string, Set<string>>();
    for (const ct of careTeams) {
      careTeamMap.set(ct.patientId, new Set(ct.professionalIds));
    }

    // Mapa de agenda dos profissionais por dia: 'YYYY-MM-DD' -> Map<profId, Array de sessões alocadas>
    const dailyProfessionalSchedule = new Map<
      string,
      Map<string, { startMinutes: number; endMinutes: number; location: Coordinates }[]>
    >();

    // NOVO: Mapa de agenda de cada paciente por dia: 'YYYY-MM-DD' -> Map<patientId, Array de horários ocupados>
    // Garante que o mesmo paciente nunca tenha duas terapias no mesmo horário
    const dailyPatientSchedule = new Map<
      string,
      Map<string, { startMinutes: number; endMinutes: number }[]>
    >();

    const plannedSessions: PlannedSession[] = [];
    const bottlenecks: ScaleBottleneck[] = [];

    // Para cada demanda terapêutica cadastrada (suporta até 3 por paciente)
    for (const demand of demands) {
      const allowedProfessionals = careTeamMap.get(demand.patientId) || new Set<string>();

      // Candidatos da equipe de cuidado que atendem a especialidade
      const eligibleProfessionals = availabilities.filter((prof) => {
        // Regra 1: Deve pertencer ao Care Team do paciente
        if (!allowedProfessionals.has(prof.professionalId)) {
          return false;
        }
        // Regra 2: Especialidade compatível
        return this.isSpecialtyCompatible(prof.specialty, demand.therapyType);
      });

      if (eligibleProfessionals.length === 0) {
        // Gargalo crítico imediato: Sem profissional com essa especialidade no Care Team
        for (let w = 1; w <= totalWeeksInMonth; w++) {
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: w,
            missingSessions: demand.sessionsPerWeek,
            reason: 'NO_CARE_TEAM_SPECIALIST',
            suggestedAction: `Cadastrar ou autorizar um profissional com especialidade em ${demand.therapyType} na Equipe de Cuidado (Care Team) de ${demand.patientName}.`
          });
        }
        continue;
      }

      // Distribuição semanal contínua para este paciente
      for (let week = 1; week <= totalWeeksInMonth; week++) {
        const weekDays = workingDays.filter((w) => w.weekNumber === week);
        let sessionsAllocatedInWeek = 0;

        // Padrão de espaçamento sugerido para evitar dias colados
        const targetDayPatterns = demand.sessionsPerWeek >= 3
          ? [1, 3, 5] // Seg, Qua, Sex
          : demand.sessionsPerWeek === 2
            ? [2, 4]  // Ter, Qui
            : [3];    // Qua

        const candidateDays = [
          ...weekDays.filter((d) => targetDayPatterns.includes(d.dayOfWeek)),
          ...weekDays.filter((d) => !targetDayPatterns.includes(d.dayOfWeek))
        ];

        for (const day of candidateDays) {
          if (sessionsAllocatedInWeek >= demand.sessionsPerWeek) break;

          // Já possui sessão desta MESMA terapia neste mesmo dia?
          const alreadyHasSameTherapyToday = plannedSessions.some(
            (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.date === day.dateStr
          );
          if (alreadyHasSameTherapyToday) continue;

          let allocatedForThisDay = false;

          // Testa profissionais elegíveis
          for (const professional of eligibleProfessionals) {
            if (allocatedForThisDay) break;

            // 1. Obtém a janela de horário real do profissional para este dia da semana
            const dayWindow = this.getProfessionalDayWindow(professional, day.dateStr, day.dayOfWeek);
            if (!dayWindow || !dayWindow.enabled) continue;

            const windowStartMin = timeStringToMinutes(dayWindow.startTime);
            const windowEndMin = timeStringToMinutes(dayWindow.endTime);

            // Se a duração da sessão não cabe na janela do dia, pula
            if (windowEndMin - windowStartMin < demand.durationMinutes) continue;

            // Inicializa mapas diários
            if (!dailyProfessionalSchedule.has(day.dateStr)) {
              dailyProfessionalSchedule.set(day.dateStr, new Map());
            }
            const dayProfMap = dailyProfessionalSchedule.get(day.dateStr)!;
            if (!dayProfMap.has(professional.professionalId)) {
              dayProfMap.set(professional.professionalId, []);
            }
            const profDaySessions = dayProfMap.get(professional.professionalId)!;

            if (!dailyPatientSchedule.has(day.dateStr)) {
              dailyPatientSchedule.set(day.dateStr, new Map());
            }
            const dayPatMap = dailyPatientSchedule.get(day.dateStr)!;
            if (!dayPatMap.has(demand.patientId)) {
              dayPatMap.set(demand.patientId, []);
            }
            const patientDaySessions = dayPatMap.get(demand.patientId)!;

            // 2. Gera horários candidatos dentro da jornada diária do profissional
            // Sem limite artificial de sessões: testa slots ao longo da janela [windowStartMin, windowEndMin]
            const candidateStartMinutes: number[] = [];

            // Adiciona horários a cada 30 minutos dentro da janela
            for (let t = windowStartMin; t <= windowEndMin - demand.durationMinutes; t += 30) {
              candidateStartMinutes.push(t);
            }

            // Também tenta encaixar imediatamente após cada sessão já existente do profissional (+ trânsito)
            for (const existing of profDaySessions) {
              const afterExisting = existing.endMinutes + this.bufferMinutes;
              if (afterExisting >= windowStartMin && afterExisting <= windowEndMin - demand.durationMinutes) {
                if (!candidateStartMinutes.includes(afterExisting)) {
                  candidateStartMinutes.push(afterExisting);
                }
              }
            }

            // Também tenta encaixar imediatamente após término de blocos de indisponibilidade do profissional
            const profDayBlocksForSlots = (professional.unavailabilityBlocks || []).filter((block) => {
              if (block.dateStr && block.dateStr !== day.dateStr) return false;
              if (!block.dateStr && block.dayOfWeek && block.dayOfWeek !== day.dayOfWeek) return false;
              return true;
            });
            for (const b of profDayBlocksForSlots) {
              const bEndMin = timeStringToMinutes(b.endTime);
              if (bEndMin >= windowStartMin && bEndMin <= windowEndMin - demand.durationMinutes) {
                if (!candidateStartMinutes.includes(bEndMin)) {
                  candidateStartMinutes.push(bEndMin);
                }
              }
            }

            // Também tenta encaixar após término de blocos de indisponibilidade do paciente
            const patientDayBlocksForSlots = (demand.unavailabilityBlocks || []).filter((block) => {
              if (block.dateStr && block.dateStr !== day.dateStr) return false;
              if (!block.dateStr && block.dayOfWeek && block.dayOfWeek !== day.dayOfWeek) return false;
              return true;
            });
            for (const b of patientDayBlocksForSlots) {
              const bEndMin = timeStringToMinutes(b.endTime);
              if (bEndMin >= windowStartMin && bEndMin <= windowEndMin - demand.durationMinutes) {
                if (!candidateStartMinutes.includes(bEndMin)) {
                  candidateStartMinutes.push(bEndMin);
                }
              }
            }

            candidateStartMinutes.sort((a, b) => a - b);

            // Filtra conforme o turno preferencial do paciente (se aplicável)
            const filteredSlots = candidateStartMinutes.filter((slotMin) => {
              if (demand.preferredShift === 'morning') {
                return slotMin < 12 * 60; // Inicia antes do meio-dia
              }
              if (demand.preferredShift === 'afternoon') {
                return slotMin >= 12 * 60; // Inicia a partir do meio-dia
              }
              return true; // 'any'
            });

            // Se nenhum slot coincidir com o turno preferido, tenta os demais slots dentro da jornada do terapeuta
            const slotsToTest = filteredSlots.length > 0 ? filteredSlots : candidateStartMinutes;

            for (const sessionStartMin of slotsToTest) {
              const sessionEndMin = sessionStartMin + demand.durationMinutes;

              // A sessão precisa caber estritamente dentro da janela de jornada diária do profissional
              if (sessionStartMin < windowStartMin || sessionEndMin > windowEndMin) {
                continue;
              }

              // Checagem A: Conflito de horário com outras sessões já marcadas do profissional
              const hasProfOverlap = profDaySessions.some(
                (s) => Math.max(sessionStartMin, s.startMinutes) < Math.min(sessionEndMin, s.endMinutes)
              );
              if (hasProfOverlap) continue;

              // Checagem A2: Bloqueio de indisponibilidade do profissional (compromissos particulares, reuniões)
              const profDayBlocks = (professional.unavailabilityBlocks || []).filter((block) => {
                if (block.dateStr && block.dateStr !== day.dateStr) return false;
                if (!block.dateStr && block.dayOfWeek && block.dayOfWeek !== day.dayOfWeek) return false;
                return true;
              });
              const hasProfBlockOverlap = profDayBlocks.some((b) => {
                const bStart = timeStringToMinutes(b.startTime);
                const bEnd = timeStringToMinutes(b.endTime);
                return Math.max(sessionStartMin, bStart) < Math.min(sessionEndMin, bEnd);
              });
              if (hasProfBlockOverlap) continue;

              // Checagem B: Conflito de horário com OUTRAS terapias do próprio paciente hoje
              const hasPatientOverlap = patientDaySessions.some(
                (s) => Math.max(sessionStartMin, s.startMinutes) < Math.min(sessionEndMin, s.endMinutes)
              );
              if (hasPatientOverlap) continue;

              // Checagem B2: Bloqueio de indisponibilidade do paciente (consultas externas, exames, compromissos)
              const patientDayBlocks = (demand.unavailabilityBlocks || []).filter((block) => {
                if (block.dateStr && block.dateStr !== day.dateStr) return false;
                if (!block.dateStr && block.dayOfWeek && block.dayOfWeek !== day.dayOfWeek) return false;
                return true;
              });
              const hasPatientBlockOverlap = patientDayBlocks.some((b) => {
                const bStart = timeStringToMinutes(b.startTime);
                const bEnd = timeStringToMinutes(b.endTime);
                return Math.max(sessionStartMin, bStart) < Math.min(sessionEndMin, bEnd);
              });
              if (hasPatientBlockOverlap) continue;

              // Checagem C: Deslocamento urbano vindo do atendimento anterior do profissional
              const prevSession = [...profDaySessions]
                .filter((s) => s.endMinutes <= sessionStartMin)
                .sort((a, b) => b.endMinutes - a.endMinutes)[0];

              let originLocation = professional.baseLocation;
              let originEndMin = windowStartMin;

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

              if (prevSession && availableGapMinutes < transitMinutes) {
                continue; // Trânsito insuficiente entre compromissos
              }

              // Checagem D: Deslocamento para alcançar o próximo compromisso do profissional (se houver)
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

              // SUCESSO! Alocação viável na janela real do profissional
              const sessionId = `plan-${day.dateStr}-${professional.professionalId}-${demand.patientId}-${sessionStartMin}`;

              plannedSessions.push({
                id: sessionId,
                patientId: demand.patientId,
                patientName: demand.patientName,
                professionalId: professional.professionalId,
                professionalName: professional.professionalName,
                therapyType: demand.therapyType,
                date: day.dateStr,
                time: minutesToTimeString(sessionStartMin),
                durationMinutes: demand.durationMinutes,
                location: demand.location,
                address: demand.address,
                transitKmFromPrevious: distanceKm,
                transitTimeMinutes: transitMinutes,
                weekNumber: week
              });

              // Grava na agenda do profissional
              profDaySessions.push({
                startMinutes: sessionStartMin,
                endMinutes: sessionEndMin,
                location: demand.location
              });
              profDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);

              // Grava na agenda do paciente (para não colidir com outras terapias dele)
              patientDaySessions.push({
                startMinutes: sessionStartMin,
                endMinutes: sessionEndMin
              });
              patientDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);

              allocatedForThisDay = true;
              sessionsAllocatedInWeek++;
              break;
            }
          }
        }

        // Se a semana não atingiu a meta, registra o gargalo com ação sugerida
        if (sessionsAllocatedInWeek < demand.sessionsPerWeek) {
          const missing = demand.sessionsPerWeek - sessionsAllocatedInWeek;
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: week,
            missingSessions: missing,
            reason: 'PROFESSIONAL_CAPACITY_EXCEEDED',
            suggestedAction: `As janelas de horário dos terapeutas autorizados (${eligibleProfessionals.map((p) => p.professionalName).join(', ')}) não possuem tempo hábil para a demanda de ${demand.therapyType} na Semana ${week}. Sugestão: ampliar a janela de horário de trabalho diário do profissional ou autorizar terapeuta adicional no Care Team.`
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

    // 4. Calcular Relatórios de Cobertura por Paciente e Demanda
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
