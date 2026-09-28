// src/components/LoginModal.jsx
import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  User,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  LogOut
} from 'lucide-react';

export default function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout
}) {
  const [identifier, setIdentifier] = useState('lucas@omnisaude.com.br');
  const [password, setPassword] = useState('DoctorPassword123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleExecuteLogin = async (overrideId, overridePass) => {
    const idToUse = overrideId !== undefined ? overrideId : identifier;
    const passToUse = overridePass !== undefined ? overridePass : password;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: idToUse, password: passToUse })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Falha ao autenticar.');
      }

      setSuccessMsg(`Autenticado com sucesso como ${data.user.name} (${data.user.role})!`);
      localStorage.setItem('omnihome_jwt', data.token);
      localStorage.setItem('omnihome_user', JSON.stringify(data.user));

      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor HTTP Fastify (porta 3001).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="modal-title">Autenticação Corporativa (JWT)</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Validação Estrita via E-mail + Bcrypt (Porta 3001)
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {currentUser && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--success)'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {currentUser.email} • <span className="badge badge-scheduled">{currentUser.role}</span>
                  </div>
                </div>
              </div>
              {onLogout && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => {
                    onLogout();
                    setSuccessMsg('Sessão encerrada com sucesso.');
                  }}
                >
                  <LogOut size={13} style={{ marginRight: '4px' }} /> Sair
                </button>
              )}
            </div>
          )}

          {/* Quick Login Presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              PREENCHER CREDENCIAIS DE DEMO:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: 'var(--primary-subtle)',
                  borderColor: 'var(--primary-light)',
                  color: 'var(--primary)'
                }}
                onClick={() => {
                  setIdentifier('lucas@omnisaude.com.br');
                  setPassword('DoctorPassword123!');
                  handleExecuteLogin('lucas@omnisaude.com.br', 'DoctorPassword123!');
                }}
              >
                <Sparkles size={14} /> Dr. Lucas Silveira
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
                onClick={() => {
                  setIdentifier('admin@omnisaude.com.br');
                  setPassword('AdminPassword123!');
                  handleExecuteLogin('admin@omnisaude.com.br', 'AdminPassword123!');
                }}
              >
                <ShieldCheck size={14} /> Administrador
              </button>
            </div>
          </div>

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
                placeholder="lucas@omnisaude.com.br"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Exige e-mail cadastrado (ex: <code>lucas@omnisaude.com.br</code>)
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} /> Senha Segura (Hash Bcrypt)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="DoctorPassword123!"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Senha do profissional cadastrada no banco: <code>DoctorPassword123!</code>
              </span>
            </div>

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
                  fontSize: '0.8rem',
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

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Autenticando via Bcrypt + JWT...' : 'Entrar na Plataforma'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
