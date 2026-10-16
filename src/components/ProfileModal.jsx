// src/components/ProfileModal.jsx
import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Award,
  MapPin,
  Mail,
  Palette,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
  Sparkles
} from 'lucide-react';
import AvatarUploader from './AvatarUploader';
import Avatar from './Avatar';
import { API_BASE_URL } from '../services/apiConfig';

const COLOR_PRESETS = [
  { name: 'Âmbar', hex: '#d97706' },
  { name: 'Roxo Real', hex: '#9333ea' },
  { name: 'Teal Esmeralda', hex: '#0d9488' },
  { name: 'Rosa Carmim', hex: '#e11d48' },
  { name: 'Azul Cobalto', hex: '#2563eb' },
  { name: 'Índigo', hex: '#4f46e5' },
  { name: 'Verde Floresta', hex: '#059669' }
];

const BASE_LOCATION_PRESETS = [
  { name: 'Vila Mariana (Zona Sul)', address: 'Rua Domingos de Morais, 800 - Vila Mariana, São Paulo - SP', lat: -23.585000, lng: -46.638000 },
  { name: 'Jardim Paulista (Centro-Sul)', address: 'Rua Pamplona, 700 - Jardim Paulista, São Paulo - SP', lat: -23.565000, lng: -46.657000 },
  { name: 'Cerqueira César / Paulista', address: 'Alameda Santos, 1200 - Cerqueira César, São Paulo - SP', lat: -23.563000, lng: -46.653000 },
  { name: 'Pinheiros (Zona Oeste)', address: 'Rua Fradique Coutinho, 800 - Pinheiros, São Paulo - SP', lat: -23.567000, lng: -46.691000 },
  { name: 'Consolação / Higienópolis', address: 'Rua Bela Cintra, 900 - Consolação, São Paulo - SP', lat: -23.555000, lng: -46.661000 },
  { name: 'Moema / Ibirapuera', address: 'Av. Moema, 450 - Moema, São Paulo - SP', lat: -23.602000, lng: -46.664000 },
  { name: 'Santana (Zona Norte)', address: 'Rua Voluntários da Pátria, 1500 - Santana, São Paulo - SP', lat: -23.504000, lng: -46.629000 },
  { name: 'Tatuapé (Zona Leste)', address: 'Rua Tuiuti, 1800 - Tatuapé, São Paulo - SP', lat: -23.539000, lng: -46.577000 }
];

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  currentDoctor,
  onUpdateProfile,
  onLogout
}) {
  const [name, setName] = useState(currentUser?.name || currentDoctor?.name || '');
  const [specialty, setSpecialty] = useState(currentDoctor?.specialty || 'Fisioterapia Cardiorrespiratória & Motora');
  const [councilNumber, setCouncilNumber] = useState(currentDoctor?.councilNumber || currentDoctor?.crm || 'CREFITO/SP 88.340');
  const [profession, setProfession] = useState(currentDoctor?.profession || 'Fisioterapia');
  const [baseAddress, setBaseAddress] = useState(currentDoctor?.baseAddress || 'São Paulo - SP');
  const [color, setColor] = useState(currentDoctor?.color || '#0d9488');
  const [avatar, setAvatar] = useState(currentDoctor?.avatar || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!isOpen) return null;

  const handleSelectLocationPreset = (preset) => {
    setBaseAddress(preset.address);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('omnihome_jwt');

      // Tenta persistir no backend via PUT /api/auth/profile se houver token ativo
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              name,
              specialty,
              councilNumber,
              crm: councilNumber
            })
          });

          if (!res.ok) {
            const data = await res.json();
            console.warn('Aviso ao sincronizar perfil no backend:', data.message);
          }
        } catch (backendErr) {
          console.warn('Backend offline ou inacessível para update, salvando localmente:', backendErr);
        }
      }

      // Atualiza o estado da aplicação
      const updatedDoctorData = {
        ...(currentDoctor || {}),
        name,
        profession,
        specialty,
        councilNumber,
        crm: councilNumber,
        baseAddress,
        color,
        avatar
      };

      const updatedUserData = {
        ...(currentUser || {}),
        name
      };

      if (onUpdateProfile) {
        onUpdateProfile(updatedDoctorData, updatedUserData);
      }

      setSuccessMsg('Perfil atualizado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao atualizar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '620px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <User size={22} />
            </div>
            <div>
              <h2 className="modal-title">Meu Perfil Profissional</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Dados cadastrais, registro no conselho e base de partida para escalas
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
            {/* Header com Avatar e Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                marginBottom: '1.25rem'
              }}
            >
              <Avatar
                src={avatar}
                name={name || 'Profissional'}
                size={68}
                color={color}
                style={{
                  border: `3px solid ${color}`,
                  boxShadow: 'var(--shadow-sm)'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-headline)' }}>{name || 'Profissional'}</strong>
                  <span
                    className="badge badge-scheduled"
                    style={{ fontSize: '0.75rem', background: 'var(--primary-subtle)', color: 'var(--primary)' }}
                  >
                    {currentUser?.role || 'PROFESSIONAL'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {currentUser?.email || ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-body)' }}>
                  <ShieldCheck size={14} color="var(--success)" />
                  <span>{councilNumber} • {profession}</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-subtle)',
                  borderColor: 'var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  background: 'var(--success-subtle)',
                  borderColor: 'var(--success-border)',
                  color: 'var(--success)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Seção 1: Identificação */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.75rem' }}>
                1. Informações Cadastrais
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Área de Atuação</label>
                  <select
                    className="form-input"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                  >
                    <option value="Fisioterapia">Fisioterapia</option>
                    <option value="Enfermagem">Enfermagem</option>
                    <option value="Fonoaudiologia">Fonoaudiologia</option>
                    <option value="Nutrição">Nutrição</option>
                    <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                    <option value="Psicologia">Psicologia</option>
                    <option value="Medicina">Medicina</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seção 2: Conselho & Especialidade */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.75rem' }}>
                2. Habilitação & Conselho de Classe
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Registro no Conselho (CREFITO / COREN / CRFa / CRN)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={councilNumber}
                    onChange={(e) => setCouncilNumber(e.target.value)}
                    placeholder="ex: CREFITO/SP 88.340"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Especialidade Clínica</label>
                  <input
                    type="text"
                    className="form-input"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="ex: Reabilitação Motora & Cardiorrespiratória"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Base de Deslocamento Urbano */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  3. Ponto Base de Partida (Roteirização Urbana)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Origem do cálculo de trânsito da primeira sessão
                </span>
              </div>
              <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  placeholder="Endereço de partida do profissional..."
                  required
                />
              </div>

              {/* Sugestões Rápidas de Polos em SP */}
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Polos rápidos da Região Metropolitana:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {BASE_LOCATION_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.25rem 0.5rem',
                        background: baseAddress.includes(p.name.split(' ')[0]) ? 'var(--primary-subtle)' : 'var(--bg-card)',
                        borderColor: baseAddress.includes(p.name.split(' ')[0]) ? 'var(--primary-light)' : 'var(--border-color)',
                        color: baseAddress.includes(p.name.split(' ')[0]) ? 'var(--primary)' : 'var(--text-body)'
                      }}
                      onClick={() => handleSelectLocationPreset(p)}
                    >
                      <MapPin size={11} style={{ marginRight: '3px' }} />
                      {p.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Seção 4: Cor na Agenda e Foto do Perfil */}
            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                4. Cor na Grade de Escala & Foto do Perfil
              </span>

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Cor de Destaque na Agenda</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: c.hex,
                        border: color === c.hex ? '3px solid var(--text-headline)' : '2px solid transparent',
                        cursor: 'pointer',
                        outline: 'none',
                        transform: color === c.hex ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease'
                      }}
                      title={c.name}
                      onClick={() => setColor(c.hex)}
                    />
                  ))}
                </div>
              </div>

              <AvatarUploader
                avatar={avatar}
                onChangeAvatar={setAvatar}
                name={name}
                color={color}
                borderColor={color}
              />
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-light)'
            }}
          >
            {onLogout ? (
              confirmLogout ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--danger-subtle)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--danger-border)'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                    Encerrar sessão?
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => {
                      onLogout();
                      onClose();
                    }}
                  >
                    Sim, Sair
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                    onClick={() => setConfirmLogout(false)}
                  >
                    Voltar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                  onClick={() => setConfirmLogout(true)}
                >
                  <LogOut size={15} style={{ marginRight: '4px' }} /> Encerrar Sessão
                </button>
              )
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={15} style={{ marginRight: '4px' }} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
