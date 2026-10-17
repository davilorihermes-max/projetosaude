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

import { resolveAddressCoordinates } from '../services/geocodingService';

export const CLINICAL_SPECIALTY_OPTIONS = [
  'Fisioterapia Motora',
  'Fisioterapia Respiratória',
  'Terapia Ocupacional',
  'Fonoaudiologia'
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
  
  // Especialidades clínicas selecionadas (até 3)
  const [selectedSpecialties, setSelectedSpecialties] = useState(() => {
    if (Array.isArray(currentDoctor?.specialties) && currentDoctor.specialties.length > 0) {
      return currentDoctor.specialties.slice(0, 3);
    }
    if (currentDoctor?.specialty) {
      const parts = currentDoctor.specialty.split(',').map((s) => s.trim()).filter(Boolean);
      const matched = parts.filter((p) => CLINICAL_SPECIALTY_OPTIONS.includes(p));
      if (matched.length > 0) return matched.slice(0, 3);
    }
    return ['Fisioterapia Motora'];
  });

  const [councilNumber, setCouncilNumber] = useState(currentDoctor?.councilNumber || currentDoctor?.crm || '');
  const [profession, setProfession] = useState(currentDoctor?.profession || 'Fisioterapia');
  const [baseAddress, setBaseAddress] = useState(currentDoctor?.baseAddress || 'Praia do Canto, Vitória - ES');
  const [baseCoordinates, setBaseCoordinates] = useState(
    currentDoctor?.baseCoordinates || {
      latitude: currentDoctor?.latitude ?? -20.3012,
      longitude: currentDoctor?.longitude ?? -40.2925
    }
  );
  const [resolvedLocationName, setResolvedLocationName] = useState(currentDoctor?.baseAddress || 'Localização definida');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [color, setColor] = useState(currentDoctor?.color || '#0d9488');
  const [avatar, setAvatar] = useState(currentDoctor?.avatar || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!isOpen) return null;

  const handleToggleSpecialty = (spec) => {
    if (selectedSpecialties.includes(spec)) {
      if (selectedSpecialties.length === 1) return; // Manter pelo menos 1
      setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec));
    } else {
      if (selectedSpecialties.length >= 3) {
        return; // Máximo 3 especialidades
      }
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  };

  const handleGeocodeAddress = async (addrToSearch = baseAddress) => {
    if (!addrToSearch || addrToSearch.trim().length < 3) return;
    setIsGeocoding(true);
    try {
      const res = await resolveAddressCoordinates(addrToSearch);
      if (res && res.latitude && res.longitude) {
        setBaseCoordinates({ latitude: res.latitude, longitude: res.longitude });
        setResolvedLocationName(res.matched || res.city || 'Georreferenciado com sucesso');
      }
    } catch (err) {
      console.warn('Erro ao geocodificar:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleBaseAddressChange = (newAddr) => {
    setBaseAddress(newAddr);
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
              specialty: selectedSpecialties.join(', '),
              councilNumber,
              crm: councilNumber,
              latitude: baseCoordinates.latitude,
              longitude: baseCoordinates.longitude
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
        specialty: selectedSpecialties.join(', '),
        specialties: selectedSpecialties,
        councilNumber,
        crm: councilNumber,
        baseAddress,
        baseCoordinates,
        latitude: baseCoordinates.latitude,
        longitude: baseCoordinates.longitude,
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

  if (!isOpen) return null;

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

            {/* Seção 2: Conselho & Especialidade (Até 3 das 4 permitidas) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.75rem' }}>
                2. Habilitação & Especialidades Clínicas (Até 3)
              </span>
              
              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: '0.4rem', display: 'block' }}>
                  Especialidades Clínicas Restritas (Selecione de 1 até 3):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {CLINICAL_SPECIALTY_OPTIONS.map((spec) => {
                    const isSelected = selectedSpecialties.includes(spec);
                    return (
                      <label
                        key={spec}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--primary)' : 'var(--text-body)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSpecialty(spec)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{spec}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Registro no Conselho (Opcional - CREFITO / COREN / CRFa / CRN)</label>
                <input
                  type="text"
                  className="form-input"
                  value={councilNumber}
                  onChange={(e) => setCouncilNumber(e.target.value)}
                  placeholder="ex: CREFITO/SP 88.340 (opcional)"
                />
              </div>
            </div>

            {/* Seção 3: Base de Deslocamento Urbano com Mini-Mapa */}
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
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={baseAddress}
                    onChange={(e) => handleBaseAddressChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeAddress(baseAddress);
                      }
                    }}
                    placeholder="Endereço ou CEP de partida do profissional (ex: Rua Domingos de Morais, 1000 - SP)..."
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    onClick={() => handleGeocodeAddress(baseAddress)}
                    disabled={isGeocoding}
                  >
                    {isGeocoding ? 'Buscando...' : '🔍 Localizar no Mapa'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={11} /> {resolvedLocationName}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {baseCoordinates.latitude.toFixed(4)}, {baseCoordinates.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Mini-mapa OpenStreetMap com key reativa */}
              <div
                style={{
                  width: '100%',
                  height: '160px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  position: 'relative'
                }}
              >
                <iframe
                  key={`${baseCoordinates.latitude.toFixed(5)}-${baseCoordinates.longitude.toFixed(5)}`}
                  title="Mapa Ponto de Partida"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${baseCoordinates.longitude - 0.008}%2C${baseCoordinates.latitude - 0.006}%2C${baseCoordinates.longitude + 0.008}%2C${baseCoordinates.latitude + 0.006}&layer=mapnik&marker=${baseCoordinates.latitude}%2C${baseCoordinates.longitude}`}
                />
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
