// src/components/ScheduleView.jsx
import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Video,
  FileHeart,
  Plus,
  Play,
  XCircle,
  Filter,
  UserCheck
} from 'lucide-react';
import './ScheduleView.css';

export default function ScheduleView({
  appointments = [],
  patients = [],
  doctors = [],
  onUpdateAppointmentStatus,
  onOpenPatientRecord,
  onOpenNewAppointment,
  selectedDoctorId
}) {
  const [selectedDate, setSelectedDate] = useState('2026-09-27');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesDoctor = selectedDoctorId === 'all' || apt.doctorId === selectedDoctorId;
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesDate && matchesDoctor && matchesStatus;
  });

  const timeSlots = [
    '08:00', '08:30', '09:15', '10:00', '11:00', '12:00',
    '13:30', '14:00', '15:30', '16:30', '17:30'
  ];

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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', fontWeight: 600 }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => onOpenNewAppointment()}>
            <Plus size={16} /> Nova Sessão Domiciliar
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Todas as Sessões' },
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

      {/* Timeline Slots */}
      <div className="timeline-slots-grid">
        {timeSlots.map((slot) => {
          const aptInSlot = filteredAppointments.find((a) => a.time === slot);

          if (!aptInSlot) {
            return (
              <div key={slot} className="slot-row">
                <span className="slot-time-col">{slot}</span>
                <div
                  className="slot-free"
                  onClick={() => onOpenNewAppointment(null, slot)}
                  style={{ cursor: 'pointer' }}
                >
                  <span>Horário livre na rota de atendimento</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    + Agendar sessão domiciliar neste horário
                  </span>
                </div>
              </div>
            );
          }

          const patient = patients.find((p) => p.id === aptInSlot.patientId);
          const doctor = doctors.find((d) => d.id === aptInSlot.doctorId);

          return (
            <div key={slot} className="slot-row">
              <span className="slot-time-col">{slot}</span>
              <div
                className="slot-appointment-card"
                style={{
                  borderLeft: aptInSlot.status === 'in_progress' ? '4px solid var(--primary)' : undefined,
                  background: aptInSlot.status === 'in_progress' ? 'var(--primary-subtle)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img
                    src={patient?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={patient?.name}
                    style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-headline)' }}>
                        {patient?.name}
                      </strong>
                      {getStatusBadge(aptInSlot.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span>{aptInSlot.type}</span>
                      <span>• Profissional: <strong>{doctor?.name}</strong></span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        📍 {patient?.address || aptInSlot.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <FileHeart size={14} /> PEP
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
