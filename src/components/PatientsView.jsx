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
  UserCheck,
  Stethoscope,
  Edit,
  MapPin,
  Trash2
} from 'lucide-react';
import './PatientsView.css';
import Avatar from './Avatar';

export default function PatientsView({
  patients = [],
  appointments = [],
  activeDoctor,
  doctors = [],
  onOpenNewPatient,
  onEditPatient,
  onOpenNewAppointment,
  onNavigateToPlanner,
  onDeletePatient
}) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState(activeDoctor && activeDoctor.id !== 'all' ? 'my' : 'all');

  // IDs de pacientes vinculados aos atendimentos ou Care Team do profissional ativo
  const myPatientIds = new Set([
    ...appointments
      .filter((a) => !activeDoctor || activeDoctor.id === 'all' || a.doctorId === activeDoctor.id)
      .map((a) => a.patientId),
    ...patients
      .filter(
        (p) =>
          !activeDoctor ||
          activeDoctor.id === 'all' ||
          (Array.isArray(p.careTeamProfessionalIds) &&
            p.careTeamProfessionalIds.includes(activeDoctor.id)) ||
          (Array.isArray(p.careTeamMembers) &&
            p.careTeamMembers.some((ct) => (ct.professionalId || ct) === activeDoctor.id))
      )
      .map((p) => p.id)
  ]);

  const scopedPatients = scope === 'my' && activeDoctor && activeDoctor.id !== 'all'
    ? patients.filter((p) => myPatientIds.has(p.id))
    : patients;

  const filteredPatients = scopedPatients.filter((patient) => {
    const term = search.toLowerCase();
    return (
      patient.name.toLowerCase().includes(term) ||
      (patient.cpf && patient.cpf.includes(term)) ||
      (patient.phone && patient.phone.includes(term)) ||
      (patient.address && patient.address.toLowerCase().includes(term))
    );
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
              placeholder="Buscar por nome, endereço ou fone..."
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
            <strong>Demandas Terapêuticas & Care Team:</strong> Cada paciente possui suas terapias cadastradas no perfil e uma equipe autorizada para atendimento domiciliar.
          </span>
        </div>
        {onNavigateToPlanner && (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 600 }}
            onClick={onNavigateToPlanner}
          >
            ⚙️ Abrir Planejador Mensal de Escalas ➡️
          </button>
        )}
      </div>

      {/* Scope Filter Bar */}
      {activeDoctor && activeDoctor.id !== 'all' && (
        <div className="patients-filters-bar" style={{ marginBottom: '1rem' }}>
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
        </div>
      )}

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
                ? 'Sua conta ainda não possui pacientes vinculados ao seu Care Team. Você pode cadastrar um paciente ou visualizar o cadastro geral da clínica.'
                : 'Tente alterar os termos de busca.'}
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
            // Nomes dos profissionais do Care Team deste paciente
            const careTeamDocIds = patient.careTeamProfessionalIds ||
              patient.careTeamMembers?.map((m) => m.professionalId || m) || [];
            const careTeamDocNames = doctors
              .filter((d) => careTeamDocIds.includes(d.id))
              .map((d) => d.name);

            return (
              <div key={patient.id} className="patient-card">
                <div className="patient-card-header" style={{ position: 'relative' }}>
                  <Avatar
                    src={patient.avatar}
                    name={patient.name}
                    size={48}
                    className="patient-card-avatar"
                  />
                  <div className="patient-card-info" style={{ flex: 1 }}>
                    <h4>{patient.name}</h4>
                    <p>
                      {patient.age} anos • {patient.gender}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {patient.phone || 'Sem telefone informado'}
                    </span>
                  </div>
                  {onDeletePatient && (
                    <button
                      type="button"
                      className="btn-icon"
                      title="Excluir paciente"
                      style={{ color: 'var(--danger, #ef4444)', padding: '0.35rem' }}
                      onClick={() => onDeletePatient(patient.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="patient-card-body">
                  <div className="patient-metric-row">
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <MapPin size={13} /> Domicílio:
                    </span>
                    <strong style={{ fontSize: '0.8rem', textAlign: 'right', maxWidth: '65%' }}>
                      {patient.address || 'Vitória - ES'}
                    </strong>
                  </div>

                  {patient.caregiver && (
                    <div className="patient-metric-row">
                      <span style={{ color: 'var(--text-muted)' }}>Cuidador(a):</span>
                      <span style={{ fontSize: '0.78rem' }}>{patient.caregiver}</span>
                    </div>
                  )}

                  {/* Demandas Terapêuticas Cadastradas */}
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      🩺 Demandas Terapêuticas ({patient.demands?.length || 0}):
                    </span>
                    {patient.demands && patient.demands.length > 0 ? (
                      patient.demands.map((d, i) => (
                        <div
                          key={d.id || i}
                          style={{
                            fontSize: '0.74rem',
                            background: 'var(--primary-subtle)',
                            color: 'var(--primary)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                            {d.therapyType}
                          </span>
                          <span>{d.sessionsPerWeek}x/sem</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Nenhuma terapia cadastrada
                      </span>
                    )}
                  </div>

                  {/* Equipe do Care Team */}
                  {careTeamDocNames.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.4rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>🛡️ Care Team: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-headline)' }}>
                        {careTeamDocNames.join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="patient-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {onEditPatient && (
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
                      onClick={() => onEditPatient(patient)}
                    >
                      <Edit size={14} /> Editar Cadastro & Demandas
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
