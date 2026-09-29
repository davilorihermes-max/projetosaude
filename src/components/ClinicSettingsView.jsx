// src/components/ClinicSettingsView.jsx
import React, { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Shield, RefreshCw, CheckCircle, Stethoscope, BellRing } from 'lucide-react';
import { CLINIC_INFO } from '../data/mockData';

export default function ClinicSettingsView({
  doctors = [],
  onResetData
}) {
  const [clinicData, setClinicData] = useState(CLINIC_INFO);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [autoSms, setAutoSms] = useState(true);
  const [autoWhatsapp, setAutoWhatsapp] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Configurações da Clínica</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Dados cadastrais da unidade, corpo clínico e regras de comunicação com os pacientes.
        </p>
      </div>

      {savedSuccess && (
        <div style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          <strong>Configurações da clínica atualizadas com sucesso!</strong>
        </div>
      )}

      {/* Clinic Form */}
      <form onSubmit={handleSave} className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} color="var(--primary)" /> Dados Cadastrais e Legais
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Razão Social / Nome da Clínica</label>
            <input
              type="text"
              className="form-input"
              value={clinicData.name}
              onChange={(e) => setClinicData({ ...clinicData, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">CNES (Cadastro Nacional de Saúde)</label>
            <input
              type="text"
              className="form-input"
              value={clinicData.cnes}
              onChange={(e) => setClinicData({ ...clinicData, cnes: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">CNPJ</label>
            <input
              type="text"
              className="form-input"
              value={clinicData.cnpj}
              onChange={(e) => setClinicData({ ...clinicData, cnpj: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone Fixo</label>
            <input
              type="text"
              className="form-input"
              value={clinicData.phone}
              onChange={(e) => setClinicData({ ...clinicData, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp Corporativo</label>
            <input
              type="text"
              className="form-input"
              value={clinicData.whatsapp}
              onChange={(e) => setClinicData({ ...clinicData, whatsapp: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Endereço Completo</label>
          <input
            type="text"
            className="form-input"
            value={clinicData.address}
            onChange={(e) => setClinicData({ ...clinicData, address: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary">
            Salvar Alterações
          </button>
        </div>
      </form>

      {/* Notifications & Reminders Automations */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BellRing size={18} color="var(--primary)" /> Lembretes Automáticos aos Pacientes
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoWhatsapp}
              onChange={(e) => setAutoWhatsapp(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-headline)' }}>
                Confirmação de Agendamento por WhatsApp (24h antes)
              </strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Envia mensagem interativa permitindo o paciente confirmar ou remarcar com 1 toque.
              </p>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoSms}
              onChange={(e) => setAutoSms(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
            />
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-headline)' }}>
                Lembrete de Sessão & Retorno Clínico
              </strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Notifica o paciente e familiares próximo à data indicada para nova visita domiciliar.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Registered Multidisciplinary Staff */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope size={18} color="var(--primary)" /> Equipe Multidisciplinar Credenciada (Care Team)
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Médicos, Fisioterapeutas, Enfermeiros, Fonoaudiólogos e Nutricionistas
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {doctors.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)',
                transition: 'all 0.15s ease'
              }}
            >
              <img
                src={doc.avatar}
                alt={doc.name}
                style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: '0.875rem', color: 'var(--text-headline)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {doc.name}
                </strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                  <span className="badge badge-scheduled" style={{ fontSize: '0.675rem', padding: '0.1rem 0.4rem' }}>
                    {doc.profession || 'Especialista'}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {doc.councilNumber || doc.crm}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Data for Testing */}
      <div className="card" style={{ border: '1px dashed var(--danger-border)', background: 'var(--danger-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>Restaurar Dados de Exemplo</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Reinicia todos os agendamentos, pacientes e prontuários para os valores de demonstração padrão.
            </p>
          </div>
          <button className="btn btn-danger" onClick={onResetData}>
            <RefreshCw size={15} /> Restaurar Padrões
          </button>
        </div>
      </div>
    </div>
  );
}
