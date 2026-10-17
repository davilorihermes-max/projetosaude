// src/components/ScheduleView.jsx
import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Video,
  Plus,
  Play,
  XCircle,
  Filter,
  UserCheck
} from 'lucide-react';
import './ScheduleView.css';
import Avatar from './Avatar';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMin) {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getEndTime(startStr, durationMin = 45) {
  return minutesToTime(timeToMinutes(startStr) + Number(durationMin));
}

export default function ScheduleView({
  appointments = [],
  patients = [],
  doctors = [],
  onUpdateAppointmentStatus,
  onOpenPatientRecord,
  onOpenNewAppointment,
  selectedDoctorId,
  setSelectedDoctorId,
  initialSelectedDate
}) {
  const allDatesWithApts = React.useMemo(() => {
    return Array.from(new Set(appointments.map((a) => a.date).filter(Boolean))).sort();
  }, [appointments]);

  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialSelectedDate) return initialSelectedDate;
    const today = new Date().toISOString().slice(0, 10);
    if (appointments.some((a) => a.date === today)) return today;
    if (appointments.length > 0 && appointments[0].date) return appointments[0].date;
    return today;
  });

  // Atualiza data se initialSelectedDate mudar externamente
  React.useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate]);

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesDoctor = selectedDoctorId === 'all' || apt.doctorId === selectedDoctorId;
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesDate && matchesDoctor && matchesStatus;
  });

  // Base padrão de horários + quaisquer horários reais cadastrados nos agendamentos (ex: 09:00, 09:15)
  const baseSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ];
  const activeTimes = filteredAppointments.map((a) => a.time).filter(Boolean);
  const timeSlots = Array.from(new Set([...baseSlots, ...activeTimes])).sort();

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Verifica se existem agendamentos em outras datas para orientar o usuário
  const otherDatesWithApts = Array.from(
    new Set(appointments.map((a) => a.date).filter((d) => d && d !== selectedDate))
  ).sort();

  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctorId);

  const handleCompleteWithCelebration = (aptId) => {
    onUpdateAppointmentStatus(aptId, 'completed');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="badge badge-waiting"><span className="badge-dot"></span>A Caminho do Domicílio</span>;
      case 'in_progress':
        return <span className="badge badge-in_progress"><span className="badge-dot"></span>No Domicílio (Em Sessão)</span>;
      case 'completed':
        return <span className="badge badge-completed"><span className="badge-dot"></span>Sessão Concluída</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled"><span className="badge-dot"></span>Cancelada / Reagendada</span>;
      default:
        return <span className="badge badge-scheduled"><span className="badge-dot"></span>Programada</span>;
    }
  };

  return (
    <div className="schedule-container">
      {/* Top Header Bar */}
      <div className="schedule-header-bar">
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Agenda de Sessões Domiciliares & Deslocamento</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Planejamento de rotas, janelas de trânsito e check-in na residência dos pacientes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.7rem' }}
            onClick={handlePrevDay}
            title="Dia anterior"
          >
            ◀
          </button>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.7rem' }}
            onClick={handleNextDay}
            title="Próximo dia"
          >
            ▶
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', fontWeight: 600 }}
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          >
            Hoje
          </button>
          <button className="btn btn-primary" onClick={() => onOpenNewAppointment(null, '09:00', selectedDate)}>
            <Plus size={16} /> Nova Sessão Domiciliar
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Todas as Sessões (${filteredAppointments.length})` },
            { id: 'waiting', label: 'A Caminho' },
            { id: 'in_progress', label: 'No Domicílio (Em Atendimento)' },
            { id: 'scheduled', label: 'Futuras na Rota' },
            { id: 'completed', label: 'Concluídas' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`filter-chip ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedDoctorId !== 'all' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Filtrando: <strong>{selectedDoctorObj?.name || 'Profissional'}</strong></span>
            {setSelectedDoctorId && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                onClick={() => setSelectedDoctorId('all')}
              >
                Ver Toda a Equipe
              </button>
            )}
          </div>
        )}
      </div>

      {/* Régua de Navegação Rápida pelos Dias da Escala Mensal */}
      {allDatesWithApts.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            flexWrap: 'wrap',
            padding: '0.65rem 0.85rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginTop: '0.5rem',
            marginBottom: '0.4rem'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CalendarDays size={14} color="var(--primary)" /> Dias com Sessões na Escala:
          </span>
          {allDatesWithApts.map((dStr) => {
            const isSelected = dStr === selectedDate;
            const countForDate = appointments.filter((a) => a.date === dStr).length;
            const [y, m, d] = dStr.split('-');
            return (
              <button
                key={dStr}
                type="button"
                onClick={() => setSelectedDate(dStr)}
                style={{
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-body)',
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: '6px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{d}/{m}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {countForDate}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Aviso amigável caso a data selecionada não contenha sessões */}
      {filteredAppointments.length === 0 && (
        <div
          style={{
            background: 'var(--primary-subtle)',
            border: '1px solid var(--primary-border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={18} color="var(--primary)" />
            <span>
              Nenhuma sessão encontrada para <strong>{selectedDate}</strong>
              {selectedDoctorId !== 'all' ? ` com o profissional ${selectedDoctorObj?.name || ''}` : ''}.
              {otherDatesWithApts.length > 0 && ` Há sessões agendadas em: ${otherDatesWithApts.join(', ')}.`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {selectedDoctorId !== 'all' && setSelectedDoctorId && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                onClick={() => setSelectedDoctorId('all')}
              >
                Ver Toda a Equipe
              </button>
            )}
            {otherDatesWithApts.length > 0 && (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                onClick={() => setSelectedDate(otherDatesWithApts[0])}
              >
                Ir para {otherDatesWithApts[0]}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeline Slots */}
      <div className="timeline-slots-grid">
        {timeSlots.map((slot) => {
          const aptsInSlot = filteredAppointments.filter((a) => a.time === slot);
          const slotMin = timeToMinutes(slot);

          // Verifica se há sessão que começou antes deste slot e ainda está em andamento (continuidade)
          const ongoingApt = filteredAppointments.find((a) => {
            if (a.time === slot) return false;
            const start = timeToMinutes(a.time);
            const end = start + (Number(a.durationMinutes) || 45);
            return slotMin > start && slotMin < end;
          });

          // Caso 1: Horário intermediário de uma sessão em andamento
          if (aptsInSlot.length === 0 && ongoingApt) {
            const ongoingPatient = patients.find((p) => p.id === ongoingApt.patientId);
            const ongoingDoctor = doctors.find((d) => d.id === ongoingApt.doctorId);
            const endTime = getEndTime(ongoingApt.time, ongoingApt.durationMinutes);

            return (
              <div key={slot} className="slot-row">
                <span className="slot-time-col" style={{ opacity: 0.65 }}>{slot}</span>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--primary-border)',
                    borderLeft: '4px solid var(--primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.85rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Clock size={16} color="var(--primary)" />
                    <span>
                      <strong style={{ color: 'var(--text-headline)' }}>Horário em atendimento:</strong>{' '}
                      {ongoingPatient?.name} (Iniciado às {ongoingApt.time} • Término previsto às {endTime})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Profissional: {ongoingDoctor?.name}
                    </span>
                    <span className="badge badge-in_progress" style={{ fontSize: '0.72rem' }}>
                      Em curso ({ongoingApt.durationMinutes} min)
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // Caso 2: Horário livre na rota
          if (aptsInSlot.length === 0) {
            const nextApt = filteredAppointments
              .filter((a) => timeToMinutes(a.time) > slotMin)
              .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))[0];
            const freeMinutes = nextApt ? timeToMinutes(nextApt.time) - slotMin : null;

            return (
              <div key={slot} className="slot-row">
                <span className="slot-time-col">{slot}</span>
                <div
                  className="slot-free"
                  onClick={() => onOpenNewAppointment(null, slot, selectedDate, freeMinutes !== null && freeMinutes <= 30 ? 30 : 45)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Horário livre na rota de atendimento</span>
                    {freeMinutes !== null && freeMinutes < 60 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                        (Janela de {freeMinutes} min até {nextApt.time})
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Agendar sessão domiciliar neste horário
                  </span>
                </div>
              </div>
            );
          }

          // Caso 3: Agendamento(s) iniciando neste horário
          return (
            <div key={slot} className="slot-row">
              <span className="slot-time-col">{slot}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {aptsInSlot.map((aptInSlot) => {
                  const patient = patients.find((p) => p.id === aptInSlot.patientId);
                  const doctor = doctors.find((d) => d.id === aptInSlot.doctorId);
                  const endTime = getEndTime(aptInSlot.time, aptInSlot.durationMinutes);

                  return (
                    <div
                      key={aptInSlot.id}
                      className="slot-appointment-card"
                      style={{
                        borderLeft: aptInSlot.status === 'in_progress' ? '4px solid var(--primary)' : undefined,
                        background: aptInSlot.status === 'in_progress' ? 'var(--primary-subtle)' : undefined
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Avatar
                          src={patient?.avatar}
                          name={patient?.name}
                          size={46}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1rem', color: 'var(--text-headline)' }}>
                              {patient?.name}
                            </strong>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--primary)'
                              }}
                            >
                              ⏰ {aptInSlot.time} às {endTime} ({aptInSlot.durationMinutes || 45} min)
                            </span>
                            {getStatusBadge(aptInSlot.status)}
                            {/* Destaque do tempo de deslocamento urbano */}
                            {(aptInSlot.transitTimeMinutes !== undefined && aptInSlot.transitTimeMinutes > 0) ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: 'rgba(37, 99, 235, 0.1)',
                                  color: '#1d4ed8',
                                  border: '1px solid rgba(37, 99, 235, 0.25)',
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                                title="Tempo de deslocamento urbano até o domicílio do paciente"
                              >
                                🚗 Trânsito: {aptInSlot.transitTimeMinutes} min
                                {aptInSlot.transitKmFromPrevious ? ` (${aptInSlot.transitKmFromPrevious.toFixed(1)} km)` : ''}
                              </span>
                            ) : aptInSlot.transitTime ? (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: 'rgba(37, 99, 235, 0.08)',
                                  color: '#1d4ed8',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px'
                                }}
                              >
                                🚗 {aptInSlot.transitTime}
                              </span>
                            ) : null}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span>{aptInSlot.therapyType || aptInSlot.type}</span>
                            <span>• Profissional: <strong>{doctor?.name}</strong> {doctor?.profession ? `(${doctor.profession})` : ''}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              📍 {patient?.address || aptInSlot.address}
                            </span>
                            {aptInSlot.transitTimeMinutes !== undefined && (
                              <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                • Tempo de Deslocamento: {aptInSlot.transitTimeMinutes} min
                                {aptInSlot.transitKmFromPrevious ? ` (${aptInSlot.transitKmFromPrevious.toFixed(1)} km de rota)` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {aptInSlot.status === 'scheduled' && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}
                            onClick={() => onUpdateAppointmentStatus(aptInSlot.id, 'waiting')}
                          >
                            Iniciar Deslocamento
                          </button>
                        )}

                        {aptInSlot.status === 'waiting' && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => {
                              onUpdateAppointmentStatus(aptInSlot.id, 'in_progress');
                              onOpenPatientRecord(patient?.id);
                            }}
                          >
                            <Play size={13} /> Check-in Domiciliar
                          </button>
                        )}

                        {aptInSlot.status === 'in_progress' && (
                          <button
                            className="btn btn-success"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                            onClick={() => handleCompleteWithCelebration(aptInSlot.id)}
                          >
                            <CheckCircle2 size={13} /> Concluir Sessão
                          </button>
                        )}

                        <button
                          className="btn btn-outline-primary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                          onClick={() => onOpenPatientRecord(patient?.id)}
                        >
                          <UserCheck size={14} /> Detalhes
                        </button>

                        {aptInSlot.status !== 'cancelled' && aptInSlot.status !== 'completed' && (
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                            onClick={() => onUpdateAppointmentStatus(aptInSlot.id, 'cancelled')}
                            title="Cancelar Agendamento"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
