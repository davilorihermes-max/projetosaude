// src/components/PatientsView.jsx
import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  FileHeart,
  CalendarPlus,
  AlertCircle,
  ShieldCheck,
  Heart
} from 'lucide-react';
import './PatientsView.css';

export default function PatientsView({
  patients = [],
  onOpenPatientRecord,
  onOpenNewPatient,
  onOpenNewAppointment
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
            const latestVitals = patient.vitalsHistory?.[patient.vitalsHistory.length - 1];
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
                    <span style={{ color: 'var(--text-muted)' }}>CPF:</span>
                    <strong>{patient.cpf}</strong>
                  </div>
                  <div className="patient-metric-row">
                    <span style={{ color: 'var(--text-muted)' }}>Telefone:</span>
                    <span>{patient.phone}</span>
                  </div>
                  <div className="patient-metric-row">
                    <span style={{ color: 'var(--text-muted)' }}>Última PA:</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {latestVitals ? `${latestVitals.bpSystolic}/${latestVitals.bpDiastolic} mmHg` : 'N/A'}
                    </span>
                  </div>
                  {patient.allergies && patient.allergies.length > 0 && patient.allergies[0] !== 'Nenhuma conhecida' && (
                    <div style={{ marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={13} /> Alergias: {patient.allergies.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="patient-card-actions">
                  <button
                    className="btn btn-outline-primary"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem' }}
                    onClick={() => onOpenPatientRecord(patient.id)}
                  >
                    <FileHeart size={15} /> Prontuário (PEP)
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                    onClick={() => onOpenNewAppointment(patient.id)}
                    title="Agendar Consulta para este paciente"
                  >
                    <CalendarPlus size={15} />
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
