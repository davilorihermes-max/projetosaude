// src/components/PatientsView.jsx
import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  CalendarPlus,
  ShieldCheck
} from 'lucide-react';
import './PatientsView.css';

export default function PatientsView({
  patients = [],
  onOpenNewPatient,
  onOpenNewAppointment,
  onNavigateToPlanner
}) {
  const [search, setSearch] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState('all');

  const insuranceOptions = ['all', 'Unimed Pleno', 'Bradesco Saúde Top', 'SulAmérica Exato', 'Amil Fácil', 'Particular'];

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      patient.cpf.includes(search) ||
      patient.phone.includes(search);

    const matchesInsurance =
      selectedInsurance === 'all' || patient.insurance === selectedInsurance;

    return matchesSearch && matchesInsurance;
  });

  return (
    <div className="patients-container">
      {/* Top Toolbar */}
      <div className="patients-toolbar">
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Gestão de Pacientes</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total de <strong>{patients.length}</strong> pacientes ativos na clínica.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="search-box" style={{ width: '280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onOpenNewPatient}>
            <UserPlus size={16} /> Cadastrar Paciente
          </button>
        </div>
      </div>

      {/* Banner de Demandas Terapêuticas & Escala */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '10px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="#2563eb" />
          <span style={{ fontSize: '0.85rem', color: '#1e3a8a' }}>
            <strong>Necessidades Terapêuticas & Escala Mensal:</strong> Cada paciente pode ter até 3 demandas terapêuticas cruzadas com os horários reais dos terapeutas.
          </span>
        </div>
        {onNavigateToPlanner && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            onClick={onNavigateToPlanner}
          >
            ⚙️ Abrir Planejador de Demandas & Horários ➡️
          </button>
        )}
      </div>

      {/* Insurance Filter Chips */}
      <div className="insurance-filters">
        {insuranceOptions.map((ins) => (
          <button
            key={ins}
            className={`filter-chip ${selectedInsurance === ins ? 'active' : ''}`}
            onClick={() => setSelectedInsurance(ins)}
          >
            {ins === 'all' ? 'Todos os Convênios' : ins}
          </button>
        ))}
      </div>

      {/* Patients Grid */}
      <div className="patients-grid">
        {filteredPatients.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>Nenhum paciente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            return (
              <div key={patient.id} className="patient-card">
                <div className="patient-card-header">
                  <img src={patient.avatar} alt={patient.name} className="patient-card-avatar" />
                  <div className="patient-card-info">
                    <h4>{patient.name}</h4>
                    <p>
                      {patient.age} anos • {patient.gender}
                    </p>
                    <span className="badge badge-scheduled" style={{ marginTop: '0.25rem' }}>
                      {patient.insurance}
                    </span>
                  </div>
                </div>

                <div className="patient-card-body">
                  <div className="patient-metric-row">
                    <span style={{ color: 'var(--text-muted)' }}>📍 Domicílio:</span>
                    <strong style={{ fontSize: '0.8rem', textAlign: 'right', maxWidth: '65%' }}>
                      {patient.address || 'São Paulo - SP'}
                    </strong>
                  </div>
                  {patient.caregiver && (
                    <div className="patient-metric-row">
                      <span style={{ color: 'var(--text-muted)' }}>Cuidador(a):</span>
                      <span style={{ fontSize: '0.78rem' }}>{patient.caregiver}</span>
                    </div>
                  )}
                  {patient.mobilityStatus && (
                    <div className="patient-metric-row">
                      <span style={{ color: 'var(--text-muted)' }}>Mobilidade:</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {patient.mobilityStatus}
                      </span>
                    </div>
                  )}
                  <div className="patient-metric-row">
                    <span style={{ color: 'var(--text-muted)' }}>📞 Contato:</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{patient.phone}</span>
                  </div>
                  {patient.accessNotes && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      🔑 {patient.accessNotes}
                    </div>
                  )}
                </div>

                <div className="patient-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {onNavigateToPlanner && (
                    <button
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.78rem',
                        padding: '0.45rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        border: '1px solid #93c5fd',
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      onClick={onNavigateToPlanner}
                    >
                      ⚙️ Configurar Demandas (Até 3) & Escala
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    onClick={() => onOpenNewAppointment(patient.id)}
                  >
                    <CalendarPlus size={15} /> Agendar Sessão Domiciliar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
