// test/transit-and-schedule-blocking.test.ts
import { describe, it, expect } from 'vitest';

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMin: number): string {
  const normalized = Math.max(0, totalMin);
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getEndTime(startStr: string, durationMin: number = 45): string {
  return minutesToTime(timeToMinutes(startStr) + Number(durationMin));
}

// Simula a lógica de geração de slots do BottlenecksVisualManager
function calculateWeeklySlots(
  win: { startTime: string; endTime: string; enabled: boolean },
  sessions: Array<{
    time: string;
    durationMinutes: number;
    transitTimeMinutes?: number;
    transitKmFromPrevious?: number;
    patientName: string;
    therapyType: string;
  }>
) {
  const allEvents: any[] = [];

  sessions.forEach((s) => {
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
        title: '🚗 Deslocamento Urbano',
        subtitle: `Em trânsito até ${s.patientName} (${transitMinutes} min)`
      });
    }

    allEvents.push({
      type: 'occupied',
      time: s.time,
      duration: s.durationMinutes || 45,
      title: s.patientName
    });
  });

  allEvents.sort((a, b) => {
    const cmp = a.time.localeCompare(b.time);
    if (cmp !== 0) return cmp;
    const typeOrder: Record<string, number> = { transit: 1, blocked: 2, occupied: 3 };
    return (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);
  });

  const slots: any[] = [];
  let cursor = win.startTime;

  allEvents.forEach((ev) => {
    const evEndTime = ev.endTime || getEndTime(ev.time, ev.duration || 45);

    if (timeToMinutes(evEndTime) <= timeToMinutes(cursor)) {
      return;
    }

    if (timeToMinutes(ev.time) > timeToMinutes(cursor)) {
      const freeDur = timeToMinutes(ev.time) - timeToMinutes(cursor);
      slots.push({
        type: 'free',
        time: cursor,
        endTime: ev.time,
        duration: freeDur,
        title: 'Livre para Atendimentos'
      });
    }

    const adjustedStartTime = timeToMinutes(ev.time) < timeToMinutes(cursor) ? cursor : ev.time;

    slots.push({
      ...ev,
      time: adjustedStartTime,
      endTime: evEndTime
    });

    if (timeToMinutes(evEndTime) > timeToMinutes(cursor)) {
      cursor = evEndTime;
    }
  });

  if (timeToMinutes(cursor) < timeToMinutes(win.endTime)) {
    const freeDur = timeToMinutes(win.endTime) - timeToMinutes(cursor);
    slots.push({
      type: 'free',
      time: cursor,
      endTime: win.endTime,
      duration: freeDur,
      title: 'Livre para Atendimentos'
    });
  }

  return slots;
}

// Simula a lógica de classificação de slots do ScheduleView
function classifyScheduleSlot(
  slot: string,
  appointments: Array<{
    time: string;
    durationMinutes: number;
    transitTimeMinutes?: number;
    patientName: string;
  }>
) {
  const aptsInSlot = appointments.filter((a) => a.time === slot);
  const slotMin = timeToMinutes(slot);

  const ongoingApt = appointments.find((a) => {
    if (a.time === slot) return false;
    const start = timeToMinutes(a.time);
    const end = start + (Number(a.durationMinutes) || 45);
    return slotMin > start && slotMin < end;
  });

  const inTransitApts = appointments.filter((a) => {
    const transitMin = Number(a.transitTimeMinutes) || 0;
    if (transitMin <= 0) return false;
    const aptStart = timeToMinutes(a.time);
    const departureMin = Math.max(0, aptStart - transitMin);
    return slotMin >= departureMin && slotMin < aptStart;
  });

  if (aptsInSlot.length > 0) {
    return { type: 'occupied', appointments: aptsInSlot };
  }

  if (ongoingApt) {
    return { type: 'ongoing', appointment: ongoingApt };
  }

  if (inTransitApts.length > 0) {
    return { type: 'transit_blocked', appointments: inTransitApts };
  }

  // Horário livre: calcula janela até o próximo compromisso ou saída de trânsito
  let nextBlockMin: number | null = null;
  for (const a of appointments) {
    const aptStart = timeToMinutes(a.time);
    const transitMin = Number(a.transitTimeMinutes) || 0;
    const departureMin = transitMin > 0 ? aptStart - transitMin : aptStart;

    if (departureMin > slotMin) {
      if (nextBlockMin === null || departureMin < nextBlockMin) {
        nextBlockMin = departureMin;
      }
    }
  }

  return {
    type: 'free',
    freeMinutes: nextBlockMin !== null ? nextBlockMin - slotMin : null
  };
}

describe('Roteirização Urbana & Bloqueio de Deslocamento na Grade', () => {
  it('deve exibir o deslocamento entre pacientes como transit e não como livre no mini calendário', () => {
    const win = { startTime: '08:00', endTime: '18:00', enabled: true };
    const sessions = [
      {
        time: '09:30',
        durationMinutes: 45,
        transitTimeMinutes: 20, // 09:10 às 09:30
        transitKmFromPrevious: 4.5,
        patientName: 'Mariana Souza',
        therapyType: 'Fisioterapia'
      },
      {
        time: '11:00',
        durationMinutes: 45,
        transitTimeMinutes: 15, // 10:45 às 11:00
        transitKmFromPrevious: 3.2,
        patientName: 'Carlos Silva',
        therapyType: 'Fisioterapia'
      }
    ];

    const slots = calculateWeeklySlots(win, sessions);

    // Deve conter blocos do tipo transit
    const transitSlots = slots.filter((s) => s.type === 'transit');
    expect(transitSlots).toHaveLength(2);

    // Primeiro deslocamento: 09:10 às 09:30 (20 min)
    expect(transitSlots[0].time).toBe('09:10');
    expect(transitSlots[0].endTime).toBe('09:30');
    expect(transitSlots[0].duration).toBe(20);

    // Tempo livre antes do primeiro deslocamento deve ser de 08:00 às 09:10 (70 min) e NÃO até 09:30!
    const firstFreeSlot = slots.find((s) => s.type === 'free' && s.time === '08:00');
    expect(firstFreeSlot).toBeDefined();
    expect(firstFreeSlot?.endTime).toBe('09:10');
    expect(firstFreeSlot?.duration).toBe(70);

    // Segundo deslocamento: 10:45 às 11:00 (15 min)
    expect(transitSlots[1].time).toBe('10:45');
    expect(transitSlots[1].endTime).toBe('11:00');

    // Intervalo livre entre atendimento de Mariana (termina 10:15) e o trânsito (começa 10:45) é de 30 min
    const intermediateFree = slots.find((s) => s.type === 'free' && s.time === '10:15');
    expect(intermediateFree).toBeDefined();
    expect(intermediateFree?.endTime).toBe('10:45');
    expect(intermediateFree?.duration).toBe(30);
  });

  it('deve bloquear o slot na agenda do profissional quando ele estiver em horário de deslocamento', () => {
    const appointments = [
      {
        time: '10:00',
        durationMinutes: 45,
        transitTimeMinutes: 20, // trânsito das 09:40 às 10:00
        patientName: 'Mariana Souza'
      }
    ];

    // Slot 09:40 ou 09:45: cai dentro da janela de deslocamento [09:40, 10:00]
    const slotTransit = classifyScheduleSlot('09:45', appointments);
    expect(slotTransit.type).toBe('transit_blocked');

    // Slot 10:00: horário do atendimento em si
    const slotOccupied = classifyScheduleSlot('10:00', appointments);
    expect(slotOccupied.type).toBe('occupied');

    // Slot 09:00: horário livre antes da saída de deslocamento
    // A janela livre não pode ser até 10:00 (60 min), deve ser até 09:40 (40 min)!
    const slotFree = classifyScheduleSlot('09:00', appointments);
    expect(slotFree.type).toBe('free');
    expect(slotFree.freeMinutes).toBe(40);
  });
});
