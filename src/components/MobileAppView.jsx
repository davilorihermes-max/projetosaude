// src/components/MobileAppView.jsx
import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Clock,
  Car,
  MapPin,
  CheckCircle2,
  Play,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Compass,
  User,
  Monitor
} from 'lucide-react';
import Avatar from './Avatar';
import './MobileAppView.css';

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

export default function MobileAppView({
  appointments = [],
  patients = [],
  doctors = [],
  currentUser = null,
  activeDoctor = null,
  onUpdateAppointmentStatus,
  onOpenNewAppointment,
  onOpenLoginModal,
  onSwitchToDesktop
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Lista de datas disponíveis com atendimentos
  const allDatesWithApts = useMemo(() => {
    return Array.from(new Set(appointments.map((a) => a.date).filter(Boolean))).sort();
  }, [appointments]);

  // Data ativa selecionada
  const [selectedDate, setSelectedDate] = useState(() => {
    if (appointments.some((a) => a.date === todayStr)) return todayStr;
    if (allDatesWithApts.length > 0) return allDatesWithApts[0];
    return todayStr;
  });

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Filtragem dos atendimentos do dia para o profissional
  const dayAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        const matchesDate = apt.date === selectedDate;
        if (!matchesDate) return false;
        if (activeDoctor && activeDoctor.id !== 'all') {
          return apt.doctorId === activeDoctor.id;
        }
        return true;
      })
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [appointments, selectedDate, activeDoctor]);

  // KPIs da Rota
  const totalCount = dayAppointments.length;
  const completedCount = dayAppointments.filter((a) => a.status === 'completed').length;
  const inProgressCount = dayAppointments.filter((a) => a.status === 'in_progress').length;
  const totalKm = dayAppointments
    .reduce((acc, curr) => acc + (curr.distanceFromPrevKm || curr.transitKmFromPrevious || 2.5), 0)
    .toFixed(1);
  const totalTransitMinutes = dayAppointments.reduce(
    (acc, curr) => acc + (curr.transitTimeMinutes || 15),
    0
  );

  const handleCompleteWithCelebration = (aptId) => {
    onUpdateAppointmentStatus(aptId, 'completed');
    try {
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.7 }
      });
    } catch {}
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="mob-badge mob-badge-waiting">🚗 A Caminho</span>;
      case 'in_progress':
        return <span className="mob-badge mob-badge-progress">📍 No Domicílio</span>;
      case 'completed':
        return <span className="mob-badge mob-badge-completed">✓ Concluído</span>;
      default:
        return <span className="mob-badge mob-badge-scheduled">Agendado</span>;
    }
  };

  return (
    <div className="mobile-app-root">
      {/* Top Mobile Bar */}
      <header className="mobile-app-header">
        <div className="mob-header-info">
          <span className="mob-app-brand">OmniHome Care</span>
          <span className="mob-app-subtitle">
            {activeDoctor?.name ? `Dr(a). ${activeDoctor.name}` : 'Atendimentos Domiciliares'}
          </span>
        </div>

        <div className="mob-header-actions">
          {currentUser ? (
            <button
              type="button"
              className="mob-btn-icon"
              onClick={onOpenLoginModal}
              title={`Conectado como ${currentUser.name}`}
            >
              <User size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="mob-btn-login"
              onClick={onOpenLoginModal}
            >
              Entrar
            </button>
          )}

          {onSwitchToDesktop && (
            <button
              type="button"
              className="mob-btn-desktop-toggle"
              onClick={onSwitchToDesktop}
              title="Abrir versão de computador completa"
            >
              <Monitor size={15} /> Versão PC
            </button>
          )}
        </div>
      </header>

      {/* Date Navigation Strip */}
      <section className="mob-date-strip">
        <button
          type="button"
          className="mob-date-nav-btn"
          onClick={handlePrevDay}
          title="Dia Anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="mob-date-display">
          <CalendarDays size={16} color="var(--primary)" />
          <input
            type="date"
            className="mob-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {selectedDate === todayStr && (
            <span className="mob-today-tag">Hoje</span>
          )}
        </div>

        <button
          type="button"
          className="mob-date-nav-btn"
          onClick={handleNextDay}
          title="Próximo Dia"
        >
          <ChevronRight size={18} />
        </button>
      </section>

      {/* KPIs Summary Cards */}
      <section className="mob-kpi-row">
        <div className="mob-kpi-card">
          <span className="mob-kpi-num">{completedCount}/{totalCount}</span>
          <span className="mob-kpi-txt">Sessões</span>
        </div>
        <div className="mob-kpi-card">
          <span className="mob-kpi-num">{totalKm} km</span>
          <span className="mob-kpi-txt">Deslocamento</span>
        </div>
        <div className="mob-kpi-card">
          <span className="mob-kpi-num">~{totalTransitMinutes} min</span>
          <span className="mob-kpi-txt">Em Trânsito</span>
        </div>
      </section>

      {/* Actions Bar */}
      <div className="mob-action-bar">
        <button
          type="button"
          className="mob-btn-add-session"
          onClick={() => onOpenNewAppointment(null, '09:00', selectedDate)}
        >
          <Plus size={16} /> Agendar Nova Sessão
        </button>
      </div>

      {/* Appointments & Displacement Feed */}
      <main className="mob-sessions-feed">
        {dayAppointments.length === 0 ? (
          <div className="mob-empty-feed">
            <Compass size={40} color="var(--primary)" />
            <h3>Nenhuma sessão nesta data</h3>
            <p>
              Você não tem atendimentos agendados para este dia. Toque no botão acima para agendar uma nova sessão.
            </p>
            {allDatesWithApts.length > 0 && !allDatesWithApts.includes(selectedDate) && (
              <div className="mob-suggested-dates">
                <span>Dias com atendimentos:</span>
                <div className="mob-dates-tags">
                  {allDatesWithApts.slice(0, 4).map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="mob-date-pill"
                      onClick={() => setSelectedDate(d)}
                    >
                      {d.slice(8, 10)}/{d.slice(5, 7)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          dayAppointments.map((apt, index) => {
            const patient = patients.find((p) => p.id === apt.patientId);
            const doctor = doctors.find((d) => d.id === apt.doctorId);
            const endTime = getEndTime(apt.time, apt.durationMinutes);
            const isInProgress = apt.status === 'in_progress';
            const isCompleted = apt.status === 'completed';

            // Link Google Maps
            const mapsUrl = patient?.latitude && patient?.longitude
              ? `https://www.google.com/maps/search/?api=1&query=${patient.latitude},${patient.longitude}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(patient?.address || apt.address || 'Vitória - ES')}`;

            return (
              <div key={apt.id} className="mob-item-container">
                {/* Deslocamento entre atendimentos */}
                {index > 0 && (
                  <div className="mob-transit-banner">
                    <Car size={15} color="#2563eb" />
                    <span>
                      Deslocamento previsto: <strong>~{apt.transitTimeMinutes || 15} min</strong> ({apt.distanceFromPrevKm || apt.transitKmFromPrevious || '2.8'} km)
                    </span>
                  </div>
                )}

                {/* Card do Atendimento */}
                <div className={`mob-session-card ${isInProgress ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}>
                  {/* Topo do Card */}
                  <div className="mob-card-header">
                    <div className="mob-time-badge">
                      <Clock size={13} />
                      <span>{apt.time} - {endTime}</span>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>

                  {/* Dados do Paciente */}
                  <div className="mob-patient-row">
                    <Avatar
                      src={patient?.avatar}
                      name={patient?.name}
                      size={42}
                    />
                    <div className="mob-patient-details">
                      <span className="mob-patient-name">{patient?.name || 'Paciente'}</span>
                      <span className="mob-therapy-name">
                        {apt.therapyType || apt.type || 'Sessão Domiciliar'}
                      </span>
                    </div>
                  </div>

                  {/* Endereço com Clique Direto para Google Maps */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mob-maps-link"
                    title="Toque para navegar no Google Maps"
                  >
                    <div className="mob-maps-icon">
                      <MapPin size={16} />
                    </div>
                    <span className="mob-maps-address">
                      {patient?.address || apt.address || 'Endereço não cadastrado'}
                    </span>
                    <span className="mob-maps-badge">
                      <ExternalLink size={12} /> Maps
                    </span>
                  </a>

                  {/* Notas de Acesso */}
                  {patient?.accessNotes && (
                    <div className="mob-access-notes">
                      <strong>Acesso:</strong> {patient.accessNotes}
                    </div>
                  )}

                  {/* Ações de Status e Check-in */}
                  <div className="mob-actions-row">
                    {apt.status === 'scheduled' && (
                      <button
                        type="button"
                        className="mob-btn-action mob-btn-travel"
                        onClick={() => onUpdateAppointmentStatus(apt.id, 'waiting')}
                      >
                        <Car size={15} /> Iniciar Deslocamento
                      </button>
                    )}

                    {apt.status === 'waiting' && (
                      <button
                        type="button"
                        className="mob-btn-action mob-btn-checkin"
                        onClick={() => onUpdateAppointmentStatus(apt.id, 'in_progress')}
                      >
                        <Play size={15} /> Fazer Check-in no Domicílio
                      </button>
                    )}

                    {apt.status === 'in_progress' && (
                      <button
                        type="button"
                        className="mob-btn-action mob-btn-finish"
                        onClick={() => handleCompleteWithCelebration(apt.id)}
                      >
                        <CheckCircle2 size={16} /> Finalizar Sessão
                      </button>
                    )}

                    {apt.status === 'completed' && (
                      <div className="mob-done-indicator">
                        <CheckCircle2 size={16} color="#059669" />
                        <span>Sessão finalizada</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
