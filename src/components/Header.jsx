// src/components/Header.jsx
import React from 'react';
import { Search, Bell, Plus, UserPlus, CalendarPlus, Stethoscope } from 'lucide-react';
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
  unreadCount = 2
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
