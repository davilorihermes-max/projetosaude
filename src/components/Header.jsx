// src/components/Header.jsx
import React from 'react';
import { Search, Bell, Plus, UserPlus, CalendarPlus, Stethoscope, KeyRound, ShieldCheck } from 'lucide-react';
import './Header.css';

export default function Header({
  searchQuery,
  setSearchQuery,
  selectedDoctorId,
  setSelectedDoctorId,
  doctors = [],
  onOpenNewAppointment,
  onOpenNewPatient,
  onOpenNotifications,
  unreadCount = 2,
  currentUser,
  onOpenLoginModal
}) {
  return (
    <header className="header-container">
      <div className="header-left">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por paciente, endereço residencial, CPF ou procedimento domiciliar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        {/* JWT Auth Status Button */}
        <button
          className="btn btn-secondary auth-session-btn"
          style={{
            fontSize: '0.8rem',
            padding: '0.45rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: currentUser ? '1px solid var(--success-border)' : '1px solid var(--border-color)',
            background: currentUser ? 'var(--success-subtle)' : 'var(--bg-card)'
          }}
          onClick={onOpenLoginModal}
          title="Autenticação JWT Fastify (Porta 3001)"
        >
          {currentUser?.role === 'ADMIN' ? (
            <ShieldCheck size={15} color="var(--primary)" />
          ) : (
            <KeyRound size={15} color={currentUser ? 'var(--success)' : 'var(--primary)'} />
          )}
          <span>
            {currentUser ? `${currentUser.name} (JWT Ativo)` : 'Fazer Login (dr lucas)'}
          </span>
        </button>

        <div className="doctor-select-wrapper">
          <Stethoscope size={16} color="var(--primary)" />
          <span className="doctor-select-label">Profissional em Rota:</span>
          <select
            className="doctor-select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            <option value="all">Toda a Equipe</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.specialty.split('&')[0]})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-icon notifications-btn"
          onClick={onOpenNotifications}
          title="Notificações Operacionais e Alertas"
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
        </button>

        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={onOpenNewPatient}>
            <UserPlus size={16} />
            <span>Novo Paciente</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenNewAppointment}>
            <CalendarPlus size={16} />
            <span>Nova Sessão Domiciliar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
