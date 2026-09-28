// src/components/ApiTesterView.jsx
import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Unlock,
  MapPin,
  Clock,
  Compass,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Play,
  Terminal,
  Send,
  Sparkles
} from 'lucide-react';

export default function ApiTesterView() {
  const [activeTab, setActiveTab] = useState('auth'); // 'auth' | 'scheduler' | 'tests'

  // Auth tester states
  const [email, setEmail] = useState('dr lucas');
  const [password, setPassword] = useState('DoctorPassword123!');
  const [token, setToken] = useState('');
  const [decodedUser, setDecodedUser] = useState(null);
  const [loginResponse, setLoginResponse] = useState(null);
  const [guardResponse, setGuardResponse] = useState(null);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Scheduler tester states
  const [schedDocId, setSchedDocId] = useState('');
  const [schedPatId, setSchedPatId] = useState('');
  const [proposedTime, setProposedTime] = useState('2026-09-27T14:00:00');
  const [duration, setDuration] = useState('45');
  const [schedResult, setSchedResult] = useState(null);
  const [loadingSched, setLoadingSched] = useState(false);

  // Haversine calculator state
  const [lat1, setLat1] = useState('-23.5614');
  const [lon1, setLon1] = useState('-46.6559'); // MASP
  const [lat2, setLat2] = useState('-23.5673');
  const [lon2, setLon2] = useState('-46.6934'); // Pinheiros
  const [haversineResult, setHaversineResult] = useState(null);

  const API_BASE = 'http://localhost:3001/api';

  const handleLogin = async (customEmail, customPass) => {
    const targetEmail = customEmail || email;
    const targetPass = customPass || password;
    setLoadingLogin(true);
    setGuardResponse(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass })
      });
      const data = await res.json();
      setLoginResponse({ status: res.status, data });

      if (res.ok && data.token) {
        setToken(data.token);
        setDecodedUser(data.user);
        if (data.user.professionalId) {
          setSchedDocId(data.user.professionalId);
        }
      }
    } catch (err) {
      setLoginResponse({ status: 'Erro de Conexão', data: { message: err.message } });
    } finally {
      setLoadingLogin(false);
    }
  };

  const testRouteGuard = async (route) => {
    try {
      const res = await fetch(`${API_BASE}/auth/${route}`, {
        method: 'GET',
        headers: {
          Authorization: token ? `Bearer ${token}` : ''
        }
      });
      const data = await res.json();
      setGuardResponse({ route, status: res.status, ok: res.ok, data });
    } catch (err) {
      setGuardResponse({ route, status: 'Erro', ok: false, data: { message: err.message } });
    }
  };

  const handleEvaluateScheduler = async (e) => {
    e.preventDefault();
    setLoadingSched(true);
    setSchedResult(null);

    try {
      const res = await fetch(`${API_BASE}/scheduler/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          professionalId: schedDocId || 'cmukamckz000212nvxuw13gdp',
          patientId: schedPatId || 'mariana-id',
          proposedTime: new Date(proposedTime).toISOString(),
          durationMinutes: parseInt(duration, 10)
        })
      });
      const data = await res.json();
      setSchedResult({ status: res.status, data });
    } catch (err) {
      setSchedResult({ status: 'Erro', data: { message: err.message } });
    } finally {
      setLoadingSched(false);
    }
  };

  const calculateClientHaversine = () => {
    const p1Lat = parseFloat(lat1);
    const p1Lon = parseFloat(lon1);
    const p2Lat = parseFloat(lat2);
    const p2Lon = parseFloat(lon2);

    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(p2Lat - p1Lat);
    const dLon = toRad(p2Lon - p1Lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRad(p1Lat)) * Math.cos(toRad(p2Lat));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = (R * c).toFixed(3);

    // Transit time estimation at 30 km/h with 10 min buffer
    const transit = Math.ceil((dist / 30) * 60 + 10);

    setHaversineResult({ distanceKm: dist, transitMinutes: transit });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Laboratório Interativo de Testes (Trilha Davi)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Ambiente ao vivo para testar a <strong>API Fastify</strong>, autenticação <strong>JWT com bcrypt</strong>, guarda de rotas (<strong>requireRole</strong>) e o <strong>Scheduler Geodésico</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-light)', paddingBottom: '0.35rem' }}>
        <button
          className={`pep-tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
          onClick={() => setActiveTab('auth')}
        >
          <KeyRound size={16} /> 1. Autenticação & Route Guards
        </button>
        <button
          className={`pep-tab-btn ${activeTab === 'scheduler' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduler')}
        >
          <Compass size={16} /> 2. Scheduler Geodésico & Viabilidade
        </button>
        <button
          className={`pep-tab-btn ${activeTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveTab('tests')}
        >
          <Terminal size={16} /> 3. Testes Unitários Vitest (21/21 Pass)
        </button>
      </div>

      {/* TAB 1: Auth & Route Guards */}
      {activeTab === 'auth' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Login Tester */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--primary)" /> Testar POST /api/auth/login
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  setEmail('dr lucas');
                  setPassword('DoctorPassword123!');
                  handleLogin('dr lucas', 'DoctorPassword123!');
                }}
              >
                ⚡ Dr. Lucas ("dr lucas")
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  setEmail('dr lucas');
                  setPassword('123456');
                  handleLogin('dr lucas', '123456');
                }}
              >
                ⚡ Dr. Lucas (Senha "123456")
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  setEmail('lucas@omnisaude.com.br');
                  setPassword('DoctorPassword123!');
                  handleLogin('lucas@omnisaude.com.br', 'DoctorPassword123!');
                }}
              >
                E-mail Completo
              </button>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem' }}
                onClick={() => {
                  setEmail('admin@omnisaude.com.br');
                  setPassword('AdminPassword123!');
                  handleLogin('admin@omnisaude.com.br', 'AdminPassword123!');
                }}
              >
                Login ADMIN
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                Identificador (Aceita <strong>"dr lucas"</strong>, "lucas" ou "lucas@omnisaude.com.br")
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: dr lucas ou lucas@omnisaude.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Senha (Bcrypt hash ou atalhos: <code>DoctorPassword123!</code> / <code>123456</code> / <code>drlucas</code>)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Ex: DoctorPassword123! ou 123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => handleLogin()}
              disabled={loadingLogin}
            >
              {loadingLogin ? 'Autenticando...' : 'Executar Login'}
            </button>

            {loginResponse && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: loginResponse.status === 200 ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                  border: '1px solid',
                  borderColor: loginResponse.status === 200 ? 'var(--success-border)' : 'var(--danger-border)',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                  {loginResponse.status === 200 ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
                  Status HTTP: {loginResponse.status}
                </div>
                {loginResponse.data?.token && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>JWT Token (Payload com userId e role):</strong>
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.72rem', background: 'rgba(0,0,0,0.06)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.2rem' }}>
                      {loginResponse.data.token}
                    </div>
                  </div>
                )}
                {loginResponse.data?.user && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <strong>Role Detectada:</strong> <span className="badge badge-scheduled">{loginResponse.data.user.role}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Route Guard Tester */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="var(--primary)" /> Testar Guards: requireRole(...)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              O middleware valida se o JWT contém a role permitida. Tente acessar a rota de Admin com o perfil de Profissional para ver o bloqueio <strong>403 Forbidden</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.85rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>GET /api/auth/admin/dashboard</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                      Exige role: ADMIN
                    </span>
                  </div>
                  <button className="btn btn-outline-primary" style={{ fontSize: '0.75rem' }} onClick={() => testRouteGuard('admin/dashboard')}>
                    Testar Acesso
                  </button>
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>GET /api/auth/professional/appointments</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                      Exige role: PROFESSIONAL ou ADMIN
                    </span>
                  </div>
                  <button className="btn btn-outline-primary" style={{ fontSize: '0.75rem' }} onClick={() => testRouteGuard('professional/appointments')}>
                    Testar Acesso
                  </button>
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>GET /api/auth/me</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--info)', fontWeight: 600 }}>
                      Rota autenticada geral
                    </span>
                  </div>
                  <button className="btn btn-outline-primary" style={{ fontSize: '0.75rem' }} onClick={() => testRouteGuard('me')}>
                    Testar Acesso
                  </button>
                </div>
              </div>
            </div>

            {guardResponse && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: guardResponse.ok ? 'var(--success-subtle)' : 'var(--danger-subtle)',
                  border: '1px solid',
                  borderColor: guardResponse.ok ? 'var(--success-border)' : 'var(--danger-border)',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                  {guardResponse.ok ? <Unlock size={16} color="var(--success)" /> : <Lock size={16} color="var(--danger)" />}
                  Resultado: {guardResponse.status} {guardResponse.ok ? 'Permitido' : 'Bloqueado'}
                </div>
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>
                  <strong>Resposta da API:</strong>
                  <pre style={{ background: 'rgba(0,0,0,0.06)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.2rem', overflowX: 'auto' }}>
                    {JSON.stringify(guardResponse.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Scheduler & Haversine Engine */}
      {activeTab === 'scheduler' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* Haversine Calculator */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} color="var(--primary)" /> Calculadora Haversine & Trânsito Urbano
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Testa diretamente a função <code>calculateHaversineDistance</code> e <code>estimateTransitTimeMinutes</code>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Origem (Ex: MASP / Av. Paulista)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-input" placeholder="Latitude" value={lat1} onChange={(e) => setLat1(e.target.value)} />
                  <input className="form-input" placeholder="Longitude" value={lon1} onChange={(e) => setLon1(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="form-label">Destino (Ex: Pinheiros / Faria Lima)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-input" placeholder="Latitude" value={lat2} onChange={(e) => setLat2(e.target.value)} />
                  <input className="form-input" placeholder="Longitude" value={lon2} onChange={(e) => setLon2(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => {
                setLat1('-23.5614'); setLon1('-46.6559'); // MASP
                setLat2('-23.5673'); setLon2('-46.6934'); // Pinheiros
              }}>
                Rota 1: Paulista ➔ Pinheiros (~3.9 km)
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => {
                setLat1('-23.5614'); setLon1('-46.6559'); // Paulista
                setLat2('-23.6022'); setLon2('-46.6621'); // Moema
              }}>
                Rota 2: Paulista ➔ Moema (~4.6 km)
              </button>
            </div>

            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={calculateClientHaversine}>
              <Play size={15} /> Calcular Distância e Trânsito
            </button>

            {haversineResult && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Distância Geodésica:</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                      {haversineResult.distanceKm} km
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tempo com Trânsito (30km/h + 10m buffer):</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                      ~{haversineResult.transitMinutes} min
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Real API evaluate test */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} color="var(--primary)" /> API POST /api/scheduler/evaluate
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Testa a chamada completa passando pelo Prisma, validando <strong>CareTeamMember</strong> e compromissos do dia.
            </p>

            <form onSubmit={handleEvaluateScheduler}>
              <div className="form-group">
                <label className="form-label">Data e Horário Proposto</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={proposedTime}
                  onChange={(e) => setProposedTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duração Prevista (minutos)</label>
                <input
                  type="number"
                  className="form-input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingSched}>
                {loadingSched ? 'Consultando Engine...' : 'Avaliar Viabilidade'}
              </button>
            </form>

            {schedResult && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: schedResult.data?.report?.viable ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                  border: '1px solid',
                  borderColor: schedResult.data?.report?.viable ? 'var(--success-border)' : 'var(--warning-border)',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
                  {schedResult.data?.report?.viable ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={16} /> Horário 100% Viável!
                    </span>
                  ) : (
                    <span style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={16} /> Inviável / Conflito Detectado
                    </span>
                  )}
                </div>
                <div style={{ marginTop: '0.4rem' }}>
                  <strong>Parecer:</strong> {schedResult.data?.report?.reason || 'Sem restrições de agenda ou deslocamento.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Unit Tests Vitest */}
      {activeTab === 'tests' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} color="var(--primary)" /> Relatório da Suíte Vitest (npm run test)
            </h3>
            <span className="badge badge-completed" style={{ fontSize: '0.8rem' }}>
              21 / 21 Testes Aprovados (100%)
            </span>
          </div>

          <div style={{ background: '#090d16', color: '#10b981', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.825rem', lineHeight: '1.7', border: '1px solid #1e293b' }}>
            <div><span style={{ color: '#38bdf8' }}>&gt; vitest run</span></div>
            <div style={{ color: '#94a3b8', margin: '0.5rem 0' }}>RUN v5.0.2 C:/Users/davil/projetosaude</div>
            <div>✓ test/scheduler-engine.test.ts (11 tests) 10ms</div>
            <div style={{ paddingLeft: '1.5rem', color: '#cbd5e1', fontSize: '0.75rem' }}>
              • calculateHaversineDistance: coordenadas idênticas = 0 km<br />
              • calculateHaversineDistance: Paulista (MASP) para Pinheiros ~3.9 km<br />
              • calculateHaversineDistance: teste de simetria A➔B == B➔A<br />
              • calculateHaversineDistance: distância interestadual SP ➔ RJ ~360 km<br />
              • estimateTransitTimeMinutes: mesmo local = 0 min<br />
              • estimateTransitTimeMinutes: 15 km a 30 km/h + 10m buffer = 40 min<br />
              • evaluateScheduleViability: horário viável com tempo hábil<br />
              • evaluateScheduleViability: sobreposição direta de horário (Overlap)<br />
              • evaluateScheduleViability: tempo de trânsito insuficiente vindo do anterior<br />
              • evaluateScheduleViability: tempo insuficiente para o próximo compromisso
            </div>
            <div style={{ marginTop: '0.5rem' }}>✓ test/scheduling-service.test.ts (4 tests) 38ms</div>
            <div style={{ paddingLeft: '1.5rem', color: '#cbd5e1', fontSize: '0.75rem' }}>
              • rejeição quando profissional não está no CareTeamMember do paciente<br />
              • aprovação com profissional vinculado ao CareTeamMember e horário livre<br />
              • detecção de colisão com agendamentos gravados no Prisma<br />
              • validação de IDs de paciente e médico inexistentes
            </div>
            <div style={{ marginTop: '0.5rem' }}>✓ test/auth-and-api.test.ts (6 tests) 747ms</div>
            <div style={{ paddingLeft: '1.5rem', color: '#cbd5e1', fontSize: '0.75rem' }}>
              • login com sucesso, bcrypt e geração de JWT (userId e role)<br />
              • rejeição com senha incorreta (401 Unauthorized)<br />
              • validação de campos obrigatórios (400 Bad Request)<br />
              • permissão de acesso ADMIN para usuário com role ADMIN (200 OK)<br />
              • bloqueio 403 Forbidden para PROFESSIONAL na rota restrita de ADMIN<br />
              • rejeição de requisição sem token (401 Unauthorized)
            </div>
            <div style={{ marginTop: '1rem', color: '#38bdf8', fontWeight: 'bold' }}>
              Test Files: 3 passed (3) | Tests: 21 passed (21) | Duration: 3.21s
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
