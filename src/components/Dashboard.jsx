// src/components/Dashboard.jsx
import React from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  Car,
  Home,
  FileHeart,
  Play,
  Navigation,
  ShieldAlert,
  Sparkles,
  Phone,
  Compass
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard({
  appointments = [],
  patients = [],
  doctors = [],
  onUpdateAppointmentStatus,
  onOpenPatientRecord,
  onOpenNewAppointment,
  activeDoctor
}) {
  const todayAppointments = appointments.filter((apt) => apt.date === '2026-09-28' || apt.date === '2026-09-27');

  const pendingCount = todayAppointments.filter((a) => a.status === 'scheduled' || a.status === 'waiting').length;
  const inProgressCount = todayAppointments.filter((a) => a.status === 'in_progress').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'completed').length;
  const totalSessions = todayAppointments.length;

  // Total planned distance
  const totalDistanceKm = todayAppointments
    .reduce((acc, apt) => acc + (apt.distanceFromPrevKm || 2.5), 0)
    .toFixed(1);

  const handleCompleteWithCelebration = (aptId) => {
    onUpdateAppointmentStatus(aptId, 'completed');
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting':
        return <span className="badge badge-waiting"><span className="badge-dot"></span>A Caminho do Domicílio</span>;
      case 'in_progress':
        return <span className="badge badge-in_progress"><span className="badge-dot"></span>Na Residência (Em Atendimento)</span>;
      case 'completed':
        return <span className="badge badge-completed"><span className="badge-dot"></span>Sessão Concluída</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled"><span className="badge-dot"></span>Cancelada / Reagendada</span>;
      default:
        return <span className="badge badge-scheduled"><span className="badge-dot"></span>Programada na Rota</span>;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Roteiro Domiciliar: {activeDoctor?.name || 'Dr. Lucas Silveira'}</h1>
          <p>
            Você possui <strong>{totalSessions} sessões domiciliares</strong> programadas hoje. Rota estimada em <strong>{totalDistanceKm} km</strong> de deslocamento urbano com cálculo geodésico.
          </p>
        </div>
        <div className="welcome-badge-date">
          <Navigation size={15} />
          <span>Central Operacional EMAD • São Paulo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Sessões Domiciliares</span>
            <div className="kpi-icon-box" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Home size={20} />
            </div>
          </div>
          <div className="kpi-value">{totalSessions}</div>
          <div className="kpi-trend" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            Roteiro 100% otimizado
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Distância Prevista (Haversine)</span>
            <div className="kpi-icon-box" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
              <Compass size={20} />
            </div>
          </div>
          <div className="kpi-value">{totalDistanceKm} <span style={{ fontSize: '1rem' }}>km</span></div>
          <div className="kpi-trend" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
            ~68 min em trânsito
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Em Atendimento no Domicílio</span>
            <div className="kpi-icon-box" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
              <Play size={20} />
            </div>
          </div>
          <div className="kpi-value">{inProgressCount}</div>
          <div className="kpi-trend" style={{ background: 'var(--warning-subtle)', color: '#b45309' }}>
            Check-in ativo
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Sessões Concluídas</span>
            <div className="kpi-icon-box" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value">{completedCount}</div>
          <div className="kpi-trend" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
            Evoluções salvas no PEP
          </div>
        </div>
      </div>

      {/* Main Grid: Domestic Sessions Route & Alerts */}
      <div className="dashboard-grid">
        {/* Left Column: Domestic Route List */}
        <div>
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">
                <Navigation size={18} color="var(--primary)" />
                Roteiro de Atendimentos Domiciliares de Hoje
              </h2>
              <button
                className="btn btn-outline-primary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={onOpenNewAppointment}
              >
                + Encaixar Nova Sessão
              </button>
            </div>

            <div className="queue-list">
              {todayAppointments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  Nenhuma sessão domiciliar programada para a data.
                </p>
              ) : (
                todayAppointments.map((apt, index) => {
                  const patient = patients.find((p) => p.id === apt.patientId);
                  const isAttending = apt.status === 'in_progress';

                  return (
                    <div key={apt.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {/* Transit indicator between houses */}
                      {index > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            paddingLeft: '1rem',
                            borderLeft: '2px dashed var(--primary-border)',
                            margin: '0.2rem 0 0.2rem 1.5rem'
                          }}
                        >
                          <Car size={14} color="var(--primary)" />
                          <span>
                            Deslocamento previsto: <strong>{apt.distanceFromPrevKm || '3.2'} km</strong> (~{apt.transitTimeMinutes || '16'} min c/ trânsito e buffer)
                          </span>
                        </div>
                      )}

                      <div className={`queue-card ${isAttending ? 'active-attending' : ''}`}>
                        <div className="queue-patient-info">
                          <img
                            src={patient?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt={patient?.name}
                            className="queue-patient-avatar"
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className="queue-patient-name">{patient?.name}</span>
                              {getStatusBadge(apt.status)}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                              <MapPin size={14} />
                              <span>{patient?.address || apt.address}</span>
                            </div>

                            <div className="queue-meta" style={{ flexWrap: 'wrap' }}>
                              <span className="queue-time">
                                <Clock size={12} /> {apt.time} ({apt.durationMinutes || 45} min)
                              </span>
                              <span>• {apt.type}</span>
                              {patient?.caregiver && (
                                <span style={{ color: 'var(--text-muted)' }}>
                                  • Cuidador(a): <strong>{patient.caregiver.split('-')[0]}</strong>
                                </span>
                              )}
                            </div>

                            {patient?.accessNotes && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                                Acesso: {patient.accessNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="queue-actions" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                          {apt.status === 'scheduled' && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                              onClick={() => onUpdateAppointmentStatus(apt.id, 'waiting')}
                            >
                              <Car size={13} /> A Caminho (Iniciar Rota)
                            </button>
                          )}

                          {apt.status === 'waiting' && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                              onClick={() => {
                                onUpdateAppointmentStatus(apt.id, 'in_progress');
                                onOpenPatientRecord(patient?.id);
                              }}
                            >
                              <MapPin size={14} /> Check-in no Domicílio
                            </button>
                          )}

                          {apt.status === 'in_progress' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                              onClick={() => handleCompleteWithCelebration(apt.id)}
                            >
                              <CheckCircle2 size={14} /> Finalizar Sessão Domiciliar
                            </button>
                          )}

                          <button
                            className="btn btn-outline-primary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                            onClick={() => onOpenPatientRecord(patient?.id)}
                            title="Abrir Prontuário Domiciliar"
                          >
                            <FileHeart size={14} /> PEP Domiciliar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Home Care Logistics & Alerts */}
        <div>
          {/* Care Team & Home Alerts */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
              <h2 className="section-title">
                <ShieldAlert size={18} color="var(--danger)" />
                Alertas da Atenção Domiciliar
              </h2>
              <span className="badge badge-waiting">2 Atenções</span>
            </div>

            <div className="alert-card-item alert-danger-soft">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Alerta de Atenção Clínica: Mariana Souza Lima</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Restrições clínicas registradas no PEP domiciliar. Conferir conduta antes de procedimentos invasivos.
                </p>
              </div>
            </div>

            <div className="alert-card-item alert-warning-soft">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Oxigenoterapia Domiciliar: Juliana Mendes Prado</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Verificar manômetro do concentrador de O2 e saturação em repouso durante a sessão.
                </p>
              </div>
            </div>

            <div className="alert-card-item alert-info-soft">
              <Compass size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Scheduler Geodésico Ativo</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Janelas de trânsito calculadas automaticamente com velocidade média urbana de 30 km/h e 10 min de margem para estacionamento e acesso.
                </p>
              </div>
            </div>
          </div>

          {/* Perfil Clínico e Níveis de Complexidade */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">
                <Home size={18} color="var(--accent)" />
                Perfil Clínico & Complexidade Domiciliar
              </h2>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Alta Complexidade & Suporte Ventilatório (BiPAP/VM)</span>
                <span style={{ color: '#0284c7' }}>30%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '30%', background: '#0284c7' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Doenças Neurodegenerativas, Raras & Reabilitação</span>
                <span style={{ color: '#9333ea' }}>25%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '25%', background: '#9333ea' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Oncologia & Cuidados Paliativos Domiciliares</span>
                <span style={{ color: '#d97706' }}>25%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '25%', background: '#d97706' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Pós-Cirúrgico Complexo, Feridas & Doenças Crônicas</span>
                <span style={{ color: '#059669' }}>20%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '20%', background: '#059669' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
