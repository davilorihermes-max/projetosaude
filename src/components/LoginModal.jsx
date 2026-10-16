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

import { resolveAddressCoordinates } from '../services/geocodingService';

const LOCATION_PRESETS = [
  // São Paulo
  { name: 'Paulista (SP)', address: 'Alameda Santos, 1200 - Cerqueira César, São Paulo - SP', lat: -23.563099, lng: -46.654271 },
  { name: 'Pinheiros (SP)', address: 'Rua Fradique Coutinho, 800 - Pinheiros, São Paulo - SP', lat: -23.567300, lng: -46.693400 },
  { name: 'Campinas (SP)', address: 'Av. José de Souza Campos, 500 - Cambuí, Campinas - SP', lat: -22.898400, lng: -47.051900 },
  // Rio de Janeiro
  { name: 'Copacabana (RJ)', address: 'Av. Atlântica, 1500 - Copacabana, Rio de Janeiro - RJ', lat: -22.971100, lng: -43.182500 },
  { name: 'Barra da Tijuca (RJ)', address: 'Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ', lat: -22.999700, lng: -43.365900 },
  // Paraná
  { name: 'Batel (Curitiba - PR)', address: 'Av. do Batel, 1500 - Batel, Curitiba - PR', lat: -25.442800, lng: -49.288900 },
  { name: 'Centro Cívico (Curitiba - PR)', address: 'Av. Cândido de Abreu, 500 - Centro Cívico, Curitiba - PR', lat: -25.417200, lng: -49.269400 },
  // Minas Gerais
  { name: 'Savassi (BH - MG)', address: 'Av. Cristóvão Colombo, 500 - Savassi, Belo Horizonte - MG', lat: -19.938600, lng: -43.933300 },
  // Distrito Federal
  { name: 'Asa Sul (Brasília - DF)', address: 'SHCS EQS 208/408 - Asa Sul, Brasília - DF', lat: -15.811400, lng: -47.906100 },
  // Rio Grande do Sul
  { name: 'Moinhos de Vento (POA - RS)', address: 'Rua Padre Chagas, 300 - Moinhos de Vento, Porto Alegre - RS', lat: -30.026100, lng: -51.203600 },
  // Bahia
  { name: 'Barra / Ondina (Salvador - BA)', address: 'Av. Oceânica, 1200 - Barra, Salvador - BA', lat: -13.008900, lng: -38.528300 },
  // Pernambuco
  { name: 'Boa Viagem (Recife - PE)', address: 'Av. Boa Viagem, 2000 - Boa Viagem, Recife - PE', lat: -8.127500, lng: -34.903600 },
  // Santa Catarina
  { name: 'Beira-Mar (Florianópolis - SC)', address: 'Av. Beira Mar Norte, 2200 - Centro, Florianópolis - SC', lat: -27.585500, lng: -48.552400 }
];

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

  // Register / Profile Creation States (Strict Healthcare Standards)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [regProfession, setRegProfession] = useState('Fisioterapia');
  const [regCouncilNumber, setRegCouncilNumber] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regBaseAddress, setRegBaseAddress] = useState('São Paulo - SP');
  const [regCoordinates, setRegCoordinates] = useState({ latitude: -23.585000, longitude: -46.638000 });
  const [regColor, setRegColor] = useState('#0d9488');
  const [regAvatar, setRegAvatar] = useState(null);
  const [resolvedLocationName, setResolvedLocationName] = useState('São Paulo - SP');

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

  // Password Security Criteria
  const passwordCriteria = {
    minChars: regPassword.length >= 8,
    hasUpper: /[A-Z]/.test(regPassword),
    hasLower: /[a-z]/.test(regPassword),
    hasNumber: /[0-9]/.test(regPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(regPassword),
    matchesConfirm: Boolean(regPassword && regConfirmPassword && regPassword === regConfirmPassword)
  };

  const passedCriteriaCount = [
    passwordCriteria.minChars,
    passwordCriteria.hasUpper,
    passwordCriteria.hasLower,
    passwordCriteria.hasNumber,
    passwordCriteria.hasSpecial
  ].filter(Boolean).length;

  const getStrengthInfo = () => {
    if (regPassword.length === 0) return { label: 'Não informada', color: 'var(--text-muted)', percent: 0 };
    if (passedCriteriaCount <= 2) return { label: 'Fraca (Muito vulnerável)', color: '#ef4444', percent: 25 };
    if (passedCriteriaCount <= 3) return { label: 'Média (Insuficiente)', color: '#f59e0b', percent: 50 };
    if (passedCriteriaCount === 4) return { label: 'Boa (Recomendada)', color: '#0284c7', percent: 75 };
    return { label: 'Excelente (Forte & Segura)', color: '#10b981', percent: 100 };
  };

  const strength = getStrengthInfo();

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

  const getSpecialtyPlaceholder = (prof) => {
    switch (prof) {
      case 'Fisioterapia': return 'ex: Fisioterapia Cardiorrespiratória & Motora no Leito';
      case 'Enfermagem': return 'ex: Enfermagem Estomaterapeuta & Curativos Complexos';
      case 'Fonoaudiologia': return 'ex: Reabilitação de Deglutição (Disfagia) & Voz';
      case 'Nutrição': return 'ex: Terapia Nutricional Enteral no Domicílio';
      case 'Terapia Ocupacional': return 'ex: Reabilitação de AVDs & Tecnologia Assistiva';
      case 'Psicologia': return 'ex: Psicologia Clínica & Apoio a Cuidadores';
      default: return 'ex: Atenção Domiciliar Especializada';
    }
  };

  const handleBaseAddressChange = async (newAddr) => {
    setRegBaseAddress(newAddr);
    if (newAddr && newAddr.trim().length >= 3) {
      try {
        const res = await resolveAddressCoordinates(newAddr);
        if (res && res.latitude && res.longitude) {
          setRegCoordinates({ latitude: res.latitude, longitude: res.longitude });
          setResolvedLocationName(res.matched || res.city || 'Georreferenciado com sucesso');
        }
      } catch {}
    }
  };

  const handleSelectLocation = (preset) => {
    setRegBaseAddress(preset.address);
    setRegCoordinates({ latitude: preset.lat, longitude: preset.lng });
    setResolvedLocationName(preset.name);
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
      let loggedUser = null;
      let token = null;

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: idToUse, password: passToUse })
        });

        if (res.ok) {
          const data = await res.json();
          loggedUser = data.user;
          token = data.token;
        } else {
          const data = await res.json().catch(() => ({}));
          if (res.status === 400 || res.status === 401) {
            throw new Error(data.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
          }
        }
      } catch (fetchErr) {
        if (fetchErr.message && (fetchErr.message.includes('Credenciais') || fetchErr.message.includes('senha') || fetchErr.message.includes('inválid'))) {
          throw fetchErr;
        }
        console.warn('Backend indisponível, processando login em modo local:', fetchErr);
      }

      // Se o backend não estiver ativo (ex: em produção no Vercel), autentica com persistência local estrita
      if (!loggedUser) {
        const savedUsersRaw = localStorage.getItem('omnihome_registered_users');
        const savedUsers = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
        const existing = savedUsers.find(
          (u) => u.email.toLowerCase().trim() === idToUse.toLowerCase().trim()
        );

        if (!existing) {
          throw new Error('Credenciais inválidas: perfil não encontrado. Por favor, verifique o e-mail digitado ou cadastre seu perfil na aba "Cadastrar Perfil Profissional".');
        }

        if (existing.password && existing.password !== passToUse) {
          throw new Error('Credenciais inválidas: e-mail ou senha incorretos.');
        }

        loggedUser = existing;
        token = `session-${Date.now()}`;
      }

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
      setErrorMsg(err.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Validação Estrita de Nome Completo
    const nameTrimmed = regName.trim();
    const nameWords = nameTrimmed.split(/\s+/);
    if (nameTrimmed.length < 5 || nameWords.length < 2 || nameWords.some((w) => w.length < 2)) {
      setErrorMsg('Requisito de Identificação: Informe seu nome e sobrenome completos (mínimo 5 caracteres e duas palavras, ex: Dr. Henrique Silva).');
      return;
    }

    // 2. Validação de E-mail Corporativo
    if (!regEmail || !CORPORATE_EMAIL_REGEX.test(regEmail.trim())) {
      setErrorMsg('Requisito de Acesso: Informe um e-mail corporativo válido com domínio e extensão (ex: profissional@omnisaude.com.br).');
      return;
    }

    // 3. Validação Estrita de CPF (Algoritmo da Receita Federal)
    if (!regCpf || !isValidCPF(regCpf)) {
      setErrorMsg('Requisito de Saúde & PEP: Informe um CPF válido (11 dígitos) para registro profissional e prescrição.');
      return;
    }

    // 4. Validação de Telefone / WhatsApp
    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Requisito de Comunicação: Informe um telefone celular/WhatsApp com DDD válido para escalas e rotas.');
      return;
    }

    // 5. Validação de Registro de Conselho & Compatibilidade com a Profissão
    if (!regCouncilNumber || regCouncilNumber.trim().length < 4) {
      setErrorMsg(`Requisito Profissional: Informe seu registro ativo com conselho e UF (ex: ${getCouncilPlaceholder(regProfession)}).`);
      return;
    }

    const councilValidation = validateCouncilForProfession(regProfession, regCouncilNumber.trim());
    if (!councilValidation.isValid) {
      setErrorMsg(councilValidation.error || 'Registro no conselho incompatível com a profissão.');
      return;
    }

    // 6. Validação de Especialidade
    if (!regSpecialty || regSpecialty.trim().length < 4) {
      setErrorMsg('Requisito Clínico: Informe sua especialidade ou foco de atuação domiciliar (mínimo 4 caracteres).');
      return;
    }

    // 7. Validação Estrita da Política de Senha
    if (!passwordCriteria.minChars) {
      setErrorMsg('Requisito de Segurança: A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (!passwordCriteria.hasUpper || !passwordCriteria.hasLower) {
      setErrorMsg('Requisito de Segurança: A senha deve conter letras maiúsculas e minúsculas.');
      return;
    }
    if (!passwordCriteria.hasNumber) {
      setErrorMsg('Requisito de Segurança: A senha deve conter ao menos um número (0-9).');
      return;
    }
    if (!passwordCriteria.hasSpecial) {
      setErrorMsg('Requisito de Segurança: A senha deve conter ao menos um caractere especial (!@#$%...).');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Requisito de Confirmação: As senhas digitadas não coincidem. Digite novamente para confirmar.');
      return;
    }

    // 8. Validação de Endereço Base para Roteirização
    if (!regBaseAddress || regBaseAddress.trim().length < 8) {
      setErrorMsg('Requisito de Roteirização: Informe o endereço residencial ou base de saída para o cálculo de rotas.');
      return;
    }

    setLoading(true);

    try {
      let createdUser = null;
      let token = null;

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName.trim(),
            email: regEmail.trim().toLowerCase(),
            password: regPassword,
            role: 'PROFESSIONAL',
            profession: regProfession,
            specialty: regSpecialty.trim(),
            councilNumber: regCouncilNumber.trim(),
            crm: regCouncilNumber.trim(),
            cpf: regCpf,
            phone: regPhone,
            latitude: regCoordinates.latitude,
            longitude: regCoordinates.longitude,
            linkToCareTeams: true
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Falha ao cadastrar perfil profissional.');
        }

        createdUser = data.user;
        token = data.token;
        localStorage.setItem('omnihome_jwt', token);
        localStorage.setItem('omnihome_user_v3', JSON.stringify(createdUser));
        localStorage.setItem('omnihome_user', JSON.stringify(createdUser));

        const savedUsersRaw = localStorage.getItem('omnihome_registered_users');
        const savedUsers = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
        const filtered = savedUsers.filter((u) => u.email.toLowerCase() !== createdUser.email.toLowerCase());
        localStorage.setItem('omnihome_registered_users', JSON.stringify([...filtered, { ...createdUser, password: regPassword }]));
      } catch (backendErr) {
        if (backendErr.name !== 'TypeError' && !backendErr.message?.includes('fetch') && !backendErr.message?.includes('NetworkError')) {
          throw backendErr;
        }
        console.warn('Backend Fastify indisponível, salvando registro em modo local:', backendErr);
        createdUser = {
          id: `usr-${Date.now()}`,
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: regProfession === 'Administração' || regEmail.toLowerCase().includes('admin') ? 'ADMIN' : 'PROFESSIONAL',
          professionalId: `doc-${Date.now()}`
        };
        token = `session-${Date.now()}`;

        // Salva na lista de contas cadastradas localmente
        const savedUsersRaw = localStorage.getItem('omnihome_registered_users');
        const savedUsers = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
        const filtered = savedUsers.filter((u) => u.email.toLowerCase() !== createdUser.email.toLowerCase());
        localStorage.setItem('omnihome_registered_users', JSON.stringify([...filtered, createdUser]));
      }

      // Constrói objeto do profissional formatado para a UI e Care Team
      const newProfessional = {
        id: createdUser?.professionalId || `doc-${Date.now()}`,
        name: regName.trim(),
        profession: regProfession,
        specialty: regSpecialty.trim(),
        councilNumber: regCouncilNumber.trim(),
        crm: regCouncilNumber.trim(),
        cpf: regCpf,
        phone: regPhone,
        avatar: regAvatar,
        color: regColor,
        baseAddress: regBaseAddress,
        baseCoordinates: regCoordinates
      };

      setSuccessMsg(`Perfil de ${regName} credenciado com sucesso no Care Team!`);

      if (onRegisterSuccess) {
        onRegisterSuccess(newProfessional, createdUser, token);
      } else if (onLoginSuccess) {
        onLoginSuccess(createdUser, token);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao registrar novo perfil profissional.');
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
              {/* Seção 1: Identificação & Documentos Obrigatórios */}
              <div style={{ marginBottom: '1.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <User size={14} /> 1. Identificação do Profissional (Obrigatório para Prontuário)
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nome Completo *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nome e Sobrenome (ex: Davi Loriato Hermes)"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      Mínimo duas palavras conforme registro no conselho.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">E-mail Corporativo *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="seu.email@empresa.com.br"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">CPF do Profissional *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="000.000.000-00"
                      value={regCpf}
                      onChange={handleCpfChange}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: regCpf && !isValidCPF(regCpf) ? 'var(--danger)' : 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      {regCpf && !isValidCPF(regCpf) ? 'CPF inválido (11 dígitos)' : 'Validação algorítmica da Receita Federal'}
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telefone / WhatsApp com DDD *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="(11) 98765-4321"
                      value={regPhone}
                      onChange={handlePhoneChange}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                      Contato para alinhamento em rota e cuidadores
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Conselho de Classe & Especialidade Clínica */}
              <div style={{ marginBottom: '1.3rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Award size={14} /> 2. Conselho de Classe & Especialidade Clínica
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Profissão Multidisciplinar *</label>
                    <select
                      className="form-input"
                      value={regProfession}
                      onChange={(e) => handleProfessionChange(e.target.value)}
                    >
                      <option value="Fisioterapia">Fisioterapia (CREFITO)</option>
                      <option value="Enfermagem">Enfermagem (COREN)</option>
                      <option value="Fonoaudiologia">Fonoaudiologia (CRFa)</option>
                      <option value="Nutrição">Nutrição (CRN)</option>
                      <option value="Terapia Ocupacional">Terapia Ocupacional (CREFITO)</option>
                      <option value="Psicologia">Psicologia (CRP)</option>
                      <option value="Medicina">Medicina (CRM)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Registro Ativo no Conselho (com UF) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={getCouncilPlaceholder(regProfession)}
                      value={regCouncilNumber}
                      onChange={(e) => setRegCouncilNumber(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                      {PROFESSION_COUNCIL_MAP[regProfession]
                        ? `Conselho regulamentar: ${PROFESSION_COUNCIL_MAP[regProfession].acronym} (ex: ${PROFESSION_COUNCIL_MAP[regProfession].example})`
                        : 'Informe conselho e UF'}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Especialidade Clínica / Foco de Atuação *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={getSpecialtyPlaceholder(regProfession)}
                    value={regSpecialty}
                    onChange={(e) => setRegSpecialty(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Seção 3: Política Estrita de Senha Segura (Bcrypt) */}
              <div style={{ marginBottom: '1.3rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Lock size={14} /> 3. Segurança de Acesso & Política de Senha Forte
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Senha de Acesso *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Mínimo 8 caracteres"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
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
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirmar Senha *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="Repita a senha"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        required
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Força da Senha (Barra Visual) */}
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Força da Senha:</span>
                    <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-page)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${strength.percent}%`,
                        height: '100%',
                        background: strength.color,
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </div>
                </div>

                {/* Checklist Interativo dos Requisitos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.minChars ? 'var(--success)' : 'var(--text-muted)' }}>
                    {passwordCriteria.minChars ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                    <span>Mínimo de 8 caracteres</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: (passwordCriteria.hasUpper && passwordCriteria.hasLower) ? 'var(--success)' : 'var(--text-muted)' }}>
                    {(passwordCriteria.hasUpper && passwordCriteria.hasLower) ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                    <span>Letras maiúsculas e minúsculas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.hasNumber ? 'var(--success)' : 'var(--text-muted)' }}>
                    {passwordCriteria.hasNumber ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                    <span>Ao menos um número (0-9)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.hasSpecial ? 'var(--success)' : 'var(--text-muted)' }}>
                    {passwordCriteria.hasSpecial ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                    <span>Símbolo especial (!@#$%...)</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.35rem', color: passwordCriteria.matchesConfirm ? 'var(--success)' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {passwordCriteria.matchesConfirm ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                    <span>As duas senhas são idênticas</span>
                  </div>
                </div>
              </div>

              {/* Seção 4: Ponto Base de Partida (Geolocalização) */}
              <div style={{ marginBottom: '1.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={14} /> 4. Ponto Base de Partida (Georreferenciamento)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Origem para cálculo da 1ª sessão
                  </span>
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={regBaseAddress}
                    onChange={(e) => handleBaseAddressChange(e.target.value)}
                    placeholder="Rua, número, bairro e cidade (em qualquer estado do Brasil)..."
                    required
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={11} /> {resolvedLocationName}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {regCoordinates.latitude.toFixed(4)}, {regCoordinates.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {LOCATION_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                        background: regBaseAddress.includes(p.name) ? 'var(--primary-subtle)' : 'var(--bg-card)',
                        borderColor: regBaseAddress.includes(p.name) ? 'var(--primary-light)' : 'var(--border-color)',
                        color: regBaseAddress.includes(p.name) ? 'var(--primary)' : 'var(--text-body)'
                      }}
                      onClick={() => handleSelectLocation(p)}
                    >
                      <MapPin size={11} style={{ marginRight: '3px' }} />
                      {p.name}
                    </button>
                  ))}
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
