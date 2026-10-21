// src/components/BottlenecksVisualManager.jsx
import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  MapPin,
  Bot
} from 'lucide-react';
import './BottlenecksVisualManager.css';

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMin) {
  const normalized = Math.max(0, totalMin);
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getEndTime(startStr, durationMin = 45) {
  return minutesToTime(timeToMinutes(startStr) + Number(durationMin));
}

function getShortDisplayName(name) {
  if (!name) return 'Profissional';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1 && /^(dr|dra|enf|ft|fono|nutri|prof)\b/i.test(parts[0])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || 'Profissional';
}


const PX_PER_MINUTE = 0.8; // Proporção uniforme: 60 minutos = 48px
const GRID_START_TIME = '08:00';
const GRID_END_TIME = '18:00';
const GRID_START_MIN = 8 * 60; // 480
const GRID_END_MIN = 18 * 60;  // 1080
const TOTAL_GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MINUTE; // 480px

const HOURS_SCALE = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

const WEEKDAYS = [
  { num: 1, name: 'Segunda', short: 'Seg' },
  { num: 2, name: 'Terça', short: 'Ter' },
  { num: 3, name: 'Quarta', short: 'Qua' },
  { num: 4, name: 'Quinta', short: 'Qui' },
  { num: 5, name: 'Sexta', short: 'Sex' },
  { num: 6, name: 'Sábado', short: 'Sáb' },
  { num: 0, name: 'Domingo', short: 'Dom' }
];

/**
 * Constrói os slots proporcionais de tempo para um profissional em um dia específico (ou genérico)
 */
function buildDaySlotsForProf(currentProf, dateStr, dayOfWeek, plannedSessions) {
  if (!currentProf) return { isOff: true, slots: [], dayName: '' };
  const windows = currentProf.weekdayWindows || {};
  const blocks = currentProf.unavailabilityBlocks || [];

  let win = windows[dayOfWeek];
  if (dateStr && currentProf.dateOverrides && currentProf.dateOverrides[dateStr]) {
    win = currentProf.dateOverrides[dateStr];
  }

  if (!win || !win.enabled) {
    return { isOff: true, slots: [], dayName: '' };
  }

  const winStartTime = win.startTime || '08:00';
  const winEndTime = win.endTime || '18:00';

  // Sessões: se dateStr fornecido, filtra pela data exata; senão por dia da semana
  const daySessions = plannedSessions.filter((s) => {
    if (s.professionalId !== currentProf.professionalId) return false;
    if (dateStr) return s.date === dateStr;
    const d = new Date(s.date + 'T12:00:00');
    return d.getDay() === dayOfWeek;
  });

  // Bloqueios ativos neste dia
  const dayBlocks = blocks.filter((b) => {
    if (dateStr) {
      if (b.dateStr && !b.endDateStr) return b.dateStr === dateStr;
      if (b.dateStr && b.endDateStr) return dateStr >= b.dateStr && dateStr <= b.endDateStr;
      return b.dayOfWeek === dayOfWeek;
    }
    return b.dayOfWeek === dayOfWeek;
  });

  const uniqueSessionsMap = new Map();
  daySessions.forEach((s) => {
    const key = `${s.time}-${s.patientName}`;
    if (!uniqueSessionsMap.has(key)) {
      uniqueSessionsMap.set(key, s);
    }
  });
  const uniqueDaySessions = Array.from(uniqueSessionsMap.values());

  const allEvents = [];

  uniqueDaySessions.forEach((s) => {
    const transitMinutes = Number(s.transitTimeMinutes) || 0;
    const aptStartMinutes = timeToMinutes(s.time);

    if (transitMinutes > 0) {
      const transitStartMinutes = Math.max(0, aptStartMinutes - transitMinutes);
      const transitStartTime = minutesToTime(transitStartMinutes);
      allEvents.push({
        type: 'transit',
        time: transitStartTime,
        endTime: s.time,
        duration: transitMinutes,
        title: `🚗 Deslocamento (${transitMinutes}m)`,
        fullDetails: `Em trânsito até ${s.patientName} (${transitMinutes} min${s.transitKmFromPrevious ? ` • ${s.transitKmFromPrevious.toFixed(1)} km` : ''})`
      });
    }

    const dur = s.durationMinutes || 45;
    allEvents.push({
      type: 'occupied',
      time: s.time,
      endTime: getEndTime(s.time, dur),
      duration: dur,
      title: s.patientName,
      patientName: s.patientName,
      fullDetails: `Atendimento de ${s.therapyType} com ${s.patientName} • ${s.address?.split('-')[0]?.trim() || ''}`
    });
  });

  dayBlocks.forEach((b) => {
    const startMin = timeToMinutes(b.startTime);
    const endMin = timeToMinutes(b.endTime);
    const dur = Math.max(15, endMin - startMin);
    allEvents.push({
      type: 'blocked',
      time: b.startTime,
      endTime: b.endTime,
      duration: dur,
      title: b.reason || 'Compromisso',
      fullDetails: `Indisponibilidade do Profissional: ${b.reason || 'Compromisso particular'} (${b.startTime} às ${b.endTime})`
    });
  });

  allEvents.sort((a, b) => {
    const cmp = a.time.localeCompare(b.time);
    if (cmp !== 0) return cmp;
    const typeOrder = { transit: 1, blocked: 2, occupied: 3 };
    return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
  });

  const slots = [];

  if (timeToMinutes(winStartTime) > GRID_START_MIN) {
    slots.push({
      type: 'off',
      time: GRID_START_TIME,
      endTime: winStartTime,
      duration: timeToMinutes(winStartTime) - GRID_START_MIN,
      title: 'Fora do Horário',
      fullDetails: `Início do expediente às ${winStartTime}`
    });
  }

  let cursor = winStartTime;

  allEvents.forEach((ev) => {
    const evEndTime = ev.endTime || getEndTime(ev.time, ev.duration || 45);

    if (timeToMinutes(evEndTime) <= timeToMinutes(cursor)) return;

    if (timeToMinutes(ev.time) > timeToMinutes(cursor)) {
      const freeDur = timeToMinutes(ev.time) - timeToMinutes(cursor);
      slots.push({
        type: 'free',
        time: cursor,
        endTime: ev.time,
        duration: freeDur,
        title: `Livre (${freeDur}m)`,
        fullDetails: `Janela disponível para atendimentos (${cursor} às ${ev.time} • ${freeDur} min)`
      });
    }

    const adjustedStartTime = timeToMinutes(ev.time) < timeToMinutes(cursor) ? cursor : ev.time;
    const actualDur = timeToMinutes(evEndTime) - timeToMinutes(adjustedStartTime);

    slots.push({
      ...ev,
      time: adjustedStartTime,
      endTime: evEndTime,
      duration: actualDur
    });

    if (timeToMinutes(evEndTime) > timeToMinutes(cursor)) {
      cursor = evEndTime;
    }
  });

  if (timeToMinutes(cursor) < timeToMinutes(winEndTime)) {
    const freeDur = timeToMinutes(winEndTime) - timeToMinutes(cursor);
    slots.push({
      type: 'free',
      time: cursor,
      endTime: winEndTime,
      duration: freeDur,
      title: `Livre (${freeDur}m)`,
      fullDetails: `Janela disponível para atendimentos (${cursor} às ${winEndTime} • ${freeDur} min)`
    });
  }

  if (timeToMinutes(winEndTime) < GRID_END_MIN) {
    slots.push({
      type: 'off',
      time: winEndTime,
      endTime: GRID_END_TIME,
      duration: GRID_END_MIN - timeToMinutes(winEndTime),
      title: 'Fora do Horário',
      fullDetails: `Término do expediente às ${winEndTime}`
    });
  }

  return {
    isOff: false,
    startTime: winStartTime,
    endTime: winEndTime,
    slots,
    totalSessions: uniqueDaySessions.length
  };
}

/**
 * Constrói os slots proporcionais de tempo para um paciente em um dia específico (ou genérico)
 */
function buildDaySlotsForPatient(currentPatient, dateStr, dayOfWeek, plannedSessions) {
  if (!currentPatient) return { isOff: true, slots: [], dayName: '' };
  const blocks = currentPatient.unavailabilityBlocks || [];

  const daySessions = plannedSessions.filter((s) => {
    if (s.patientId !== currentPatient.patientId) return false;
    if (dateStr) return s.date === dateStr;
    const d = new Date(s.date + 'T12:00:00');
    return d.getDay() === dayOfWeek;
  });

  let dayWin = null;
  if (currentPatient.demands) {
    for (const d of currentPatient.demands) {
      if (d.availableWindows && d.availableWindows[dayOfWeek]) {
        dayWin = d.availableWindows[dayOfWeek];
        break;
      }
    }
  }

  if (!dayWin) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      dayWin = { enabled: true, startTime: '08:00', endTime: '18:00' };
    } else if (daySessions.length > 0) {
      dayWin = { enabled: true, startTime: '08:00', endTime: '18:00' };
    } else {
      dayWin = { enabled: false, startTime: '08:00', endTime: '18:00' };
    }
  }

  if (!dayWin.enabled && daySessions.length === 0) {
    return { isOff: true, slots: [], dayName: '' };
  }

  const winStartTime = dayWin.startTime || '08:00';
  const winEndTime = dayWin.endTime || '18:00';

  const dayBlocks = blocks.filter((b) => {
    if (dateStr) {
      if (b.dateStr && !b.endDateStr) return b.dateStr === dateStr;
      if (b.dateStr && b.endDateStr) return dateStr >= b.dateStr && dateStr <= b.endDateStr;
      return b.dayOfWeek === dayOfWeek;
    }
    return b.dayOfWeek === dayOfWeek;
  });

  const uniqueSessionsMap = new Map();
  daySessions.forEach((s) => {
    const key = `${s.time}-${s.professionalName}`;
    if (!uniqueSessionsMap.has(key)) {
      uniqueSessionsMap.set(key, s);
    }
  });
  const uniqueDaySessions = Array.from(uniqueSessionsMap.values());

  const allEvents = [];

  uniqueDaySessions.forEach((s) => {
    const dur = s.durationMinutes || 45;
    allEvents.push({
      type: 'occupied',
      time: s.time,
      endTime: getEndTime(s.time, dur),
      duration: dur,
      title: s.professionalName || 'Terapeuta',
      professionalName: s.professionalName,
      fullDetails: `Sessão de ${s.therapyType} com ${s.professionalName} (${s.time} às ${getEndTime(s.time, dur)})`
    });
  });

  dayBlocks.forEach((b) => {
    const startMin = timeToMinutes(b.startTime);
    const endMin = timeToMinutes(b.endTime);
    const dur = Math.max(15, endMin - startMin);
    allEvents.push({
      type: 'blocked',
      time: b.startTime,
      endTime: b.endTime,
      duration: dur,
      title: b.reason || 'Compromisso',
      fullDetails: `Indisponibilidade do Paciente: ${b.reason || 'Compromisso particular'} (${b.startTime} às ${b.endTime})`
    });
  });

  allEvents.sort((a, b) => a.time.localeCompare(b.time));

  const slots = [];

  if (timeToMinutes(winStartTime) > GRID_START_MIN) {
    slots.push({
      type: 'off',
      time: GRID_START_TIME,
      endTime: winStartTime,
      duration: timeToMinutes(winStartTime) - GRID_START_MIN,
      title: 'Fora da Janela',
      fullDetails: `Horário fora da janela de preferência do paciente (08:00 às ${winStartTime})`
    });
  }

  let cursor = winStartTime;

  allEvents.forEach((ev) => {
    const evEndTime = ev.endTime || getEndTime(ev.time, ev.duration || 45);

    if (timeToMinutes(evEndTime) <= timeToMinutes(cursor)) return;

    if (timeToMinutes(ev.time) > timeToMinutes(cursor)) {
      const freeDur = timeToMinutes(ev.time) - timeToMinutes(cursor);
      slots.push({
        type: 'free',
        time: cursor,
        endTime: ev.time,
        duration: freeDur,
        title: `Disponível (${freeDur}m)`,
        fullDetails: `Janela disponível para receber atendimento (${cursor} às ${ev.time} • ${freeDur} min)`
      });
    }

    const adjustedStartTime = timeToMinutes(ev.time) < timeToMinutes(cursor) ? cursor : ev.time;
    const actualDur = timeToMinutes(evEndTime) - timeToMinutes(adjustedStartTime);

    slots.push({
      ...ev,
      time: adjustedStartTime,
      endTime: evEndTime,
      duration: actualDur
    });

    if (timeToMinutes(evEndTime) > timeToMinutes(cursor)) {
      cursor = evEndTime;
    }
  });

  if (timeToMinutes(cursor) < timeToMinutes(winEndTime)) {
    const freeDur = timeToMinutes(winEndTime) - timeToMinutes(cursor);
    slots.push({
      type: 'free',
      time: cursor,
      endTime: winEndTime,
      duration: freeDur,
      title: `Disponível (${freeDur}m)`,
      fullDetails: `Janela disponível para receber atendimento (${cursor} às ${winEndTime} • ${freeDur} min)`
    });
  }

  if (timeToMinutes(winEndTime) < GRID_END_MIN) {
    slots.push({
      type: 'off',
      time: winEndTime,
      endTime: GRID_END_TIME,
      duration: GRID_END_MIN - timeToMinutes(winEndTime),
      title: 'Fora da Janela',
      fullDetails: `Horário fora da janela de preferência do paciente (${winEndTime} às 18:00)`
    });
  }

  return {
    isOff: false,
    startTime: winStartTime,
    endTime: winEndTime,
    slots,
    totalSessions: uniqueDaySessions.length
  };
}

export default function BottlenecksVisualManager({
  scaleResult,
  professionalAvailabilities = [],
  patientsWithDemands = [],
  careTeams = [],
  onApplyMutation,
  onOpenAIChat
}) {
  const [activeView, setActiveView] = useState('calendar'); // 'calendar' | 'solutions'
  const [calendarMode, setCalendarMode] = useState('professionals'); // 'professionals' | 'patients'
  const [selectedProfId, setSelectedProfId] = useState(() => {
    return professionalAvailabilities[0]?.professionalId || '';
  });
  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    return patientsWithDemands[0]?.patientId || '';
  });
  const [expandedBottlenecks, setExpandedBottlenecks] = useState({});

  const bottlenecks = scaleResult?.bottlenecks || [];
  const plannedSessions = scaleResult?.plannedSessions || [];

  // Toggle expansão de mini calendário inline em um card de gargalo
  const toggleInlineCalendar = (idx) => {
    setExpandedBottlenecks((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Encontra profissionais candidatos com a especialidade para suprir Care Team
  const findCandidatesForTherapy = (therapyType) => {
    if (!therapyType) return [];
    const term = therapyType.toLowerCase().slice(0, 8);
    return professionalAvailabilities.filter((p) => {
      const specs = p.specialties || [p.specialty];
      return specs.some((s) => s.toLowerCase().includes(term));
    });
  };

  // Ação 1-Clique: Autorizar profissional no Care Team do paciente
  const handleAuthorizeCareTeam = (patientId, professionalId, patientName, professionalName) => {
    const currentCt = careTeams.find((c) => c.patientId === patientId) || {
      patientId,
      professionalIds: []
    };

    const nextIds = [...new Set([...currentCt.professionalIds, professionalId])];
    const newCareTeams = [
      ...careTeams.filter((c) => c.patientId !== patientId),
      { patientId, professionalIds: nextIds }
    ];

    if (onApplyMutation) {
      onApplyMutation({ newCareTeams });
    }
  };

  // Ação 1-Clique: Habilitar dia de atendimento (ex: sábado ou domingo)
  const handleEnableDay = (professionalId, dayNum) => {
    const newProfessionalAvailabilities = professionalAvailabilities.map((p) => {
      if (p.professionalId === professionalId) {
        return {
          ...p,
          weekdayWindows: {
            ...p.weekdayWindows,
            [dayNum]: { enabled: true, startTime: '08:00', endTime: '18:00' }
          }
        };
      }
      return p;
    });

    if (onApplyMutation) {
      onApplyMutation({ newProfessionalAvailabilities });
    }
  };

  // Ação 1-Clique: Ampliar jornada até 19:00
  const handleExtendHours = (professionalId, dayNum) => {
    const newProfessionalAvailabilities = professionalAvailabilities.map((p) => {
      if (p.professionalId === professionalId) {
        const currentWin = p.weekdayWindows?.[dayNum] || { enabled: true, startTime: '08:00', endTime: '18:00' };
        return {
          ...p,
          weekdayWindows: {
            ...p.weekdayWindows,
            [dayNum]: { ...currentWin, endTime: '19:00' }
          }
        };
      }
      return p;
    });

    if (onApplyMutation) {
      onApplyMutation({ newProfessionalAvailabilities });
    }
  };

  // Profissional ativo selecionado para o calendário
  const currentProf = useMemo(() => {
    return (
      professionalAvailabilities.find((p) => p.professionalId === selectedProfId) ||
      professionalAvailabilities[0] ||
      null
    );
  }, [selectedProfId, professionalAvailabilities]);

  // Lista segura de pacientes com demandas
  const safePatients = useMemo(() => {
    if (patientsWithDemands && patientsWithDemands.length > 0) {
      return patientsWithDemands;
    }
    const map = new Map();
    plannedSessions.forEach((s) => {
      if (!map.has(s.patientId)) {
        map.set(s.patientId, {
          patientId: s.patientId,
          patientName: s.patientName,
          address: s.address,
          demands: [{ therapyType: s.therapyType, sessionsPerWeek: 1 }],
          unavailabilityBlocks: []
        });
      }
    });
    return Array.from(map.values());
  }, [patientsWithDemands, plannedSessions]);

  const currentPatient = useMemo(() => {
    return (
      safePatients.find((p) => p.patientId === selectedPatientId) ||
      safePatients[0] ||
      null
    );
  }, [selectedPatientId, safePatients]);

  const [selectedWeek, setSelectedWeek] = useState('all'); // 'all' | 1 | 2 | 3 | 4 | 5

  // Calcula todas as semanas do mês atual com suas datas reais
  const monthWeeks = useMemo(() => {
    const year = scaleResult?.year || 2026;
    const month = scaleResult?.month || 10;
    const daysInMonth = new Date(year, month, 0).getDate();

    const weeksMap = new Map();
    let currentWeekNum = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay(); // 0 = Dom, 1 = Seg, ..., 6 = Sab
      if (dayOfWeek === 1 && day > 1) {
        currentWeekNum++;
      }

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekdayObj = WEEKDAYS.find((w) => w.num === dayOfWeek) || WEEKDAYS[0];

      if (!weeksMap.has(currentWeekNum)) {
        weeksMap.set(currentWeekNum, []);
      }

      weeksMap.get(currentWeekNum).push({
        dateStr,
        dayOfMonth: day,
        dayOfWeek,
        dayName: weekdayObj.name,
        shortName: weekdayObj.short,
        formattedDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
      });
    }

    return Array.from(weeksMap.entries()).map(([weekNum, days]) => {
      const firstDay = days[0].formattedDate;
      const lastDay = days[days.length - 1].formattedDate;
      return {
        weekNumber: weekNum,
        label: `Semana ${weekNum} (${firstDay} a ${lastDay})`,
        shortLabel: `Semana ${weekNum}`,
        dateRange: `${firstDay} a ${lastDay}`,
        days
      };
    });
  }, [scaleResult?.year, scaleResult?.month]);

  // Semanas filtradas para exibição
  const weeksToRender = useMemo(() => {
    if (selectedWeek === 'all') return monthWeeks;
    return monthWeeks.filter((w) => w.weekNumber === selectedWeek);
  }, [selectedWeek, monthWeeks]);

  // Slots padrão (semana genérica) para uso no acordeão inline de gargalos
  const profWeeklySlots = useMemo(() => {
    if (!currentProf) return {};
    const result = {};
    WEEKDAYS.forEach(({ num: dayNum, name: dayName }) => {
      result[dayNum] = {
        ...buildDaySlotsForProf(currentProf, null, dayNum, plannedSessions),
        dayName
      };
    });
    return result;
  }, [currentProf, plannedSessions]);

  // Calcula slots padrão (semana genérica) para uso no paciente
  const patientWeeklySlots = useMemo(() => {
    if (!currentPatient) return {};
    const result = {};
    WEEKDAYS.forEach(({ num: dayNum, name: dayName }) => {
      result[dayNum] = {
        ...buildDaySlotsForPatient(currentPatient, null, dayNum, plannedSessions),
        dayName
      };
    });
    return result;
  }, [currentPatient, plannedSessions]);

  // Contagem de gargalos por tipo
  const careTeamBottlenecks = bottlenecks.filter((b) => b.reason === 'NO_CARE_TEAM_SPECIALIST');
  const capacityBottlenecks = bottlenecks.filter((b) => b.reason === 'PROFESSIONAL_CAPACITY_EXCEEDED');

  return (
    <div className="bottlenecks-manager-container">
      {/* Barra de Título & Alternador de Visão */}
      <div className="bottlenecks-header-bar">
        <div className="bottlenecks-header-title">
          <h3>
            <AlertTriangle size={20} color="var(--warning, #f59e0b)" />
            Centro Visual de Gargalos & Otimizações de Escala
          </h3>
          <p>
            Identifique onde faltam profissionais ou horários e resolva pendências com ações imediatas em 1 clique.
          </p>
        </div>

        <div className="bottlenecks-view-toggle">
          <button
            type="button"
            className={`bottlenecks-toggle-btn ${activeView === 'solutions' ? 'active' : ''}`}
            onClick={() => setActiveView('solutions')}
          >
            <Zap size={16} />
            Diagnóstico & Soluções ({bottlenecks.length})
          </button>
          <button
            type="button"
            className={`bottlenecks-toggle-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <Calendar size={16} />
            Mini Calendários
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="bottlenecks-metrics-grid">
        <div className="bottleneck-metric-card">
          <div className={`metric-card-icon ${bottlenecks.length > 0 ? 'critical' : 'success'}`}>
            <AlertTriangle size={22} />
          </div>
          <div className="metric-card-data">
            <span className="metric-card-value">{bottlenecks.length}</span>
            <span className="metric-card-label">Gargalos Ativos na Escala</span>
          </div>
        </div>

        <div className="bottleneck-metric-card">
          <div className="metric-card-icon warning">
            <Users size={22} />
          </div>
          <div className="metric-card-data">
            <span className="metric-card-value">
              {new Set(bottlenecks.map((b) => b.patientId)).size}
            </span>
            <span className="metric-card-label">Pacientes com Metas em Déficit</span>
          </div>
        </div>

        <div className="bottleneck-metric-card">
          <div className="metric-card-icon info">
            <ShieldCheck size={22} />
          </div>
          <div className="metric-card-data">
            <span className="metric-card-value">{careTeamBottlenecks.length}</span>
            <span className="metric-card-label">Restrições de Care Team</span>
          </div>
        </div>

        <div className="bottleneck-metric-card">
          <div className="metric-card-icon success">
            <Clock size={22} />
          </div>
          <div className="metric-card-data">
            <span className="metric-card-value">{capacityBottlenecks.length}</span>
            <span className="metric-card-label">Limites de Jornada / Horário</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISÃO 1: DIAGNÓSTICO DE GARGALOS E SOLUÇÕES COM 1 CLIQUE     */}
      {/* ============================================================ */}
      {activeView === 'solutions' && (
        <div className="bottlenecks-list-flow">
          {bottlenecks.length === 0 ? (
            <div
              style={{
                background: 'var(--success-subtle, #ecfdf5)',
                padding: '2.5rem',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'var(--success, #059669)',
                border: '1px solid #bbf7d0'
              }}
            >
              <CheckCircle2 size={46} color="var(--success, #059669)" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-headline, #0f172a)' }}>
                Escala Sem Gargalos!
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body, #334155)' }}>
                Todas as demandas terapêuticas de todos os pacientes foram 100% alocadas dentro das janelas de horário e
                equipes autorizadas.
              </p>
            </div>
          ) : (
            bottlenecks.map((b, idx) => {
              const isCareTeamDeficit = b.reason === 'NO_CARE_TEAM_SPECIALIST';
              const candidates = isCareTeamDeficit ? findCandidatesForTherapy(b.therapyType) : [];
              const patientObj = patientsWithDemands.find((p) => p.patientId === b.patientId);
              const ptCareTeam = careTeams.find((ct) => ct.patientId === b.patientId);
              const teamProfs = professionalAvailabilities.filter((p) =>
                ptCareTeam?.professionalIds.includes(p.professionalId)
              );

              return (
                <div
                  key={idx}
                  className={`bottleneck-enhanced-card ${isCareTeamDeficit ? 'critical' : 'capacity'}`}
                >
                  <div className="bottleneck-card-header">
                    <div className="bottleneck-patient-title">
                      <h4>{b.patientName}</h4>
                      <span className={`bottleneck-tag ${isCareTeamDeficit ? 'care-team' : 'capacity'}`}>
                        {isCareTeamDeficit ? 'Bloqueio de Care Team' : 'Capacidade de Agenda'}
                      </span>
                    </div>

                    <div className="bottleneck-deficit-badge">
                      Déficit: <strong>{b.missingSessions} sessão(ões)</strong> na Semana {b.weekNumber} (
                      {b.therapyType})
                    </div>
                  </div>

                  <div className="bottleneck-explanation">
                    {isCareTeamDeficit ? (
                      <div>
                        🚫 O paciente precisa de <strong>{b.therapyType}</strong>, mas nenhum profissional com essa
                        especialidade está autorizado em sua Equipe de Cuidado (Care Team). Por segurança clínica, o motor
                        não pode alocar terapeutas não autorizados.
                      </div>
                    ) : (
                      <div>
                        ⏳ Os profissionais autorizados no Care Team ({teamProfs.map((p) => p.professionalName).join(', ') || 'Nenhum'})
                        não têm horários vagos suficientes nos dias solicitados para comportar mais atendimentos.
                      </div>
                    )}
                  </div>

                  {/* Painel de Soluções com Ações Imediatas */}
                  <div className="bottleneck-solutions-panel">
                    <div className="solutions-panel-header">
                      <Sparkles size={16} />
                      <span>Soluções Recomendadas (Ação Imediata):</span>
                    </div>

                    <div className="solution-actions-row">
                      {isCareTeamDeficit && candidates.length > 0 && (
                        <>
                          {candidates.map((cand) => (
                            <button
                              key={cand.professionalId}
                              type="button"
                              className="btn-solve-action"
                              onClick={() =>
                                handleAuthorizeCareTeam(
                                  b.patientId,
                                  cand.professionalId,
                                  b.patientName,
                                  cand.professionalName
                                )
                              }
                              title={`Autorizar ${cand.professionalName} no Care Team deste paciente`}
                            >
                              <UserCheck size={15} />
                              ✨ Autorizar {getShortDisplayName(cand.professionalName)} no Care Team
                            </button>
                          ))}
                        </>
                      )}

                      {!isCareTeamDeficit && teamProfs.length > 0 && (
                        <>
                          {teamProfs.map((prof) => {
                            const domOff = !prof.weekdayWindows?.[0]?.enabled;
                            const sabOff = !prof.weekdayWindows?.[6]?.enabled;

                            return (
                              <React.Fragment key={prof.professionalId}>
                                {domOff && (
                                  <button
                                    type="button"
                                    className="btn-solve-action"
                                    onClick={() => handleEnableDay(prof.professionalId, 0)}
                                    title={`Habilitar domingo para ${prof.professionalName}`}
                                  >
                                    <Zap size={15} />
                                    ⚡ Habilitar Domingo para {getShortDisplayName(prof.professionalName)}
                                  </button>
                                )}
                                {sabOff && (
                                  <button
                                    type="button"
                                    className="btn-solve-action"
                                    onClick={() => handleEnableDay(prof.professionalId, 6)}
                                    title={`Habilitar sábado para ${prof.professionalName}`}
                                  >
                                    <Zap size={15} />
                                    ⚡ Habilitar Sábado para {getShortDisplayName(prof.professionalName)}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-secondary-action"
                                  onClick={() => handleExtendHours(prof.professionalId, 2)}
                                  title={`Ampliar jornada de ${prof.professionalName} até 19:00`}
                                >
                                  <Clock size={15} />
                                  Ampliar Horário de {getShortDisplayName(prof.professionalName)} até 19h
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}

                      {/* Botão para abrir o mini-calendário inline */}
                      <button
                        type="button"
                        className="btn-secondary-action"
                        onClick={() => {
                          const targetProf = isCareTeamDeficit ? candidates[0] : teamProfs[0];
                          if (targetProf) setSelectedProfId(targetProf.professionalId);
                          toggleInlineCalendar(idx);
                        }}
                      >
                        <Calendar size={15} />
                        {expandedBottlenecks[idx] ? 'Ocultar Grade Visual' : 'Ver Grade de Horários Ocupados/Livres'}
                        {expandedBottlenecks[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {/* Abrir Copiloto IA */}
                      {onOpenAIChat && (
                        <button
                          type="button"
                          className="btn-secondary-action"
                          onClick={onOpenAIChat}
                          title="Perguntar ao Copiloto IA sobre este gargalo"
                        >
                          <Bot size={15} />
                          Analisar com IA
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acordeão com o Mini Calendário Semanal Inline */}
                  {expandedBottlenecks[idx] && (
                    <div className="inline-calendar-box">
                      <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                        📅 Grade Semanal Proporcional: <strong>{currentProf?.professionalName}</strong>
                      </div>
                      <div className="proportional-calendar-wrapper">
                        {/* Régua de Horas Lateral */}
                        <div className="time-axis-col">
                          <div className="time-axis-header">Hora</div>
                          <div className="time-axis-body" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                            {HOURS_SCALE.map((hStr) => (
                              <div key={hStr} className="time-axis-hour" style={{ height: `${60 * PX_PER_MINUTE}px` }}>
                                <span>{hStr}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grade de 7 Colunas */}
                        <div className="weekly-days-grid proportional">
                          {WEEKDAYS.map(({ num: dayNum, short }) => {
                            const dayData = profWeeklySlots[dayNum];
                            if (!dayData || dayData.isOff) {
                              return (
                                <div key={dayNum} className="day-column-box proportional">
                                  <div className="day-column-header">
                                    <span className="day-column-name">{short}</span>
                                    <span className="day-column-window">Folga</span>
                                  </div>
                                  <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                    <div className="day-off-card proportional">
                                      <span>Não atende</span>
                                      <button
                                        type="button"
                                        className="btn-enable-day-mini"
                                        onClick={() => handleEnableDay(currentProf.professionalId, dayNum)}
                                      >
                                        + Habilitar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={dayNum} className="day-column-box proportional">
                                <div className="day-column-header">
                                  <span className="day-column-name">{short}</span>
                                  <span className="day-column-window">{dayData.startTime} - {dayData.endTime}</span>
                                </div>
                                <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                  {dayData.slots.map((slot, sIdx) => {
                                    const heightPx = Math.max(16, Math.round(slot.duration * PX_PER_MINUTE));
                                    const isCompact = heightPx < 26;

                                    return (
                                      <div
                                        key={sIdx}
                                        className={`slot-block proportional ${slot.type}`}
                                        style={{ height: `${heightPx}px` }}
                                        title={`${slot.time} às ${slot.endTime} (${slot.duration} min) • ${slot.fullDetails || slot.title}`}
                                      >
                                        {isCompact ? (
                                          <div className="slot-compact-line">
                                            <span className="slot-compact-time">{slot.time}</span>
                                            <span className="slot-compact-title">{slot.title}</span>
                                          </div>
                                        ) : (
                                          <div className="slot-standard-content">
                                            <div className="slot-time-row">
                                              <Clock size={10} />
                                              <span>{slot.time} - {slot.endTime}</span>
                                            </div>
                                            <span className="slot-desc-text">{slot.title}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VISÃO 2: MINI CALENDÁRIOS PROPORCIONAIS (PROFISSIONAL & PACIENTE) */}
      {/* ============================================================ */}
      {activeView === 'calendar' && (
        <div className="pro-calendar-card">
          {/* Alternador de Sub-Aba: Profissionais vs Pacientes */}
          <div className="calendar-subtabs-bar">
            <button
              type="button"
              className={`calendar-subtab-btn ${calendarMode === 'professionals' ? 'active' : ''}`}
              onClick={() => setCalendarMode('professionals')}
            >
              <UserCheck size={16} />
              <span>Mini Calendário dos Profissionais</span>
              <span className="subtab-count-badge">{professionalAvailabilities.length}</span>
            </button>

            <button
              type="button"
              className={`calendar-subtab-btn ${calendarMode === 'patients' ? 'active' : ''}`}
              onClick={() => setCalendarMode('patients')}
            >
              <Users size={16} />
              <span>Mini Calendário dos Pacientes</span>
              <span className="subtab-count-badge">{safePatients.length}</span>
            </button>
          </div>

          {/* ============================================================ */}
          {/* MODO 1: PROFISSIONAIS                                       */}
          {/* ============================================================ */}
          {calendarMode === 'professionals' && (
            <>
              {/* Seletor de Profissionais em Chips Horizontais */}
              <div className="pro-selector-chips-bar">
                {professionalAvailabilities.map((prof) => {
                  const profSessionCount = plannedSessions.filter((s) => s.professionalId === prof.professionalId).length;
                  const isSelected = prof.professionalId === (currentProf?.professionalId || selectedProfId);

                  return (
                    <button
                      key={prof.professionalId}
                      type="button"
                      className={`pro-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedProfId(prof.professionalId)}
                    >
                      <div className="pro-chip-avatar">🧑‍⚕️</div>
                      <span>{prof.professionalName}</span>
                      <span className="pro-chip-sessions-badge">{profSessionCount} sessões</span>
                    </button>
                  );
                })}
              </div>

              {/* Controles da Grade & Legenda do Profissional */}
              <div className="calendar-top-controls">
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', color: 'var(--text-headline)' }}>
                    Grade Semanal de {currentProf?.professionalName}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Especialidade: <strong>{currentProf?.specialty}</strong> • Proporção uniforme: <strong>1h = 48px</strong> em todos os dias
                  </span>
                </div>

                <div className="calendar-legend-bar">
                  <div className="legend-pill">
                    <span className="legend-dot free" />
                    <span>🟢 Livre (Disponível)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot transit" />
                    <span>🚗 Deslocamento Urbano</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot occupied" />
                    <span>🔵 Ocupado (Atendimento)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot blocked" />
                    <span>🔴 Bloqueado (Indisponibilidade)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot off" />
                    <span>⚪ Fora do Horário / Folga</span>
                  </div>
                </div>
              </div>

              {/* Barra de Seleção de Semanas do Mês */}
              <div className="calendar-week-selector-bar">
                <button
                  type="button"
                  className={`week-selector-btn ${selectedWeek === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedWeek('all')}
                >
                  <Calendar size={14} />
                  <span>Todas as Semanas ({monthWeeks.length})</span>
                </button>
                {monthWeeks.map((w) => {
                  const profWeekSessionsCount = plannedSessions.filter((s) => s.professionalId === currentProf?.professionalId && s.weekNumber === w.weekNumber).length;
                  return (
                    <button
                      key={w.weekNumber}
                      type="button"
                      className={`week-selector-btn ${selectedWeek === w.weekNumber ? 'active' : ''}`}
                      onClick={() => setSelectedWeek(w.weekNumber)}
                    >
                      <span>{w.shortLabel}</span>
                      <span className="week-chip-badge">{profWeekSessionsCount}x</span>
                    </button>
                  );
                })}
              </div>

              {/* Renderização de Todas as Semanas (ou da Semana Selecionada) */}
              <div className="weeks-calendar-stack">
                {weeksToRender.map((week) => {
                  const weekSessions = plannedSessions.filter(
                    (s) => s.professionalId === currentProf?.professionalId && s.weekNumber === week.weekNumber
                  );

                  return (
                    <div key={week.weekNumber} className="week-block-card">
                      <div className="week-block-header">
                        <div className="week-title-badge">
                          <Calendar size={15} />
                          <strong>{week.label}</strong>
                        </div>
                        <span className="week-sessions-count-pill">
                          {weekSessions.length} atendimento(s) nesta semana
                        </span>
                      </div>

                      <div className="proportional-calendar-wrapper">
                        {/* Régua de Horas Lateral */}
                        <div className="time-axis-col">
                          <div className="time-axis-header">Hora</div>
                          <div className="time-axis-body" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                            {HOURS_SCALE.map((hStr) => (
                              <div key={hStr} className="time-axis-hour" style={{ height: `${60 * PX_PER_MINUTE}px` }}>
                                <span>{hStr}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grade de 7 Colunas: Segunda a Domingo */}
                        <div className="weekly-days-grid proportional">
                          {WEEKDAYS.map(({ num: dayNum, name: dayName, short: dayShort }) => {
                            const matchingDay = week.days.find((d) => d.dayOfWeek === dayNum);

                            if (!matchingDay) {
                              return (
                                <div key={dayNum} className="day-column-box proportional is-outside-month">
                                  <div className="day-column-header">
                                    <span className="day-column-name">{dayShort}</span>
                                    <span className="day-column-date-badge">—</span>
                                  </div>
                                  <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                    <div className="day-outside-month-card">
                                      <span>Fora do mês</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const dayData = buildDaySlotsForProf(currentProf, matchingDay.dateStr, dayNum, plannedSessions);

                            if (dayData.isOff) {
                              return (
                                <div key={dayNum} className="day-column-box proportional">
                                  <div className="day-column-header">
                                    <div className="day-name-row">
                                      <span className="day-column-name">{dayShort}</span>
                                      <span className="day-column-date-badge">{matchingDay.formattedDate}</span>
                                    </div>
                                    <span className="day-column-window">Folga</span>
                                  </div>
                                  <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                    <div className="day-off-card proportional">
                                      <span>Dia não habilitado</span>
                                      {currentProf && (
                                        <button
                          type="button"
                          className="btn-enable-day-mini"
                          onClick={() => handleEnableDay(currentProf.professionalId, dayNum)}
                        >
                          + Habilitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={dayNum} className="day-column-box proportional">
                <div className="day-column-header">
                  <div className="day-name-row">
                    <span className="day-column-name">{dayShort}</span>
                    <span className="day-column-date-badge">{matchingDay.formattedDate}</span>
                  </div>
                  <span className="day-column-window">
                    {dayData.startTime} às {dayData.endTime}
                  </span>
                </div>

                <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                  {dayData.slots.map((slot, sIdx) => {
                    const heightPx = Math.max(16, Math.round(slot.duration * PX_PER_MINUTE));
                    const isCompact = heightPx < 26;

                    return (
                      <div
                        key={sIdx}
                        className={`slot-block proportional ${slot.type}`}
                        style={{ height: `${heightPx}px` }}
                        title={`${matchingDay.formattedDate} • ${slot.time} às ${slot.endTime} (${slot.duration} min) • ${slot.fullDetails || slot.title}`}
                      >
                        {isCompact ? (
                          <div className="slot-compact-line">
                            <span className="slot-compact-time">{slot.time}</span>
                            <span className="slot-compact-title">{slot.title}</span>
                          </div>
                        ) : (
                          <div className="slot-standard-content">
                            <div className="slot-time-row">
                              <Clock size={10} />
                              <span>{slot.time} - {slot.endTime}</span>
                            </div>
                            <span className="slot-desc-text">{slot.title}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
})}
              </div>

              {/* Dica de Oportunidade */}
              <div className="calendar-opportunity-banner">
                <Sparkles size={20} color="#059669" />
                <div>
                  <strong>Dica de Otimização:</strong> Os blocos estão em <strong>escala proporcional exata ao tempo</strong> (1h = 48px). Os blocos em <strong>laranja (Deslocamento)</strong> mostram o trânsito urbano reservado entre domicílios para garantir que os terapeutas cheguem sempre pontuais.
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* MODO 2: PACIENTES                                           */}
          {/* ============================================================ */}
          {calendarMode === 'patients' && (
            <>
              {/* Seletor de Pacientes em Chips Horizontais */}
              <div className="pro-selector-chips-bar">
                {safePatients.map((patient) => {
                  const patientSessionCount = plannedSessions.filter((s) => s.patientId === patient.patientId).length;
                  const isSelected = patient.patientId === (currentPatient?.patientId || selectedPatientId);

                  return (
                    <button
                      key={patient.patientId}
                      type="button"
                      className={`pro-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedPatientId(patient.patientId)}
                    >
                      <div className="pro-chip-avatar">🧑</div>
                      <span>{patient.patientName}</span>
                      <span className="pro-chip-sessions-badge">{patientSessionCount} sessões</span>
                    </button>
                  );
                })}
              </div>

              {/* Controles da Grade & Legenda do Paciente */}
              <div className="calendar-top-controls">
                <div>
                  <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', color: 'var(--text-headline)' }}>
                    Grade Semanal de {currentPatient?.patientName}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Terapias: <strong>{currentPatient?.demands?.map((d) => d.therapyType).join(', ') || 'Prescrições ativas'}</strong> • 📍 {currentPatient?.address || 'Vitória - ES'}
                  </span>
                </div>

                <div className="calendar-legend-bar">
                  <div className="legend-pill">
                    <span className="legend-dot free" />
                    <span>🟢 Disponível (Livre para Atendimento)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot occupied" />
                    <span>🔵 Ocupado (Atendimento com Terapeuta)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot blocked" />
                    <span>🔴 Bloqueado (Indisponibilidade / Escola / Diálise)</span>
                  </div>
                  <div className="legend-pill">
                    <span className="legend-dot off" />
                    <span>⚪ Fora da Janela / Sem Atendimento</span>
                  </div>
                </div>
              </div>

              {/* Barra de Seleção de Semanas do Mês */}
              <div className="calendar-week-selector-bar">
                <button
                  type="button"
                  className={`week-selector-btn ${selectedWeek === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedWeek('all')}
                >
                  <Calendar size={14} />
                  <span>Todas as Semanas ({monthWeeks.length})</span>
                </button>
                {monthWeeks.map((w) => {
                  const patientWeekSessionsCount = plannedSessions.filter((s) => s.patientId === currentPatient?.patientId && s.weekNumber === w.weekNumber).length;
                  return (
                    <button
                      key={w.weekNumber}
                      type="button"
                      className={`week-selector-btn ${selectedWeek === w.weekNumber ? 'active' : ''}`}
                      onClick={() => setSelectedWeek(w.weekNumber)}
                    >
                      <span>{w.shortLabel}</span>
                      <span className="week-chip-badge">{patientWeekSessionsCount}x</span>
                    </button>
                  );
                })}
              </div>

              {/* Renderização de Todas as Semanas (ou da Semana Selecionada) */}
              <div className="weeks-calendar-stack">
                {weeksToRender.map((week) => {
                  const weekSessions = plannedSessions.filter(
                    (s) => s.patientId === currentPatient?.patientId && s.weekNumber === week.weekNumber
                  );

                  return (
                    <div key={week.weekNumber} className="week-block-card">
                      <div className="week-block-header">
                        <div className="week-title-badge">
                          <Calendar size={15} />
                          <strong>{week.label}</strong>
                        </div>
                        <span className="week-sessions-count-pill">
                          {weekSessions.length} atendimento(s) nesta semana
                        </span>
                      </div>

                      <div className="proportional-calendar-wrapper">
                        {/* Régua de Horas Lateral */}
                        <div className="time-axis-col">
                          <div className="time-axis-header">Hora</div>
                          <div className="time-axis-body" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                            {HOURS_SCALE.map((hStr) => (
                              <div key={hStr} className="time-axis-hour" style={{ height: `${60 * PX_PER_MINUTE}px` }}>
                                <span>{hStr}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grade de 7 Colunas: Segunda a Domingo */}
                        <div className="weekly-days-grid proportional">
                          {WEEKDAYS.map(({ num: dayNum, name: dayName, short: dayShort }) => {
                            const matchingDay = week.days.find((d) => d.dayOfWeek === dayNum);

                            if (!matchingDay) {
                              return (
                                <div key={dayNum} className="day-column-box proportional is-outside-month">
                                  <div className="day-column-header">
                                    <span className="day-column-name">{dayShort}</span>
                                    <span className="day-column-date-badge">—</span>
                                  </div>
                                  <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                    <div className="day-outside-month-card">
                                      <span>Fora do mês</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            const dayData = buildDaySlotsForPatient(currentPatient, matchingDay.dateStr, dayNum, plannedSessions);

                            if (dayData.isOff) {
                              return (
                                <div key={dayNum} className="day-column-box proportional">
                                  <div className="day-column-header">
                                    <div className="day-name-row">
                                      <span className="day-column-name">{dayShort}</span>
                                      <span className="day-column-date-badge">{matchingDay.formattedDate}</span>
                                    </div>
                                    <span className="day-column-window">Sem Atendimentos</span>
                                  </div>
                                  <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                    <div className="day-off-card proportional">
                                      <span>Sem atendimentos previstos neste dia</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={dayNum} className="day-column-box proportional">
                                <div className="day-column-header">
                                  <div className="day-name-row">
                                    <span className="day-column-name">{dayShort}</span>
                                    <span className="day-column-date-badge">{matchingDay.formattedDate}</span>
                                  </div>
                                  <span className="day-column-window">
                                    {dayData.startTime} às {dayData.endTime}
                                  </span>
                                </div>

                                <div className="day-column-body proportional" style={{ height: `${TOTAL_GRID_HEIGHT}px` }}>
                                  {dayData.slots.map((slot, sIdx) => {
                                    const heightPx = Math.max(16, Math.round(slot.duration * PX_PER_MINUTE));
                                    const isCompact = heightPx < 26;

                                    return (
                                      <div
                                        key={sIdx}
                                        className={`slot-block proportional ${slot.type}`}
                                        style={{ height: `${heightPx}px` }}
                                        title={`${matchingDay.formattedDate} • ${slot.time} às ${slot.endTime} (${slot.duration} min) • ${slot.fullDetails || slot.title}`}
                                      >
                                        {isCompact ? (
                                          <div className="slot-compact-line">
                                            <span className="slot-compact-time">{slot.time}</span>
                                            <span className="slot-compact-title">{slot.title}</span>
                                          </div>
                                        ) : (
                                          <div className="slot-standard-content">
                                            <div className="slot-time-row">
                                              <Clock size={10} />
                                              <span>{slot.time} - {slot.endTime}</span>
                                            </div>
                                            <span className="slot-desc-text">{slot.title}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dica Informativa do Paciente */}
              <div className="calendar-opportunity-banner">
                <Users size={20} color="#2563eb" />
                <div>
                  <strong>Rotina Domiciliar do Paciente:</strong> Os blocos em <strong>verde (Disponível)</strong> indicam os horários em que o paciente está livre para receber visitas domiciliares. Os blocos em <strong>azul (Ocupado)</strong> mostram as sessões já confirmadas com os terapeutas e em <strong>vermelho (Bloqueado)</strong> períodos reservados para escola, diálise ou repouso.
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
