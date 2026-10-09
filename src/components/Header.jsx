// src/components/Header.jsx
import React from 'react';
import { Search, Bell, Plus, UserPlus, CalendarPlus, UserCheck, KeyRound, ShieldCheck } from 'lucide-react';
import './Header.css';
import Avatar from './Avatar';

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
  onOpenLoginModal,
  onOpenProfileModal,
  onOpenNewProfessional
}) {
  return (
    <header className="header-container">
      <div className="header-left">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por paciente, endereço residencial, CPF ou bairro..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        {/* JWT Auth Status & Profile Button */}
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
          onClick={() => {
            if (currentUser && onOpenProfileModal) {
              onOpenProfileModal();
            } else if (onOpenLoginModal) {
              onOpenLoginModal();
            }
          }}
          title={currentUser ? "Meu Perfil Profissional (JWT Ativo)" : "Entrar ou Criar Perfil"}
        >
          {currentUser ? (
            <Avatar src={currentUser.avatar} name={currentUser.name} size={20} />
          ) : (
            <KeyRound size={15} color="var(--primary)" />
          )}
          <span>
            {currentUser ? `${currentUser.name} (Perfil)` : 'Entrar / Criar Perfil'}
          </span>
        </button>

        <div className="doctor-select-wrapper">
          <UserCheck size={16} color="var(--primary)" />
          <span className="doctor-select-label">Profissional em Rota:</span>
          <select
            className="doctor-select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            <option value="all">Toda a Equipe Multidisciplinar</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} • {doc.profession || 'Especialista'} ({doc.councilNumber || doc.crm || doc.specialty})
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
