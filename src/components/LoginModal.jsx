// src/components/LoginModal.jsx
import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  User,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
  UserPlus,
  MapPin,
  Award,
  Palette,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import AvatarUploader from './AvatarUploader';
import {
  isValidCPF,
  validateCouncilForProfession,
  CORPORATE_EMAIL_REGEX,
  PROFESSION_COUNCIL_MAP
} from '../lib/validators';
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

export const CLINICAL_SPECIALTY_OPTIONS = [
  'Fisioterapia Motora',
  'Fisioterapia Respiratória',
  'Terapia Ocupacional',
  'Fonoaudiologia'
];

import { resolveAddressCoordinates } from '../services/geocodingService';

export default function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onRegisterSuccess,
  onLogout,
  initialTab = 'login'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register / Profile Creation States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [regProfession, setRegProfession] = useState('Fisioterapia');
  const [regCouncilNumber, setRegCouncilNumber] = useState('');
  const [regSpecialties, setRegSpecialties] = useState(['Fisioterapia Motora']);
  const [regBaseAddress, setRegBaseAddress] = useState('Praia do Canto, Vitória - ES');
  const [regCoordinates, setRegCoordinates] = useState({ latitude: -20.301200, longitude: -40.292500 });
  const [regColor, setRegColor] = useState('#0d9488');
  const [regAvatar, setRegAvatar] = useState(null);
  const [resolvedLocationName, setResolvedLocationName] = useState('Praia do Canto, Vitória - ES');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  const triggerBaseGeocode = async (val) => {
    if (!val || val.trim().length < 3) return;
    setIsGeocoding(true);
    try {
      const res = await resolveAddressCoordinates(val);
      if (res && res.latitude && res.longitude) {
        setRegCoordinates({ latitude: res.latitude, longitude: res.longitude });
        setResolvedLocationName(res.matched || res.city || res.formattedAddress || 'Localização identificada');
      }
    } catch {
    } finally {
      setIsGeocoding(false);
    }
  };

  // Debounce automático para o endereço base (sempre antes do early return para respeitar Rules of Hooks)
  useEffect(() => {
    if (!isOpen || !regBaseAddress || regBaseAddress.trim().length < 4) return;
    const timer = setTimeout(() => {
      triggerBaseGeocode(regBaseAddress);
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen, regBaseAddress]);

  if (!isOpen) return null;

  // Formatters
  const handleCpfChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
    else if (raw.length > 6) formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    else if (raw.length > 3) formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    setRegCpf(formatted);
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    else if (raw.length > 6) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    else if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    else if (raw.length > 0) formatted = `(${raw}`;
    setRegPhone(formatted);
  };

  const getCouncilPlaceholder = (prof) => {
    switch (prof) {
      case 'Fisioterapia': return 'ex: CREFITO-3/SP 88.340-F';
      case 'Enfermagem': return 'ex: COREN-SP 230.110-ENF';
      case 'Fonoaudiologia': return 'ex: CRFa-SP 14.520';
      case 'Nutrição': return 'ex: CRN-3/SP 45.190';
      case 'Terapia Ocupacional': return 'ex: CREFITO-3/SP 12.340-TO';
      case 'Psicologia': return 'ex: CRP-06/SP 98.760';
      case 'Medicina': return 'ex: CRM-SP 123.456';
      default: return 'ex: Órgão/UF 00.000';
    }
  };

  const handleToggleSpecialty = (spec) => {
    if (regSpecialties.includes(spec)) {
      if (regSpecialties.length > 1) {
        setRegSpecialties(regSpecialties.filter((s) => s !== spec));
      }
    } else {
      if (regSpecialties.length < 3) {
        setRegSpecialties([...regSpecialties, spec]);
      }
    }
  };

  const handleProfessionChange = (prof) => {
    setRegProfession(prof);
  };

  const handleExecuteLogin = async (overrideId, overridePass) => {
    const idToUse = overrideId !== undefined ? overrideId : identifier;
    const passToUse = overridePass !== undefined ? overridePass : password;

    if (!idToUse || !passToUse) {
      setErrorMsg('Informe seu e-mail corporativo e senha para entrar.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: idToUse.trim().toLowerCase(), password: passToUse })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }

      const loggedUser = data.user;
      const token = data.token;

      setSuccessMsg(`Autenticado com sucesso como ${loggedUser.name} (${loggedUser.role})!`);
      localStorage.setItem('omnihome_jwt', token);
      localStorage.setItem('omnihome_user_v3', JSON.stringify(loggedUser));
      localStorage.setItem('omnihome_user', JSON.stringify(loggedUser));

      if (onLoginSuccess) {
        onLoginSuccess(loggedUser, token);
      }

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao autenticar no servidor em nuvem.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const nameTrimmed = regName.trim();
    if (!nameTrimmed || nameTrimmed.length < 2) {
      setErrorMsg('Informe o nome do profissional.');
      return;
    }

    if (!regEmail || !regEmail.includes('@')) {
      setErrorMsg('Informe um e-mail válido para o profissional.');
      return;
    }

    const passwordToUse = regPassword.trim() || '123456';
    const specialtyStr = regSpecialties.join(', ') || 'Fisioterapia Motora';
    const councilToUse = regCouncilNumber.trim() || 'Registro Ativo';
    const cpfToUse = regCpf.trim() || undefined;
    const phoneToUse = regPhone.trim() || undefined;
    const addressToUse = regBaseAddress.trim() || 'Praia do Canto, Vitória - ES';

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrimmed,
          email: regEmail.trim().toLowerCase(),
          password: passwordToUse,
          role: 'PROFESSIONAL',
          profession: regProfession,
          specialty: specialtyStr,
          specialties: regSpecialties,
          councilNumber: regCouncilNumber.trim() || undefined,
          crm: councilToUse,
          cpf: cpfToUse,
          phone: phoneToUse,
          latitude: regCoordinates.latitude,
          longitude: regCoordinates.longitude,
          linkToCareTeams: true
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao cadastrar perfil profissional no banco em nuvem.');
      }

      const createdUser = data.user;
      const token = data.token;
      localStorage.setItem('omnihome_jwt', token);
      localStorage.setItem('omnihome_user_v3', JSON.stringify(createdUser));
      localStorage.setItem('omnihome_user', JSON.stringify(createdUser));

      // Constrói objeto do profissional formatado para a UI e Care Team a partir do registro em nuvem
      const newProfessional = {
        id: createdUser?.professional?.id || createdUser?.professionalId,
        userId: createdUser?.id,
        name: createdUser?.name || nameTrimmed,
        email: createdUser?.email || regEmail.trim().toLowerCase(),
        profession: regProfession,
        specialty: createdUser?.professional?.specialty || specialtyStr,
        specialties: regSpecialties,
        councilNumber: createdUser?.professional?.crm || councilToUse,
        crm: createdUser?.professional?.crm || councilToUse,
        cpf: cpfToUse || '',
        phone: phoneToUse || '',
        avatar: regAvatar,
        color: regColor,
        baseAddress: addressToUse,
        baseCoordinates: {
          latitude: createdUser?.professional?.latitude ?? regCoordinates.latitude,
          longitude: createdUser?.professional?.longitude ?? regCoordinates.longitude
        }
      };

      setSuccessMsg(`Perfil de ${nameTrimmed} credenciado com sucesso no banco em nuvem!`);

      if (onRegisterSuccess) {
        onRegisterSuccess(newProfessional, createdUser, token);
      } else if (onLoginSuccess) {
        onLoginSuccess(createdUser, token);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao registrar novo perfil profissional no servidor em nuvem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {activeTab === 'login' ? <KeyRound size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                {activeTab === 'login' ? 'Autenticação de Usuário' : 'Credenciamento & Perfil Profissional'}
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {activeTab === 'login'
                  ? 'Acesso seguro à plataforma de atendimento'
                  : 'Requisitos estritos de segurança, conselho de classe e auditoria clínica'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 1.5rem', background: 'var(--bg-card)' }}>
          <button
            type="button"
            className="login-tab-login"
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'login' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'login' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'login' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            <KeyRound size={16} /> Entrar na Conta
          </button>
          <button
            type="button"
            className="login-tab-register"
            style={{
              flex: 1,
              padding: '0.85rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'register' ? '3px solid var(--primary)' : '3px solid transparent',
              color: activeTab === 'register' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'register' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            <UserPlus size={16} /> Cadastrar Perfil Profissional
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                background: 'var(--danger-subtle)',
                borderColor: 'var(--danger-border)',
                color: 'var(--danger)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
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
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid'
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' ? (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteLogin();
                }}
              >
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={14} /> E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu.email@empresa.com.br"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Lock size={14} /> Senha de Acesso
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                  disabled={loading}
                >
                  {loading ? 'Autenticando...' : 'Entrar na Plataforma'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Ainda não possui perfil cadastrado?{' '}
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.82rem',
                      textDecoration: 'underline'
                    }}
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMsg('');
                    }}
                  >
                    Cadastre-se aqui
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* TAB 2: CRIAR PERFIL PROFISSIONAL COM REQUISITOS ESTRITOS */
            <form onSubmit={handleExecuteRegister}>
              {/* Seção 1: Identificação do Profissional */}
              <div style={{ marginBottom: '1.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <User size={14} /> 1. Identificação do Profissional
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nome do profissional (ex: Dr. Lucas Mendes)"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">E-mail *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="email@exemplo.com.br"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">CPF (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="000.000.000-00"
                      value={regCpf}
                      onChange={handleCpfChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefone / WhatsApp (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(11) 98765-4321"
                      value={regPhone}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Especialidade Clínica & Conselho */}
              <div style={{ marginBottom: '1.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Award size={14} /> 2. Especialidades Clínicas (Até 3 para a Escala)
                </span>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>
                    Selecione as especialidades de atuação (até 3):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {CLINICAL_SPECIALTY_OPTIONS.map((spec) => {
                      const isSelected = regSpecialties.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => handleToggleSpecialty(spec)}
                          style={{
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-body)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <span>{spec}</span>
                          {isSelected && <Check size={14} color="var(--primary)" />}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Selecionadas: <strong>{regSpecialties.join(', ')}</strong> ({regSpecialties.length}/3)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Profissão (Opcional)</label>
                    <select
                      className="form-input"
                      value={regProfession}
                      onChange={(e) => handleProfessionChange(e.target.value)}
                    >
                      <option value="Fisioterapia">Fisioterapia</option>
                      <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                      <option value="Fonoaudiologia">Fonoaudiologia</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Registro no Conselho (Opcional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ex: CREFITO/CRFa (opcional)"
                      value={regCouncilNumber}
                      onChange={(e) => setRegCouncilNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Senha de Acesso (Qualquer Senha Serve) */}
              <div style={{ marginBottom: '1.3rem', background: 'var(--bg-card)', padding: '0.9rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <Lock size={14} /> 3. Senha de Acesso
                </span>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Senha (qualquer senha serve):</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Digite qualquer senha (ex: 123456)"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Não é preciso senha forte. Se não preencher, será usada a senha padrão 123456.
                  </span>
                </div>
              </div>

              {/* Seção 4: Ponto Base de Partida (Geolocalização & Mapa) */}
              <div style={{ marginBottom: '1.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} /> 4. Ponto Base de Partida
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Origem de saída para o cálculo de trânsito
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={regBaseAddress}
                      onChange={(e) => setRegBaseAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          triggerBaseGeocode(regBaseAddress);
                        }
                      }}
                      placeholder="Endereço, bairro, cidade ou CEP de saída..."
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                      onClick={() => triggerBaseGeocode(regBaseAddress)}
                      disabled={isGeocoding || !regBaseAddress}
                    >
                      <MapPin size={14} color="var(--primary)" />
                      {isGeocoding ? 'Localizando...' : 'Localizar no Mapa'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={11} /> {resolvedLocationName}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Lat: {regCoordinates.latitude.toFixed(4)}, Lon: {regCoordinates.longitude.toFixed(4)}
                    </span>
                  </div>

                  {/* PEQUENO MAPA ABAIXO DO ENDEREÇO DA BASE */}
                  <div style={{
                    marginTop: '0.65rem',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{
                      padding: '0.35rem 0.65rem',
                      background: 'var(--bg-surface-hover)',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)'
                    }}>
                      <span>🗺️ Localização da Base de Partida</span>
                      <span>OpenStreetMap</span>
                    </div>
                    <iframe
                      key={`${regCoordinates.latitude.toFixed(5)}-${regCoordinates.longitude.toFixed(5)}`}
                      title="Ponto Base de Partida do Profissional"
                      width="100%"
                      height="150"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${regCoordinates.longitude - 0.008}%2C${regCoordinates.latitude - 0.006}%2C${regCoordinates.longitude + 0.008}%2C${regCoordinates.latitude + 0.006}&layer=mapnik&marker=${regCoordinates.latitude}%2C${regCoordinates.longitude}`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 5: Cor na Agenda & Foto do Perfil */}
              <div style={{ marginBottom: '1.3rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Palette size={14} /> 5. Cor na Agenda & Foto do Perfil
                </span>

                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem' }}>Cor de Identificação na Agenda</label>
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
                          border: regColor === c.hex ? '3px solid var(--text-headline)' : '2px solid transparent',
                          cursor: 'pointer',
                          outline: 'none',
                          transform: regColor === c.hex ? 'scale(1.15)' : 'scale(1)',
                          transition: 'all 0.15s ease'
                        }}
                        title={c.name}
                        onClick={() => setRegColor(c.hex)}
                      />
                    ))}
                  </div>
                </div>

                <AvatarUploader
                  avatar={regAvatar}
                  onChangeAvatar={setRegAvatar}
                  name={regName}
                  color={regColor}
                  borderColor={regColor}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}
                disabled={loading}
              >
                <UserPlus size={16} style={{ marginRight: '6px' }} />
                {loading ? 'Cadastrando Perfil Profissional...' : 'Cadastrar e Ativar Perfil no Care Team'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
