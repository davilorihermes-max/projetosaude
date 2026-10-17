// src/services/monthly-scale-generator.ts
import {
  Coordinates,
  calculateHaversineDistance,
  estimateTransitTimeMinutes
} from './scheduler-engine.js';

export interface TimeBlock {
  id?: string;
  dayOfWeek?: number; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex (quando semanal)
  dateStr?: string;   // Data específica YYYY-MM-DD (ou data inicial do intervalo)
  endDateStr?: string; // Data final do intervalo YYYY-MM-DD (opcional para bloqueio de múltiplos dias)
  startTime: string;  // Formato "HH:mm", ex: "09:00"
  endTime: string;    // Formato "HH:mm", ex: "10:30"
  reason?: string;    // Ex: "Paciente particular", "Consulta médica", "Viagem / Férias"
}

export interface FixedAppointment {
  id?: string;
  patientId: string;
  professionalId: string;
  therapyType: string;
  dayOfWeek?: number; // 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex (quando semanal recorrente)
  dateStr?: string;   // Opcional para fixar em uma data específica YYYY-MM-DD
  time: string;       // Formato "HH:mm", ex: "09:00"
  durationMinutes?: number; // Ex: 45 ou 60 minutos
  recurrenceType?: 'weekly' | 'biweekly' | 'specific_date' | string;
  notes?: string;     // Ex: "Atendimento fixo em contrato"
  patientName?: string;
  professionalName?: string;
}

export interface PatientTherapyDemand {
  id?: string;
  patientId: string;
  patientName: string;
  therapyType: string; // Ex: 'Fisioterapia Motora', 'Fisioterapia Respiratória', 'Terapia Ocupacional', 'Fonoaudiologia'
  sessionsPerWeek: number; // Ex: 1 a 5 vezes por semana
  durationMinutes: number; // Ex: 45 ou 60 minutos
  preferredShift: 'morning' | 'afternoon' | 'any';
  location: Coordinates;
  address: string;
  // Dias da semana e horários específicos disponíveis para esta terapia
  availableWindows?: { [dayOfWeek: number]: DayTimeWindow };
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
  specialties?: string[]; // Suporte a até 3 especialidades padronizadas
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
  isFixed?: boolean; // Indica se este atendimento foi fixado/travado previamente
  notes?: string;
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

export type ScaleResult = MonthlyScaleResult;

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
 * Avalia se um determinado intervalo de horário (em minutos do dia) colide com um TimeBlock
 * Suporta:
 * 1. Recorrência semanal fixa (dayOfWeek)
 * 2. Dia específico do mês (dateStr)
 * 3. Intervalo de múltiplos dias com horas de início e fim (dateStr até endDateStr)
 */
export function isSlotBlockedByTimeBlock(
  dateStr: string,
  dayOfWeek: number,
  sessionStartMin: number,
  sessionEndMin: number,
  block: TimeBlock
): boolean {
  const blockStartMin = timeStringToMinutes(block.startTime);
  const blockEndMin = timeStringToMinutes(block.endTime);

  // Caso 1: Intervalo de múltiplos dias (dateStr até endDateStr)
  if (block.dateStr && block.endDateStr && block.dateStr !== block.endDateStr) {
    if (dateStr < block.dateStr || dateStr > block.endDateStr) {
      return false;
    }
    if (dateStr === block.dateStr) {
      // Primeiro dia do intervalo: bloqueado a partir do startTime até o fim da jornada
      return sessionEndMin > blockStartMin;
    }
    if (dateStr === block.endDateStr) {
      // Último dia do intervalo: bloqueado do início do dia até o endTime
      return sessionStartMin < blockEndMin;
    }
    // Dias inteiramente dentro do intervalo
    return true;
  }

  // Caso 2: Dia específico do mês (data pontual)
  if (block.dateStr) {
    if (dateStr !== block.dateStr) return false;
    return Math.max(sessionStartMin, blockStartMin) < Math.min(sessionEndMin, blockEndMin);
  }

  // Caso 3: Recorrência semanal pelo dia da semana
  if (block.dayOfWeek !== undefined) {
    if (dayOfWeek !== block.dayOfWeek) return false;
    return Math.max(sessionStartMin, blockStartMin) < Math.min(sessionEndMin, blockEndMin);
  }

  return false;
}

/**
 * Motor Inteligente de Geração de Escala Mensal Domiciliar
 * Atualizado com:
 * 1. Disponibilidade por JANELA DE HORÁRIO real (Início e Fim por dia da semana) sem limites artificiais
 * 2. Suporte para até 3 demandas terapêuticas por paciente sem sobreposição de horários
 * 3. Regra de Ouro: Restrição estrita de Care Team
 * 4. Roteirização Urbana Geodésica (Haversine + Trânsito)
 * 5. Bloqueios por dia específico e intervalos de datas para profissionais e pacientes
 * 6. Fixação de atendimentos pré-estabelecidos prioritários
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
    if (professional.weekdayWindows) {
      const window = professional.weekdayWindows[dayOfWeek];
      if (window) {
        return window.enabled ? window : null;
      }
      // Se o profissional possui grade configurada e este dia não está presente, é folga/indisponível
      if (Object.keys(professional.weekdayWindows).length > 0) {
        return null;
      }
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
    fixedAppointments?: FixedAppointment[];
  }): MonthlyScaleResult {
    const { year, month, demands, availabilities, careTeams, fixedAppointments = [] } = params;

    // 1. Mapear todos os dias do mês (incluindo fins de semana / domingos)
    // Uma semana começa na Segunda-feira e termina no Domingo
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays: { dateStr: string; dayOfWeek: number; weekNumber: number; dayOfMonth: number }[] = [];

    let currentWeek = 1;
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

      // Se for Segunda-feira e não for o primeiro dia do mês, inicia uma nova semana
      if (dayOfWeek === 1 && day > 1) {
        currentWeek++;
      }

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      workingDays.push({
        dateStr,
        dayOfWeek,
        weekNumber: currentWeek,
        dayOfMonth: day
      });
    }

    const totalWeeksInMonth = Math.max(...workingDays.map((w) => w.weekNumber), 1);

    // Mapeamento resiliente do Care Team por Paciente (indexado por ID e por Nome)
    const careTeamMap = new Map<string, Set<string>>();
    for (const ct of careTeams) {
      const idsSet = new Set((ct.professionalIds || []).map((id) => (id || '').trim()));
      if (ct.patientId) {
        careTeamMap.set(ct.patientId, idsSet);
        careTeamMap.set(ct.patientId.toLowerCase().trim(), idsSet);
      }
      if (ct.patientName) {
        careTeamMap.set(ct.patientName.toLowerCase().trim(), idsSet);
      }
    }

    const getAllowedProfessionals = (demand: PatientTherapyDemand): Set<string> => {
      let allowed = careTeamMap.get(demand.patientId);
      if (!allowed) allowed = careTeamMap.get(demand.patientId.toLowerCase().trim());
      if (!allowed && demand.patientName) {
        allowed = careTeamMap.get(demand.patientName.toLowerCase().trim());
      }
      if (!allowed && demand.careTeamProfessionalIds && demand.careTeamProfessionalIds.length > 0) {
        allowed = new Set(demand.careTeamProfessionalIds.map((id) => (id || '').trim()));
      }
      if (!allowed && demand.patientName) {
        const pName = demand.patientName.toLowerCase().trim();
        for (const [key, set] of careTeamMap.entries()) {
          if (pName.includes(key) || key.includes(pName)) {
            allowed = set;
            break;
          }
        }
      }
      return allowed || new Set<string>();
    };

    // Mapa de agenda dos profissionais por dia: 'YYYY-MM-DD' -> Map<profId, Array de sessões alocadas>
    const dailyProfessionalSchedule = new Map<
      string,
      Map<string, { startMinutes: number; endMinutes: number; location: Coordinates }[]>
    >();

    // Mapa de agenda de cada paciente por dia: 'YYYY-MM-DD' -> Map<patientId, Array de horários ocupados>
    // Garante que o mesmo paciente nunca tenha duas terapias no mesmo horário
    const dailyPatientSchedule = new Map<
      string,
      Map<string, { startMinutes: number; endMinutes: number }[]>
    >();

    const plannedSessions: PlannedSession[] = [];
    const bottlenecks: ScaleBottleneck[] = [];

    // FASE 0: Alocação prioritária dos atendimentos fixados/travados
    if (fixedAppointments.length > 0) {
      for (const fixedApp of fixedAppointments) {
        const demand = demands.find(
          (d) => d.patientId === fixedApp.patientId && d.therapyType === fixedApp.therapyType
        ) || demands.find((d) => d.patientId === fixedApp.patientId);

        const professional = availabilities.find((p) => p.professionalId === fixedApp.professionalId);

        if (!demand || !professional) continue;

        // Achar os dias correspondentes no mês
        const targetDays = workingDays.filter((day) => {
          if (fixedApp.dateStr) {
            return day.dateStr === fixedApp.dateStr;
          }
          if (fixedApp.dayOfWeek !== undefined) {
            return day.dayOfWeek === fixedApp.dayOfWeek;
          }
          return false;
        });

        const startMinutes = timeStringToMinutes(fixedApp.time);
        const duration = fixedApp.durationMinutes || demand.durationMinutes || 45;
        const endMinutes = startMinutes + duration;

        for (const day of targetDays) {
          // Inicializar estruturas diárias
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

          // Calcular trânsito em relação à sessão anterior do profissional (se houver)
          const prevSession = [...profDaySessions]
            .filter((s) => s.endMinutes <= startMinutes)
            .sort((a, b) => b.endMinutes - a.endMinutes)[0];

          let originLocation = professional.baseLocation;
          if (prevSession) {
            originLocation = prevSession.location;
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

          const sessionId = `fixed-${day.dateStr}-${professional.professionalId}-${demand.patientId}-${startMinutes}`;

          plannedSessions.push({
            id: sessionId,
            patientId: demand.patientId,
            patientName: demand.patientName,
            professionalId: professional.professionalId,
            professionalName: professional.professionalName,
            therapyType: fixedApp.therapyType || demand.therapyType,
            date: day.dateStr,
            time: fixedApp.time,
            durationMinutes: duration,
            location: demand.location,
            address: demand.address,
            transitKmFromPrevious: distanceKm,
            transitTimeMinutes: transitMinutes,
            weekNumber: day.weekNumber,
            isFixed: true,
            notes: fixedApp.notes || 'Atendimento fixo pré-estabelecido'
          });

          profDaySessions.push({
            startMinutes,
            endMinutes,
            location: demand.location
          });
          profDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);

          patientDaySessions.push({
            startMinutes,
            endMinutes
          });
          patientDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);
        }
      }
    }

    // Mapeamento de metas efetivas por demanda e semana (adaptado a semanas parciais)
    const effectiveWeeklyTargets = new Map<string, number>(); // `${demand.id}-w${week}` -> target
    demands.forEach((demand) => {
      for (let week = 1; week <= totalWeeksInMonth; week++) {
        const weekDays = workingDays.filter((w) => w.weekNumber === week);
        const availableWeekDaysCount = weekDays.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5).length;
        // Se a semana parcial tem dias úteis suficientes para a meta, mantém. Caso contrário, adapta para os dias viáveis
        const target = Math.min(demand.sessionsPerWeek, Math.max(1, availableWeekDaysCount));
        effectiveWeeklyTargets.set(`${demand.patientId}-${demand.therapyType}-w${week}`, target);
      }
    });

    // Mapeamento de profissionais elegíveis por demanda (com compatibilidade clínica ampla e Care Team resiliente)
    const demandEligibleProfs = new Map<string, ProfessionalAvailability[]>();
    for (const demand of demands) {
      const allowedProfessionals = getAllowedProfessionals(demand);
      const eligible = availabilities.filter((prof) => {
        if (!this.isProfessionalInCareTeam(prof, allowedProfessionals)) return false;
        const profSpecs = (prof.specialties && Array.isArray(prof.specialties) && prof.specialties.length > 0)
          ? prof.specialties
          : prof.specialty;
        return this.isSpecialtyCompatible(profSpecs, demand.therapyType);
      });
      demandEligibleProfs.set(`${demand.patientId}-${demand.therapyType}`, eligible);

      if (eligible.length === 0) {
        // Gargalo crítico imediato: Sem profissional com essa especialidade no Care Team
        for (let w = 1; w <= totalWeeksInMonth; w++) {
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: w,
            missingSessions: demand.sessionsPerWeek,
            reason: 'NO_CARE_TEAM_SPECIALIST',
            suggestedAction: allowedProfessionals.size === 0
              ? `Adicione ao Care Team de ${demand.patientName} um profissional habilitado em ${demand.therapyType}.`
              : `Nenhum dos ${allowedProfessionals.size} profissional(is) no Care Team de ${demand.patientName} possui a especialidade compatível com ${demand.therapyType}. Adicione um especialista.`
          });
        }
      }
    }

    // ÂNCORA DE ROTINA SEMANAL: Garante que as semanas fiquem o mais parecidas possível
    // (Mesmo dia da semana, mesmo horário e mesmo profissional para cada paciente ao longo de todo o mês)
    const weeklyRoutineAnchors = new Map<string, Array<{
      dayOfWeek: number;
      time: string;
      professionalId: string;
    }>>();

    // Helper centralizado de validação e alocação de sessão
    const tryAllocateSlot = (
      day: { dateStr: string; dayOfWeek: number; weekNumber: number },
      demand: PatientTherapyDemand,
      professional: ProfessionalAvailability,
      desiredStartMin?: number
    ): PlannedSession | null => {
      const dayWindow = this.getProfessionalDayWindow(professional, day.dateStr, day.dayOfWeek);
      if (!dayWindow || !dayWindow.enabled) return null;

      const windowStartMin = timeStringToMinutes(dayWindow.startTime);
      const windowEndMin = timeStringToMinutes(dayWindow.endTime);

      if (windowEndMin - windowStartMin < demand.durationMinutes) return null;

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

      // Janela do paciente
      let patientSlotStart = 8 * 60;
      let patientSlotEnd = 18 * 60;
      const hasExplicitPatientWindow = Boolean(
        demand.availableWindows &&
        demand.availableWindows[day.dayOfWeek] &&
        demand.availableWindows[day.dayOfWeek].enabled
      );

      if (hasExplicitPatientWindow) {
        patientSlotStart = timeStringToMinutes(demand.availableWindows![day.dayOfWeek].startTime);
        patientSlotEnd = timeStringToMinutes(demand.availableWindows![day.dayOfWeek].endTime);
      }

      let slotsToTest: number[];

      if (desiredStartMin !== undefined) {
        slotsToTest = [desiredStartMin];
      } else {
        // Gera horários candidatos dinâmicos
        const candidateStartMinutes: number[] = [];
        for (let t = windowStartMin; t <= windowEndMin - demand.durationMinutes; t += 15) {
          candidateStartMinutes.push(t);
        }

        // Encaixe preciso logo após sessão anterior do profissional
        for (const existing of profDaySessions) {
          const distanceKm = calculateHaversineDistance(
            existing.location.latitude,
            existing.location.longitude,
            demand.location.latitude,
            demand.location.longitude
          );
          const transit = estimateTransitTimeMinutes(distanceKm, this.averageSpeedKmh, this.bufferMinutes);
          const exactNext = Math.ceil((existing.endMinutes + transit) / 5) * 5;
          if (exactNext >= windowStartMin && exactNext <= windowEndMin - demand.durationMinutes) {
            if (!candidateStartMinutes.includes(exactNext)) {
              candidateStartMinutes.push(exactNext);
            }
          }
        }

        // Encaixes após blocos de indisponibilidade
        for (const b of (professional.unavailabilityBlocks || [])) {
          const isEndOnThisDay = (!b.endDateStr && (b.dateStr === day.dateStr || (!b.dateStr && b.dayOfWeek === day.dayOfWeek)))
            || (b.endDateStr && b.endDateStr === day.dateStr);
          if (isEndOnThisDay) {
            const bEndMin = timeStringToMinutes(b.endTime);
            if (bEndMin >= windowStartMin && bEndMin <= windowEndMin - demand.durationMinutes) {
              if (!candidateStartMinutes.includes(bEndMin)) candidateStartMinutes.push(bEndMin);
            }
          }
        }

        for (const b of (demand.unavailabilityBlocks || [])) {
          const isEndOnThisDay = (!b.endDateStr && (b.dateStr === day.dateStr || (!b.dateStr && b.dayOfWeek === day.dayOfWeek)))
            || (b.endDateStr && b.endDateStr === day.dateStr);
          if (isEndOnThisDay) {
            const bEndMin = timeStringToMinutes(b.endTime);
            if (bEndMin >= windowStartMin && bEndMin <= windowEndMin - demand.durationMinutes) {
              if (!candidateStartMinutes.includes(bEndMin)) candidateStartMinutes.push(bEndMin);
            }
          }
        }

        candidateStartMinutes.sort((a, b) => a - b);

        const filteredSlots = candidateStartMinutes.filter((slotMin) => {
          const slotEnd = slotMin + demand.durationMinutes;
          if (hasExplicitPatientWindow) {
            return slotMin >= patientSlotStart && slotEnd <= patientSlotEnd;
          }
          if (demand.preferredShift === 'morning') {
            return slotMin <= 12 * 60 + 15;
          }
          if (demand.preferredShift === 'afternoon') {
            return slotMin >= 12 * 60;
          }
          return true;
        });

        slotsToTest = hasExplicitPatientWindow
          ? filteredSlots
          : (filteredSlots.length > 0 ? filteredSlots : candidateStartMinutes);
      }

      for (const sessionStartMin of slotsToTest) {
        const sessionEndMin = sessionStartMin + demand.durationMinutes;

        if (sessionStartMin < windowStartMin || sessionEndMin > windowEndMin) continue;
        if (hasExplicitPatientWindow && (sessionStartMin < patientSlotStart || sessionEndMin > patientSlotEnd)) continue;

        // Conflito profissional
        const hasProfOverlap = profDaySessions.some(
          (s) => Math.max(sessionStartMin, s.startMinutes) < Math.min(sessionEndMin, s.endMinutes)
        );
        if (hasProfOverlap) continue;

        const hasProfBlockOverlap = (professional.unavailabilityBlocks || []).some((b) =>
          isSlotBlockedByTimeBlock(day.dateStr, day.dayOfWeek, sessionStartMin, sessionEndMin, b)
        );
        if (hasProfBlockOverlap) continue;

        // Conflito paciente
        const hasPatientOverlap = patientDaySessions.some(
          (s) => Math.max(sessionStartMin, s.startMinutes) < Math.min(sessionEndMin, s.endMinutes)
        );
        if (hasPatientOverlap) continue;

        const hasPatientBlockOverlap = (demand.unavailabilityBlocks || []).some((b) =>
          isSlotBlockedByTimeBlock(day.dateStr, day.dayOfWeek, sessionStartMin, sessionEndMin, b)
        );
        if (hasPatientBlockOverlap) continue;

        // Deslocamento anterior
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
        if (prevSession && availableGapMinutes < transitMinutes) continue;

        // Deslocamento próximo
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
          if (nextSession.startMinutes - sessionEndMin < transitToNext) continue;
        }

        // Sucesso na alocação!
        const sessionId = `plan-${day.dateStr}-${professional.professionalId}-${demand.patientId}-${sessionStartMin}`;
        const newSession: PlannedSession = {
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
          weekNumber: day.weekNumber
        };

        plannedSessions.push(newSession);

        profDaySessions.push({ startMinutes: sessionStartMin, endMinutes: sessionEndMin, location: demand.location });
        profDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);

        patientDaySessions.push({ startMinutes: sessionStartMin, endMinutes: sessionEndMin });
        patientDaySessions.sort((a, b) => a.startMinutes - b.startMinutes);

        return newSession;
      }

      return null;
    };

    // ALOCAÇÃO SEMANA A SEMANA COM DISTRIBUIÇÃO EQUITATIVA E ROTINA SEMANAL ESTÁVEL
    const maxSessionsAnyDemand = Math.max(...demands.map((d) => d.sessionsPerWeek), 1);

    for (let week = 1; week <= totalWeeksInMonth; week++) {
      const weekDays = workingDays.filter((w) => w.weekNumber === week);

      // PASSO A: SE SEMANA > 1, APLICA PRIMEIRAMENTE A ÂNCORA DE ROTINA IDÊNTICA
      // Tenta manter exatamente o mesmo dia da semana, mesmo horário e mesmo profissional
      if (week > 1) {
        for (const demand of demands) {
          const demandKey = `${demand.patientId}-${demand.therapyType}`;
          const anchors = weeklyRoutineAnchors.get(demandKey) || [];
          if (anchors.length === 0) continue;

          const weeklyTarget = effectiveWeeklyTargets.get(`${demandKey}-w${week}`) || demand.sessionsPerWeek;

          for (const anchor of anchors) {
            const currentAllocated = plannedSessions.filter(
              (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.weekNumber === week
            ).length;
            if (currentAllocated >= weeklyTarget) break;

            // Checa se já tem atendimento desta demanda no mesmo dia desta semana
            const matchingDay = weekDays.find((d) => d.dayOfWeek === anchor.dayOfWeek);
            if (!matchingDay) continue;

            const alreadyToday = plannedSessions.some(
              (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.date === matchingDay.dateStr
            );
            if (alreadyToday) continue;

            const prof = availabilities.find(
              (p) =>
                p.professionalId === anchor.professionalId ||
                (p.id && p.id === anchor.professionalId)
            );
            if (!prof) continue;

            // Tenta alocar exatamente no horário e dia ancorados da rotina semanal
            tryAllocateSlot(matchingDay, demand, prof, timeStringToMinutes(anchor.time));
          }
        }
      }

      // PASSO B: RODADAS DE ALOCAÇÃO FLEXÍVEL (ROUND-ROBIN) PARA DEMANDAS RESTANTES / SEMANA 1
      for (let sessionRound = 1; sessionRound <= maxSessionsAnyDemand; sessionRound++) {
        const activeDemands = demands.filter((demand) => {
          const eligible = demandEligibleProfs.get(`${demand.patientId}-${demand.therapyType}`) || [];
          if (eligible.length === 0) return false;
          if (demand.sessionsPerWeek < sessionRound) return false;

          const currentAllocated = plannedSessions.filter(
            (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.weekNumber === week
          ).length;
          const weeklyTarget = effectiveWeeklyTargets.get(`${demand.patientId}-${demand.therapyType}-w${week}`) || demand.sessionsPerWeek;
          return currentAllocated < weeklyTarget;
        });

        // Alterna a ordem dos pacientes entre rodadas para não privilegiar sempre os mesmos
        const shuffledDemands = [...activeDemands].sort((a, b) => {
          const allocA = plannedSessions.filter((s) => s.patientId === a.patientId && s.weekNumber === week).length;
          const allocB = plannedSessions.filter((s) => s.patientId === b.patientId && s.weekNumber === week).length;
          return allocA - allocB;
        });

        for (const demand of shuffledDemands) {
          const demandKey = `${demand.patientId}-${demand.therapyType}`;
          const currentAllocated = plannedSessions.filter(
            (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.weekNumber === week
          ).length;
          const weeklyTarget = effectiveWeeklyTargets.get(`${demandKey}-w${week}`) || demand.sessionsPerWeek;
          if (currentAllocated >= weeklyTarget) continue;

          const eligibleProfessionals = demandEligibleProfs.get(demandKey) || [];

          // Padrão de espaçamento alternado e balanceado por paciente
          const hashStr = demandKey;
          let hashNum = 0;
          for (let i = 0; i < hashStr.length; i++) {
            hashNum = (hashNum << 5) - hashNum + hashStr.charCodeAt(i);
            hashNum |= 0;
          }
          const patternIndex = Math.abs(hashNum);

          let targetDayPatterns: number[];
          if (demand.sessionsPerWeek >= 4) {
            targetDayPatterns = [1, 2, 4, 5];
          } else if (demand.sessionsPerWeek === 3) {
            const patterns3 = [
              [1, 3, 5],
              [2, 4, 1],
              [2, 3, 5],
              [1, 2, 4]
            ];
            targetDayPatterns = patterns3[patternIndex % patterns3.length];
          } else if (demand.sessionsPerWeek === 2) {
            const patterns2 = [
              [2, 4], // Ter, Qui
              [1, 3], // Seg, Qua
              [3, 5], // Qua, Sex
              [1, 4], // Seg, Qui
              [2, 5], // Ter, Sex
              [1, 5]  // Seg, Sex
            ];
            targetDayPatterns = patterns2[patternIndex % patterns2.length];
          } else {
            const patterns1 = [[3], [2], [4], [1], [5]];
            targetDayPatterns = patterns1[patternIndex % patterns1.length];
          }

          const candidateDays = [
            ...weekDays.filter((d) => targetDayPatterns.includes(d.dayOfWeek)),
            ...weekDays.filter((d) => !targetDayPatterns.includes(d.dayOfWeek))
          ];

          for (const day of candidateDays) {
            const nowAllocated = plannedSessions.filter(
              (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.weekNumber === week
            ).length;
            if (nowAllocated >= weeklyTarget) break;

            // Checa disponibilidade do paciente para este dia da semana
            if (demand.availableWindows && Object.keys(demand.availableWindows).length > 0) {
              const patDayWindow = demand.availableWindows[day.dayOfWeek];
              if (!patDayWindow || !patDayWindow.enabled) continue;
            }

            // Não repete a mesma terapia no mesmo dia
            const alreadyHasSameTherapyToday = plannedSessions.some(
              (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.date === day.dateStr
            );
            if (alreadyHasSameTherapyToday) continue;

            let allocatedForThisDay = false;

            // Balanceamento de Carga Inteligente e Equitativo entre Profissionais:
            // 1. Quem tem menos sessões alocadas na semana atual (week) tem prioridade máxima
            // 2. Se empatar, quem tem menos sessões acumuladas no mês tem prioridade
            // 3. Proximidade geodésica em relação à residência do paciente (menor deslocamento urbano)
            // (Critério de vínculo clínico/continuidade removido para evitar distorção de carga)
            const sortedProfessionals = [...eligibleProfessionals].sort((pA, pB) => {
              const sessionsWeekA = plannedSessions.filter(
                (s) => s.professionalId === pA.professionalId && s.weekNumber === week
              ).length;
              const sessionsWeekB = plannedSessions.filter(
                (s) => s.professionalId === pB.professionalId && s.weekNumber === week
              ).length;
              if (sessionsWeekA !== sessionsWeekB) {
                return sessionsWeekA - sessionsWeekB;
              }

              const sessionsMonthA = plannedSessions.filter(
                (s) => s.professionalId === pA.professionalId
              ).length;
              const sessionsMonthB = plannedSessions.filter(
                (s) => s.professionalId === pB.professionalId
              ).length;
              if (sessionsMonthA !== sessionsMonthB) {
                return sessionsMonthA - sessionsMonthB;
              }

              const distA = calculateHaversineDistance(
                pA.baseLocation.latitude,
                pA.baseLocation.longitude,
                demand.location.latitude,
                demand.location.longitude
              );
              const distB = calculateHaversineDistance(
                pB.baseLocation.latitude,
                pB.baseLocation.longitude,
                demand.location.latitude,
                demand.location.longitude
              );
              return distA - distB;
            });

            for (const professional of sortedProfessionals) {
              if (allocatedForThisDay) break;

              const session = tryAllocateSlot(day, demand, professional);
              if (session) {
                allocatedForThisDay = true;

                // Registra na Âncora de Rotina Semanal para que as semanas subsequentes repliquem esse padrão
                const existingAnchors = weeklyRoutineAnchors.get(demandKey) || [];
                if (existingAnchors.length < demand.sessionsPerWeek) {
                  const alreadyHasDay = existingAnchors.some((a) => a.dayOfWeek === day.dayOfWeek);
                  if (!alreadyHasDay) {
                    existingAnchors.push({
                      dayOfWeek: day.dayOfWeek,
                      time: session.time,
                      professionalId: professional.professionalId
                    });
                    weeklyRoutineAnchors.set(demandKey, existingAnchors);
                  }
                }
                break;
              }
            }
          }
        }
      }

      // Registro de gargalos por semana para cada demanda
      for (const demand of demands) {
        const eligible = demandEligibleProfs.get(`${demand.patientId}-${demand.therapyType}`) || [];
        if (eligible.length === 0) continue; // Já registrado como NO_CARE_TEAM_SPECIALIST

        const currentAllocated = plannedSessions.filter(
          (s) => s.patientId === demand.patientId && s.therapyType === demand.therapyType && s.weekNumber === week
        ).length;

        const effectiveTarget = effectiveWeeklyTargets.get(`${demand.patientId}-${demand.therapyType}-w${week}`) || demand.sessionsPerWeek;

        if (currentAllocated < effectiveTarget) {
          const missing = effectiveTarget - currentAllocated;
          bottlenecks.push({
            patientId: demand.patientId,
            patientName: demand.patientName,
            therapyType: demand.therapyType,
            weekNumber: week,
            missingSessions: missing,
            reason: 'PROFESSIONAL_CAPACITY_EXCEEDED',
            suggestedAction: `As janelas de horário dos terapeutas autorizados (${eligible.map((p) => p.professionalName).join(', ')}) não comportam mais atendimentos na Semana ${week}. Sugestão: ampliar a jornada diária ou autorizar terapeuta adicional no Care Team.`
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
      let demandedMonthly = 0;
      for (let w = 1; w <= totalWeeksInMonth; w++) {
        demandedMonthly += (effectiveWeeklyTargets.get(`${demand.patientId}-${demand.therapyType}-w${w}`) || demand.sessionsPerWeek);
      }

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
   * Valida se a especialidade do profissional atende ao tipo de terapia solicitado com compatibilidade clínica ampla.
   */
  private isSpecialtyCompatible(professionalSpecialty: string | string[], demandedTherapy: string): boolean {
    if (!professionalSpecialty || !demandedTherapy) return false;

    const demand = demandedTherapy.toLowerCase().trim();
    const specs: string[] = (Array.isArray(professionalSpecialty)
      ? professionalSpecialty
      : professionalSpecialty.split(/[,;/+]+/)
    ).map((s) => s.toLowerCase().trim());

    // Se o profissional tem habilitação geral "Fisioterapia" ou "Fisioterapia Domiciliar",
    // ele pode atender demandas de Fisioterapia Motora, Respiratória ou Cardiorrespiratória
    const hasGeneralFisio = specs.some((s) =>
      s === 'fisioterapia' ||
      s === 'fisioterapia domiciliar' ||
      s === 'fisioterapeuta' ||
      s === 'fisio' ||
      s.includes('fisioterapia')
    );

    const demandIsMotora = demand.includes('motora');
    const demandIsRespirat = demand.includes('respirat') || demand.includes('cardio');

    if (demandIsMotora && demandIsRespirat) {
      // Demanda combinada (Cardiorrespiratória & Motora): aceita fisioterapeuta geral, motora ou respiratória
      return hasGeneralFisio || specs.some((s) => s.includes('motora') || s.includes('respirat') || s.includes('cardio'));
    }

    if (demandIsMotora) {
      return hasGeneralFisio || specs.some((s) => s.includes('motora'));
    }

    if (demandIsRespirat) {
      return hasGeneralFisio || specs.some((s) => s.includes('respirat') || s.includes('cardio'));
    }

    if (demand.includes('ocupacional') || demand.includes('to')) {
      return specs.some((s) => s.includes('ocupacional') || s.includes('to'));
    }

    if (demand.includes('fono')) {
      return specs.some((s) => s.includes('fono'));
    }

    return specs.some((s) => s.includes(demand) || demand.includes(s));
  }

  /**
   * Valida com máxima resiliência se o profissional está presente no Care Team do paciente.
   * Suporta correspondência por professionalId, id, professionalName ou name (exata ou case-insensitive).
   */
  public isProfessionalInCareTeam(
    prof: ProfessionalAvailability,
    allowedIdsOrNames: Set<string>
  ): boolean {
    if (!allowedIdsOrNames || allowedIdsOrNames.size === 0) return false;

    // 1. Verificação direta por professionalId ou id
    if (allowedIdsOrNames.has(prof.professionalId)) return true;
    if (prof.id && allowedIdsOrNames.has(prof.id)) return true;

    // 2. Verificação direta por professionalName ou name
    if (prof.professionalName && allowedIdsOrNames.has(prof.professionalName)) return true;
    if (prof.name && allowedIdsOrNames.has(prof.name)) return true;

    // 3. Verificação normalizada (case-insensitive e sem espaços)
    const profIdNorm = prof.professionalId.toLowerCase().trim();
    const profNameNorm = (prof.professionalName || prof.name || '').toLowerCase().trim();
    const idNorm = (prof.id || '').toLowerCase().trim();

    for (const allowed of allowedIdsOrNames) {
      const allowedNorm = (allowed || '').toLowerCase().trim();
      if (!allowedNorm) continue;
      if (allowedNorm === profIdNorm) return true;
      if (idNorm && allowedNorm === idNorm) return true;
      if (profNameNorm && (allowedNorm === profNameNorm || profNameNorm.includes(allowedNorm) || allowedNorm.includes(profNameNorm))) {
        return true;
      }
    }

    return false;
  }
}
