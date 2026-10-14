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
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import './PatientsView.css';
import Avatar from './Avatar';

export default function PatientsView({
  patients = [],
  appointments = [],
  activeDoctor,
  onOpenNewPatient,
  onOpenNewAppointment,
  onNavigateToPlanner
}) {
  const [search, setSearch] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState('all');
  const [scope, setScope] = useState(activeDoctor && activeDoctor.id !== 'all' ? 'my' : 'all');

  const insuranceOptions = ['all', 'Unimed Pleno', 'Bradesco Saúde Top', 'SulAmérica Exato', 'Amil Fácil', 'Particular'];

  // IDs de pacientes vinculados aos atendimentos do profissional ativo
  const myPatientIds = new Set(
    appointments
      .filter((a) => !activeDoctor || activeDoctor.id === 'all' || a.doctorId === activeDoctor.id)
      .map((a) => a.patientId)
  );

  const scopedPatients = scope === 'my' && activeDoctor && activeDoctor.id !== 'all'
    ? patients.filter((p) => myPatientIds.has(p.id))
    : patients;

  const filteredPatients = scopedPatients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(search.toLowerCase()) ||
      (patient.cpf && patient.cpf.includes(search)) ||
      (patient.phone && patient.phone.includes(search));

    const matchesInsurance =
      selectedInsurance === 'all' || patient.insurance === selectedInsurance;

    return matchesSearch && matchesInsurance;
  });

  const myCount = patients.filter((p) => myPatientIds.has(p.id)).length;

  return (
    <div className="patients-container">
      {/* Top Toolbar */}
      <div className="patients-toolbar">
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Gestão de Pacientes & Domicílios</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {scope === 'my' && activeDoctor && activeDoctor.id !== 'all' ? (
              <>
                Exibindo <strong>{filteredPatients.length}</strong> paciente(s) sob cuidado de <strong>{activeDoctor.name}</strong>.
              </>
            ) : (
              <>
                Total de <strong>{patients.length}</strong> pacientes ativos na base da clínica.
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: '280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, CPF ou fone..."
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
        background: 'var(--primary-subtle)',
        border: '1px solid var(--primary-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-headline)' }}>
            <strong>Necessidades Terapêuticas & Escala Mensal:</strong> Cada paciente pode ter até 3 demandas terapêuticas cruzadas com os horários reais dos terapeutas.
          </span>
        </div>
        {onNavigateToPlanner && (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 600 }}
            onClick={onNavigateToPlanner}
          >
            ⚙️ Abrir Planejador de Demandas & Horários ➡️
          </button>
        )}
      </div>

      {/* Scope and Filters Bar */}
      <div className="patients-filters-bar">
        {activeDoctor && activeDoctor.id !== 'all' && (
          <div className="scope-tabs">
            <button
              className={`scope-tab ${scope === 'my' ? 'active' : ''}`}
              onClick={() => setScope('my')}
            >
              <UserCheck size={14} /> Meus Pacientes ({myCount})
            </button>
            <button
              className={`scope-tab ${scope === 'all' ? 'active' : ''}`}
              onClick={() => setScope('all')}
            >
              <Users size={14} /> Todos da Clínica ({patients.length})
            </button>
          </div>
        )}

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
      </div>

      {/* Patients Grid */}
      <div className="patients-grid">
        {filteredPatients.length === 0 ? (
          <div className="card empty-patients-card">
            <div className="empty-patients-icon-box">
              <Users size={36} color="var(--primary)" />
            </div>
            <h3>
              {scope === 'my'
                ? `Nenhum paciente vinculado ao perfil de ${activeDoctor?.name || 'seu usuário'}`
                : 'Nenhum paciente encontrado com os filtros atuais'}
            </h3>
            <p>
              {scope === 'my'
                ? 'Sua conta é nova e você ainda não possui pacientes vinculados ao seu Care Team ou com atendimentos agendados. Você pode cadastrar um paciente ou visualizar o cadastro geral da clínica.'
                : 'Tente alterar os termos de busca ou selecionar outro convênio.'}
            </p>
            <div className="empty-patients-actions">
              <button className="btn btn-primary" onClick={onOpenNewPatient}>
                <UserPlus size={16} /> Cadastrar Novo Paciente
              </button>
              {scope === 'my' && (
                <button className="btn btn-secondary" onClick={() => setScope('all')}>
                  Ver Todos da Clínica ({patients.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            return (
              <div key={patient.id} className="patient-card">
                <div className="patient-card-header">
                  <Avatar
                    src={patient.avatar}
                    name={patient.name}
                    size={48}
                    className="patient-card-avatar"
                  />
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
                        border: '1px solid var(--primary-border)',
                        color: 'var(--primary)',
                        background: 'var(--primary-subtle)',
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
