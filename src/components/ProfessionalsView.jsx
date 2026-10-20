// src/components/ProfessionalsView.jsx
import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Award,
  ShieldCheck,
  Calendar,
  Trash2,
  Share2,
  Copy,
  Check,
  Stethoscope,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import './ProfessionalsView.css';
import Avatar from './Avatar';

export default function ProfessionalsView({
  doctors = [],
  onOpenNewProfessional,
  onDeleteProfessional,
  onSelectDoctorForSchedule,
  onNavigateToPlanner
}) {
  const [search, setSearch] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filtra lista de profissionais
  const filteredDoctors = doctors
    .filter((doc) => doc.id !== 'all')
    .filter((doc) => {
      if (selectedProfession !== 'all') {
        const prof = (doc.profession || '').toLowerCase();
        if (selectedProfession === 'Fisioterapia' && !prof.includes('fisio')) return false;
        if (selectedProfession === 'Terapia Ocupacional' && !prof.includes('ocupacional')) return false;
        if (selectedProfession === 'Fonoaudiologia' && !prof.includes('fono')) return false;
        if (selectedProfession === 'Enfermagem' && !prof.includes('enferm')) return false;
      }
      const term = search.toLowerCase();
      return (
        doc.name.toLowerCase().includes(term) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(term)) ||
        (doc.email && doc.email.toLowerCase().includes(term)) ||
        (doc.councilNumber && doc.councilNumber.toLowerCase().includes(term)) ||
        (doc.crm && doc.crm.toLowerCase().includes(term)) ||
        (doc.phone && doc.phone.includes(term))
      );
    });

  // Métricas
  const totalCount = doctors.filter((d) => d.id !== 'all').length;
  const fisioCount = doctors.filter((d) => d.id !== 'all' && (d.profession?.toLowerCase().includes('fisio') || d.specialty?.toLowerCase().includes('fisio'))).length;
  const otherCount = totalCount - fisioCount;

  const handleCopyAccess = (doc) => {
    const text = `🏥 *OmniHome Care - Acesso Profissional*
Profissional: ${doc.name}
🌐 Aplicativo: https://omnihomecare.vercel.app
📧 Login: ${doc.email || 'Consulte seu cadastro na clínica'}
🔑 Senha Inicial: DoctorPassword123! (ou a gerada no credenciamento)`;

    navigator.clipboard.writeText(text);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="professionals-container">
      {/* Top Toolbar */}
      <div className="professionals-toolbar">
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Equipe Multidisciplinar & Profissionais</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total de <strong>{totalCount}</strong> profissionais credenciados com sincronização em tempo real no banco em nuvem.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ width: '280px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, conselho ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={onOpenNewProfessional}>
            <UserPlus size={16} /> Cadastrar Profissional
          </button>
        </div>
      </div>

      {/* Banner Informativo com Dica Rápida */}
      <div
        style={{
          background: 'var(--primary-subtle)',
          border: '1px solid var(--primary-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ShieldCheck size={22} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-headline)' }}>
            <strong>Perfil e Acesso Automático:</strong> Ao cadastrar um novo profissional na clínica, o sistema gera o login e a senha na hora para ele acessar as rotas no app.
          </span>
        </div>
        {onNavigateToPlanner && (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', fontWeight: 600 }}
            onClick={onNavigateToPlanner}
          >
            ⚙️ Gerar Escala Mensal da Equipe ➡️
          </button>
        )}
      </div>

      {/* Métricas do Corpo Clínico */}
      <div className="professionals-metrics">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="metric-value">{totalCount}</div>
            <div className="metric-label">Profissionais Ativos</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div className="metric-value">{fisioCount}</div>
            <div className="metric-label">Fisioterapeutas</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Award size={22} />
          </div>
          <div>
            <div className="metric-value">{otherCount}</div>
            <div className="metric-label">Outras Especialidades</div>
          </div>
        </div>
      </div>

      {/* Grade de Profissionais */}
      <div className="professionals-grid">
        {filteredDoctors.length === 0 ? (
          <div className="empty-professionals-card">
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum profissional encontrado</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
              Não encontramos nenhum profissional com os filtros aplicados. Cadastre uma nova fisioterapeuta ou especialista da equipe.
            </p>
            <button className="btn btn-primary" onClick={onOpenNewProfessional}>
              <UserPlus size={16} /> Cadastrar Novo Profissional
            </button>
          </div>
        ) : (
          filteredDoctors.map((doc) => {
            const rawSpecs = Array.isArray(doc.specialties) && doc.specialties.length > 0
              ? doc.specialties
              : (doc.specialty ? doc.specialty.split(',').map((s) => s.trim()) : ['Atendimento Domiciliar']);

            return (
              <div key={doc.id} className="professional-card">
                <div>
                  <div className="professional-card-header">
                    <Avatar
                      src={doc.avatar}
                      name={doc.name}
                      size={46}
                      color={doc.color || 'var(--primary)'}
                    />
                    <div className="professional-card-info">
                      <div className="professional-card-name" title={doc.name}>
                        {doc.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-scheduled" style={{ fontSize: '0.675rem', padding: '0.15rem 0.45rem' }}>
                          {doc.profession || 'Especialista'}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {doc.councilNumber || doc.crm || 'Reg. Ativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Especialidades */}
                  <div className="professional-card-tags">
                    {rawSpecs.slice(0, 3).map((spec, i) => (
                      <span key={i} className="specialty-pill">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Detalhes de Endereço & Login */}
                <div className="professional-card-details">
                  <div className="detail-row">
                    <MapPin size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span title={doc.baseAddress || 'Grande Vitória - ES'}>
                      {doc.baseAddress || 'Praia do Canto, Vitória - ES'}
                    </span>
                  </div>

                  <div className="detail-row">
                    <Mail size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span title={doc.email || 'Login gerado automaticamente'}>
                      {doc.email || 'Acesso gerado na nuvem'}
                    </span>
                  </div>

                  {doc.phone && (
                    <div className="detail-row">
                      <Phone size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span>{doc.phone}</span>
                    </div>
                  )}
                </div>

                {/* Ações do Card */}
                <div className="professional-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    onClick={() => handleCopyAccess(doc)}
                    title="Copiar dados de acesso para enviar pelo WhatsApp"
                  >
                    {copiedId === doc.id ? <Check size={14} color="var(--success)" /> : <Share2 size={14} />}
                    <span>{copiedId === doc.id ? 'Copiado!' : 'Acesso WhatsApp'}</span>
                  </button>

                  {onSelectDoctorForSchedule && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                      onClick={() => onSelectDoctorForSchedule(doc.id)}
                      title="Ver atendimentos e rota deste profissional"
                    >
                      <Calendar size={14} />
                    </button>
                  )}

                  {onDeleteProfessional && (
                    confirmDeleteId === doc.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ fontSize: '0.7rem', padding: '0.35rem 0.5rem' }}
                          onClick={() => {
                            onDeleteProfessional(doc.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.35rem 0.5rem' }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ color: 'var(--danger)', padding: '0.4rem' }}
                        onClick={() => setConfirmDeleteId(doc.id)}
                        title="Descredenciar / Remover profissional da equipe"
                      >
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
