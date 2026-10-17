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
          onClick={() => {
            if (currentUser && onOpenProfileModal) {
              onOpenProfileModal();
            } else if (onOpenLoginModal) {
              onOpenLoginModal();
            }
          }}
          title={currentUser ? "Meu Perfil Profissional" : "Entrar ou Criar Perfil"}
        >
          {currentUser ? (
            <Avatar src={currentUser.avatar} name={currentUser.name} size={18} />
          ) : (
            <KeyRound size={15} color="var(--primary)" />
          )}
          <span className="auth-btn-label">
            {currentUser ? currentUser.name.split(' ')[0] : 'Entrar'}
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
            {doctors
              .filter((doc, idx, arr) => {
                const key = doc.email ? doc.email.toLowerCase().trim() : doc.id;
                return arr.findIndex((d) => (d.email ? d.email.toLowerCase().trim() : d.id) === key) === idx;
              })
              .map((doc) => (
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
          <button className="btn btn-secondary action-btn-compact" onClick={onOpenNewPatient} title="Cadastrar Novo Paciente">
            <UserPlus size={16} />
            <span className="btn-label-desktop">Novo Paciente</span>
            <span className="btn-label-mobile">Paciente</span>
          </button>
          <button className="btn btn-primary action-btn-compact" onClick={onOpenNewAppointment} title="Agendar Nova Sessão Domiciliar">
            <CalendarPlus size={16} />
            <span className="btn-label-desktop">Nova Sessão Domiciliar</span>
            <span className="btn-label-mobile">Sessão</span>
          </button>
        </div>
      </div>
    </header>
  );
}
