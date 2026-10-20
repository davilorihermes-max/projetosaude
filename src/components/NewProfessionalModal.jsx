// src/components/NewProfessionalModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  Shuffle,
  MapPin,
  Award,
  ShieldCheck,
  Eye,
  EyeOff,
  Share2,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { API_BASE_URL } from '../services/apiConfig';
import { resolveAddressCoordinates } from '../services/geocodingService';

export const CLINICAL_SPECIALTIES = [
  'Fisioterapia Motora',
  'Fisioterapia Respiratória',
  'Terapia Ocupacional',
  'Fonoaudiologia'
];

export const PROFESSIONS = [
  'Fisioterapia',
  'Terapia Ocupacional',
  'Fonoaudiologia',
  'Enfermagem',
  'Nutrição',
  'Medicina',
  'Psicologia'
];

function generateEmailFromName(name) {
  if (!name || !name.trim()) return 'profissional@omnihome.med.br';
  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr|dra|enf|ft|fono|nutri|prof)\.?\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const first = parts[0] || 'profissional';
  const last = parts.length > 1 ? parts[parts.length - 1] : 'saude';
  return `${first}.${last}@omnihome.med.br`;
}

function generatePasswordFromName(name) {
  const clean = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr|dra|enf|ft|fono|nutri|prof)\.?\s+/i, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const word = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() : 'Omni';
  const num = Math.floor(100 + Math.random() * 900);
  return `Omni@${word}${num}`;
}

export default function NewProfessionalModal({
  isOpen,
  onClose,
  onSaveProfessional
}) {
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('Fisioterapia');
  const [specialties, setSpecialties] = useState(['Fisioterapia Motora']);
  const [councilNumber, setCouncilNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [baseAddress, setBaseAddress] = useState('Praia do Canto, Vitória - ES');
  const [baseCoordinates, setBaseCoordinates] = useState({ latitude: -20.3012, longitude: -40.2925 });
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Geração Automática de Perfil / Login / Senha
  const [autoGenerateCredentials, setAutoGenerateCredentials] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Estado de envio e resultado de credenciais
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setName('');
      setProfession('Fisioterapia');
      setSpecialties(['Fisioterapia Motora']);
      setCouncilNumber('');
      setPhone('');
      setBaseAddress('Praia do Canto, Vitória - ES');
      setBaseCoordinates({ latitude: -20.3012, longitude: -40.2925 });
      setAutoGenerateCredentials(true);
      setEmail('');
      setPassword('');
      setErrorMsg('');
      setCreatedCredentials(null);
      setCopiedLogin(false);
      setCopiedPassword(false);
      setCopiedWhatsapp(false);
    }
  }, [isOpen]);

  // Atualiza automaticamente o login e a senha sugerida ao alterar o nome
  useEffect(() => {
    if (autoGenerateCredentials) {
      if (name.trim()) {
        setEmail(generateEmailFromName(name));
        if (!password) {
          setPassword(generatePasswordFromName(name));
        }
      } else {
        setEmail('');
        setPassword('');
      }
    }
  }, [name, autoGenerateCredentials]);

  // Geocodificação automática do endereço
  const triggerGeocode = async (addr) => {
    if (!addr || addr.trim().length < 3) return;
    setIsGeocoding(true);
    try {
      const res = await resolveAddressCoordinates(addr);
      if (res && res.latitude && res.longitude) {
        setBaseCoordinates({ latitude: res.latitude, longitude: res.longitude });
      }
    } catch {} finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !baseAddress || baseAddress.trim().length < 4) return;
    const timer = setTimeout(() => {
      triggerGeocode(baseAddress);
    }, 600);
    return () => clearTimeout(timer);
  }, [isOpen, baseAddress]);

  if (!isOpen) return null;

  const handleToggleSpecialty = (spec) => {
    if (specialties.includes(spec)) {
      if (specialties.length > 1) {
        setSpecialties(specialties.filter((s) => s !== spec));
      }
    } else {
      if (specialties.length < 3) {
        setSpecialties([...specialties, spec]);
      }
    }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 10) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
    else if (raw.length > 6) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    else if (raw.length > 2) formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    else if (raw.length > 0) formatted = `(${raw}`;
    setPhone(formatted);
  };

  const handleGenerateNewPassword = () => {
    const newPass = generatePasswordFromName(name || 'Doc');
    setPassword(newPass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg('Informe o nome do profissional.');
      return;
    }

    const effectiveEmail = (autoGenerateCredentials ? (email || generateEmailFromName(trimmedName)) : email).trim().toLowerCase();
    const effectivePass = (autoGenerateCredentials ? (password || generatePasswordFromName(trimmedName)) : password).trim();

    if (!effectiveEmail || !effectiveEmail.includes('@')) {
      setErrorMsg('Informe um e-mail válido para o profissional.');
      return;
    }

    if (!effectivePass || effectivePass.length < 6) {
      setErrorMsg('A senha do profissional deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      // ALWAYS CLOUD BACKEND!
      const res = await fetch(`${API_BASE_URL}/api/scheduler/professionals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: effectiveEmail,
          password: effectivePass,
          profession,
          specialty: specialties.join(', ') || 'Fisioterapia Motora',
          councilNumber: councilNumber.trim() || undefined,
          latitude: baseCoordinates.latitude,
          longitude: baseCoordinates.longitude
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao cadastrar profissional no servidor em nuvem.');
      }

      const returnedDoc = data.professional;
      const returnedCreds = data.generatedCredentials || {
        login: effectiveEmail,
        password: effectivePass,
        wasGenerated: autoGenerateCredentials
      };

      // Dispara confetes de comemoração
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}

      const formattedDoctor = {
        id: returnedDoc.id,
        userId: returnedDoc.userId,
        name: returnedDoc.name,
        email: returnedDoc.email,
        profession,
        specialty: returnedDoc.specialty,
        specialties,
        councilNumber: returnedDoc.crm,
        crm: returnedDoc.crm,
        phone,
        color: '#0d9488',
        baseAddress,
        baseCoordinates: {
          latitude: returnedDoc.latitude ?? baseCoordinates.latitude,
          longitude: returnedDoc.longitude ?? baseCoordinates.longitude
        }
      };

      if (onSaveProfessional) {
        onSaveProfessional(formattedDoctor, returnedCreds);
      }

      setCreatedCredentials({
        name: trimmedName,
        profession,
        login: returnedCreds.login,
        password: returnedCreds.password,
        specialty: specialties.join(', ')
      });
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar novo profissional no banco de dados em nuvem.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWhatsappText = () => {
    if (!createdCredentials) return;
    const text = `🏥 *OmniHome Care - Credenciais de Acesso Profissional*
Olá ${createdCredentials.name}! Seu cadastro foi realizado com sucesso na clínica.

Você já pode acessar o sistema para consultar sua rota de atendimentos e pacientes:
🌐 *Link de Acesso:* https://omnihomecare.vercel.app
📧 *Login:* ${createdCredentials.login}
🔑 *Senha:* ${createdCredentials.password}

Guarde estas informações para entrar no sistema. Bom trabalho!`;

    navigator.clipboard.writeText(text);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px', width: '94%', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-headline)' }}>
              <UserPlus size={22} color="var(--primary)" />
              {createdCredentials ? 'Acesso Criado com Sucesso!' : 'Cadastrar Profissional de Saúde'}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {createdCredentials
                ? 'Copie os dados de acesso gerados para enviar à profissional pelo WhatsApp ou e-mail.'
                : 'Se o profissional não tiver perfil, o OmniHome Care gera login e senha automaticamente!'}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* TELA DE SUCESSO & ENTREGA DE CREDENCIAIS */}
        {createdCredentials ? (
          <div style={{ padding: '1.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                background: 'var(--success-subtle)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem'
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--text-headline)', fontWeight: 800 }}>
                Profissional Cadastrado(a) na Nuvem!
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                O perfil de <strong>{createdCredentials.name}</strong> já está ativo no banco de dados e apto a receber escalas.
              </p>
            </div>

            {/* Cartão de Credenciais de Acesso */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--primary-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '1rem'
                }}
              >
                <KeyRound size={15} /> Credenciais de Acesso ao Sistema
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Login */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Login / E-mail:</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-headline)', wordBreak: 'break-all' }}>
                      {createdCredentials.login}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.login);
                      setCopiedLogin(true);
                      setTimeout(() => setCopiedLogin(false), 2000);
                    }}
                  >
                    {copiedLogin ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copiedLogin ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Senha */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-page)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Senha de Entrada:</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--primary)', letterSpacing: '0.03em' }}>
                      {createdCredentials.password}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', flexShrink: 0 }}
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password);
                      setCopiedPassword(true);
                      setTimeout(() => setCopiedPassword(false), 2000);
                    }}
                  >
                    {copiedPassword ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copiedPassword ? 'Copiada!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Botão Copiar para WhatsApp */}
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '1.15rem',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: '#059669',
                  borderColor: '#059669'
                }}
                onClick={handleCopyWhatsappText}
              >
                {copiedWhatsapp ? <Check size={18} /> : <Share2 size={18} />}
                <span>{copiedWhatsapp ? 'Texto Copiado para WhatsApp!' : 'Copiar Dados de Acesso (WhatsApp)'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Fechar e Concluir
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE CADASTRO */
          <form onSubmit={handleSubmit} style={{ padding: '0.5rem 0' }}>
            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-subtle)',
                  borderColor: 'var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
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

            {/* 1. Identificação Básica */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.65rem'
                }}
              >
                1. Identificação Profissional
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ex: Dra. Mariana Ramos"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Profissão *</label>
                  <select
                    className="form-input"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                  >
                    {PROFESSIONS.map((prof) => (
                      <option key={prof} value={prof}>
                        {prof}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Registro no Conselho (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ex: CREFITO, COREN ou apenas o número"
                    value={councilNumber}
                    onChange={(e) => setCouncilNumber(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">WhatsApp / Telefone (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="(27) 99888-7766"
                    value={phone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. Especialidades Clínicas */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.5rem'
                }}
              >
                <Award size={14} /> 2. Especialidades de Atendimento (Care Team)
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                {CLINICAL_SPECIALTIES.map((spec) => {
                  const isSelected = specialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => handleToggleSpecialty(spec)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                        background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-body)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{spec}</span>
                      {isSelected && <Check size={14} color="var(--primary)" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Ponto Base de Partida (Geolocalização) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--primary)',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <MapPin size={14} /> 3. Ponto Base de Partida (Para Cálculo de Rotas)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {isGeocoding ? 'Localizando no mapa...' : 'Grande Vitória - ES'}
                </span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Endereço, bairro ou CEP de saída (ex: Praia do Canto, Vitória - ES)"
                value={baseAddress}
                onChange={(e) => setBaseAddress(e.target.value)}
              />
            </div>

            {/* 4. PERFIL DE ACESSO AO SISTEMA (LOGIN & SENHA) */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--primary)',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <KeyRound size={15} /> 4. Perfil de Acesso ao Sistema
                </span>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                  <input
                    type="checkbox"
                    checked={autoGenerateCredentials}
                    onChange={(e) => setAutoGenerateCredentials(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                  />
                  <span>Gerar login e senha automaticamente</span>
                </label>
              </div>

              {autoGenerateCredentials ? (
                <div
                  style={{
                    background: 'var(--primary-subtle)',
                    border: '1px dashed var(--primary-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                        Login Corporativo Sugerido:
                      </span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                        {email || (name ? generateEmailFromName(name) : 'Preencha o nome')}
                      </strong>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Senha Inicial:</span>
                        <button
                          type="button"
                          onClick={handleGenerateNewPassword}
                          title="Gerar outra senha aleatória"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Shuffle size={12} /> Outra
                        </button>
                      </div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {password || (name ? generatePasswordFromName(name) : 'Será gerada')}
                      </strong>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                    ⚡ Ao salvar, o OmniHome Care grava o acesso no PostgreSQL em nuvem e permite copiar para enviar via WhatsApp.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">E-mail de Login *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="email@exemplo.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Senha de Acesso *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: '2.2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.65rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)'
                        }}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '170px' }}>
                {loading ? 'Salvando na Nuvem...' : 'Cadastrar Profissional'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
