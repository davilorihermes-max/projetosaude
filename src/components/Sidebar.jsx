// src/components/Sidebar.jsx
import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  FileHeart,
  Users,
  Pill,
  Moon,
  Sun,
  Activity,
  Settings,
  ShieldCheck
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  waitingCount = 0,
  doctor
}) {
  const navItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'schedule', label: 'Agenda & Consultas', icon: CalendarDays, badge: waitingCount > 0 ? `${waitingCount} na fila` : null },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'records', label: 'Prontuário (PEP)', icon: FileHeart },
    { id: 'prescriptions', label: 'Receituário Rápido', icon: Pill },
    { id: 'clinic', label: 'Clínica & Config.', icon: Settings }
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="brand-icon-box">
            <Activity size={26} strokeWidth={2.4} />
          </div>
          <div className="brand-info">
            <span className="brand-title">OmniSaúde</span>
            <span className="brand-tagline">Clínica & PEP</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Menu Principal</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          className="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title="Alternar tema claro/escuro"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </span>
          <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{darkMode ? 'ON' : 'OFF'}</span>
        </button>

        <div className="doctor-profile-card">
          <img
            src={doctor?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
            alt={doctor?.name || 'Médico'}
            className="profile-avatar"
          />
          <div className="profile-details">
            <span className="profile-name">{doctor?.name || 'Dr. Lucas Silveira'}</span>
            <span className="profile-role">{doctor?.crm || 'CRM/SP 142.890'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
