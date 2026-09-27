// src/components/Dashboard.jsx
import React from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Video,
  FileText,
  Play,
  ArrowRight,
  ShieldAlert,
  Sparkles
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
  // Filter appointments for today
  const todayAppointments = appointments.filter((apt) => apt.date === '2026-09-27');
  
  const waitingCount = todayAppointments.filter((a) => a.status === 'waiting').length;
  const inProgressCount = todayAppointments.filter((a) => a.status === 'in_progress').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'completed').length;
  const totalToday = todayAppointments.length;

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
        return <span className="badge badge-waiting"><span className="badge-dot"></span>Aguardando Recepção</span>;
      case 'in_progress':
        return <span className="badge badge-in_progress"><span className="badge-dot"></span>Em Atendimento</span>;
      case 'completed':
        return <span className="badge badge-completed"><span className="badge-dot"></span>Concluída</span>;
      case 'cancelled':
        return <span className="badge badge-cancelled"><span className="badge-dot"></span>Cancelada</span>;
      default:
        return <span className="badge badge-scheduled"><span className="badge-dot"></span>Agendada</span>;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-text">
          <h1>Olá, {activeDoctor?.name || 'Dr. Lucas Silveira'}</h1>
          <p>
            Bem-vindo ao OmniSaúde. Hoje você possui <strong>{totalToday} consultas</strong> na agenda com{' '}
            <strong>{waitingCount} paciente(s) aguardando</strong> atendimento.
          </p>
        </div>
        <div className="welcome-badge-date">
          <Calendar size={15} />
          <span>Hoje, 27 de Setembro de 2026</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Agendamentos de Hoje</span>
            <div className="kpi-icon-box" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div className="kpi-value">{totalToday}</div>
          <div className="kpi-trend" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
            <TrendingUp size={14} /> +12% esta semana
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Aguardando Recepção</span>
            <div className="kpi-icon-box" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value">{waitingCount}</div>
          <div className="kpi-trend" style={{ background: 'var(--warning-subtle)', color: '#b45309' }}>
            Tempo médio: 8 min
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Em Atendimento</span>
            <div className="kpi-icon-box" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
              <Play size={20} />
            </div>
          </div>
          <div className="kpi-value">{inProgressCount}</div>
          <div className="kpi-trend" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
            Consultório 04 ativo
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Atendimentos Concluídos</span>
            <div className="kpi-icon-box" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value">{completedCount}</div>
          <div className="kpi-trend" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
            100% pontualidade
          </div>
        </div>
      </div>

      {/* Main Grid: Live Queue & Clinical Sidebar */}
      <div className="dashboard-grid">
        {/* Left Column: Live Queue */}
        <div>
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">
                <Clock size={18} color="var(--primary)" />
                Fila de Atendimento do Dia
              </h2>
              <button className="btn btn-outline-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={onOpenNewAppointment}>
                + Adicionar Encaixe
              </button>
            </div>

            <div className="queue-list">
              {todayAppointments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  Nenhum agendamento para hoje.
                </p>
              ) : (
                todayAppointments.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patientId);
                  const doctor = doctors.find((d) => d.id === apt.doctorId);
                  const isAttending = apt.status === 'in_progress';

                  return (
                    <div key={apt.id} className={`queue-card ${isAttending ? 'active-attending' : ''}`}>
                      <div className="queue-patient-info">
                        <img
                          src={patient?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={patient?.name}
                          className="queue-patient-avatar"
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="queue-patient-name">{patient?.name}</span>
                            {getStatusBadge(apt.status)}
                          </div>
                          <div className="queue-meta">
                            <span className="queue-time">
                              <Clock size={12} /> {apt.time}
                            </span>
                            <span>• {apt.type}</span>
                            <span>• {apt.room}</span>
                            {apt.modality === 'Telemedicina' && (
                              <span style={{ color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                                <Video size={12} /> Telemedicina
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="queue-actions">
                        {apt.status === 'waiting' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              onUpdateAppointmentStatus(apt.id, 'in_progress');
                              onOpenPatientRecord(patient?.id);
                            }}
                          >
                            <Play size={14} /> Chamar / Iniciar
                          </button>
                        )}

                        {apt.status === 'in_progress' && (
                          <button
                            className="btn btn-success"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                            onClick={() => handleCompleteWithCelebration(apt.id)}
                          >
                            <CheckCircle2 size={14} /> Concluir Consulta
                          </button>
                        )}

                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => onOpenPatientRecord(patient?.id)}
                          title="Abrir Prontuário Eletrônico"
                        >
                          <FileText size={14} /> Prontuário
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Weekly Consultations Chart */}
          <div className="card chart-card">
            <div className="section-header">
              <h2 className="section-title">
                <TrendingUp size={18} color="var(--primary)" />
                Fluxo de Pacientes na Semana
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Média: 16 atendimentos/dia</span>
            </div>

            <div className="bar-chart-container">
              {[
                { day: 'Seg', val: 14, pct: '60%' },
                { day: 'Ter', val: 18, pct: '80%' },
                { day: 'Qua', val: 22, pct: '95%' },
                { day: 'Qui', val: 19, pct: '85%' },
                { day: 'Sex', val: 16, pct: '70%' },
                { day: 'Sáb', val: 8, pct: '35%' },
                { day: 'Hoje', val: totalToday, pct: '75%', highlight: true }
              ].map((item, idx) => (
                <div key={idx} className="bar-col">
                  <span className="bar-val">{item.val}</span>
                  <div className="bar-fill-track">
                    <div
                      className={`bar-fill-bar ${item.highlight ? 'highlight' : ''}`}
                      style={{ height: item.pct }}
                    ></div>
                  </div>
                  <span className="bar-label">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Clinical Alerts & Specialties */}
        <div>
          {/* Clinical Alerts */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="section-header">
              <h2 className="section-title">
                <ShieldAlert size={18} color="var(--danger)" />
                Alertas Clínicos Críticos
              </h2>
              <span className="badge badge-waiting">2 Pendências</span>
            </div>

            <div className="alert-card-item alert-danger-soft">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Alergia Severa: Mariana Souza Lima</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Alergia comprovada a <strong>Penicilina</strong> e <strong>Dipirona</strong>. Checar antes de qualquer prescrição.
                </p>
              </div>
            </div>

            <div className="alert-card-item alert-warning-soft">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Exame Pendente: Roberto Carlos Peixoto</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Resultados de HbA1c e perfil lipídico liberados pelo laboratório parceiro para conferência médica.
                </p>
              </div>
            </div>

            <div className="alert-card-item alert-info-soft">
              <Sparkles size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Telemedicina Integrada Ativa</strong>
                <p style={{ marginTop: '0.2rem', fontSize: '0.78rem' }}>
                  Sala Virtual pronta com link seguro e criptografia para a consulta das 11:00.
                </p>
              </div>
            </div>
          </div>

          {/* Specialties distribution */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">
                <UserCheck size={18} color="var(--accent)" />
                Atendimentos por Especialidade
              </h2>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Cardiologia</span>
                <span style={{ color: '#0284c7' }}>40%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '40%', background: '#0284c7' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Clínica Geral</span>
                <span style={{ color: '#059669' }}>25%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '25%', background: '#059669' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Pediatria</span>
                <span style={{ color: '#d97706' }}>20%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '20%', background: '#d97706' }}></div>
              </div>
            </div>

            <div className="specialty-row">
              <div className="specialty-meta">
                <span>Dermatologia</span>
                <span style={{ color: '#9333ea' }}>15%</span>
              </div>
              <div className="specialty-bar-track">
                <div className="specialty-bar-fill" style={{ width: '15%', background: '#9333ea' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
