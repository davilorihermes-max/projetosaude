// src/components/MobileDeviceSimulator.jsx
import React, { useState } from 'react';
import {
  X,
  MapPin,
  Car,
  Clock,
  ShieldCheck,
  Navigation,
  FileText,
  Calendar,
  Users,
  DollarSign,
  Sun,
  Moon,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  Activity,
  Layers,
  Smartphone
} from 'lucide-react';
import './MobileDeviceSimulator.css';
import Avatar from './Avatar';

export default function MobileDeviceSimulator({
  isOpen,
  onClose,
  appointments = [],
  setAppointments,
  patients = [],
  doctors = [],
  darkMode,
  setDarkMode,
  currentUser
}) {
  const [phoneRole, setPhoneRole] = useState('PROFESSIONAL'); // 'PROFESSIONAL' | 'MANAGER'
  const [phoneTab, setPhoneTab] = useState('route'); // 'route' | 'pep' | 'patients' | 'scale' | 'financial'
  const [selectedAptForCheckIn, setSelectedAptForCheckIn] = useState(null);
  const [checkInSimMode, setCheckInSimMode] = useState('near'); // 'near' (14m) | 'far' (480m)
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedPatientForPEP, setSelectedPatientForPEP] = useState(patients[0] || null);

  // PEP state inside phone
  const [pepVitals, setPepVitals] = useState({ bp: '120/80', hr: '76', spo2: '98', temp: '36.5' });
  const [pepSubjective, setPepSubjective] = useState('');
  const [pepPlan, setPepPlan] = useState('');
  const [showAiRAG, setShowAiRAG] = useState(false);

  if (!isOpen) return null;

  const activeDoc = doctors[0] || {
    id: 'doc-3',
    name: 'Rafael Fontes',
    profession: 'Fisioterapia',
    crm: 'CREFITO/SP 88.340',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150'
  };

  // KPIs
  const totalCount = appointments.length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const inProgressApt = appointments.find((a) => a.status === 'in_progress');
  const totalKm = appointments
    .reduce((acc, curr) => acc + (curr.distanceFromPrevKm || 2.4), 0)
    .toFixed(1);

  const getPatient = (id) => patients.find((p) => p.id === id) || {
    name: 'Paciente Domiciliar',
    address: 'Endereço em São Paulo - SP',
    caregiver: 'Família'
  };

  // Geofencing logic simulation
  const isWithinGeofence = checkInSimMode === 'near';
  const distanceMeters = isWithinGeofence ? 18 : 485;

  const handleConfirmCheckIn = () => {
    if (!selectedAptForCheckIn) return;
    if (!isWithinGeofence && !overrideReason.trim()) {
      alert('Informe uma justificativa para check-in fora do raio permitido (150m).');
      return;
    }

    const updated = appointments.map((a) => {
      if (a.id === selectedAptForCheckIn.id) {
        return {
          ...a,
          status: 'in_progress',
          checkIn: {
            timestamp: new Date().toISOString(),
            distanceMeters,
            isWithinGeofence,
            status: isWithinGeofence ? 'ON_SITE_VALIDATED' : 'OUT_OF_BOUNDS_ACCEPTED',
            overrideReason: !isWithinGeofence ? overrideReason : null
          }
        };
      }
      return a;
    });

    if (setAppointments) setAppointments(updated);
    setSelectedAptForCheckIn(null);
    setOverrideReason('');
  };

  const handleConfirmCheckOut = () => {
    if (!selectedAptForCheckIn) return;
    const updated = appointments.map((a) => {
      if (a.id === selectedAptForCheckIn.id) {
        return {
          ...a,
          status: 'completed',
          checkOut: {
            timestamp: new Date().toISOString()
          }
        };
      }
      return a;
    });

    if (setAppointments) setAppointments(updated);
    setSelectedAptForCheckIn(null);
  };

  const handleSavePEP = () => {
    alert(`Evolução SOAP registrada no prontuário de ${selectedPatientForPEP?.name || 'paciente'}!`);
    setPepSubjective('');
    setPepPlan('');
    setShowAiRAG(false);
  };

  return (
    <div className="mobile-sim-overlay">
      <button className="close-sim-btn" onClick={onClose} title="Fechar Simulador">
        <X size={20} />
      </button>

      <div className="mobile-sim-container">
        {/* Explainer Panel for Reviewers / User */}
        <div className="mobile-sim-info">
          <div className="mobile-sim-badge">
            <Smartphone size={14} />
            <span>Simulador Mobile Interativo</span>
          </div>

          <h2 className="mobile-sim-title">
            OmniSaúde Mobile no seu Navegador
          </h2>

          <p className="mobile-sim-desc">
            Teste em tempo real a experiência móvel sem precisar de emuladores ou instalar aplicativos externos. Totalmente sincronizado com o banco de dados da clínica.
          </p>

          <div className="mobile-sim-features">
            <div className="mobile-sim-feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="feature-title">Geofencing GPS no Domicílio</div>
                <div className="feature-sub">Validação espacial linear (Haversine) com raio de 150 metros.</div>
              </div>
            </div>

            <div className="mobile-sim-feature-item">
              <div className="feature-icon-box">
                <HeartPulse size={18} />
              </div>
              <div>
                <div className="feature-title">Prontuário PEP com Copiloto IA</div>
                <div className="feature-sub">Anamnese SOAP estruturada e busca em protocolos assistenciais.</div>
              </div>
            </div>

            <div className="mobile-sim-feature-item">
              <div className="feature-icon-box">
                <Layers size={18} />
              </div>
              <div>
                <div className="feature-title">Alternância Campo vs Gestão</div>
                <div className="feature-sub">Roteirização urbana para profissionais e escalas para coordenadores.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Smartphone Hardware Frame */}
        <div className="phone-mockup-frame">
          {/* Dynamic Island */}
          <div className="phone-dynamic-island">
            <div className="island-camera"></div>
            <div className="island-sensor"></div>
          </div>

          {/* Phone Screen */}
          <div className="phone-screen">
            {/* Status Bar */}
            <div className="phone-status-bar">
              <span>09:41</span>
              <div className="status-bar-icons">
                <Activity size={12} color="#0d9488" />
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* App Header Inside Phone */}
            <div className="phone-app-header">
              <div className="phone-header-top">
                <div className="phone-brand">
                  <div className="phone-logo">
                    <HeartPulse size={16} />
                  </div>
                  <span className="phone-brand-name">OmniSaúde</span>
                </div>

                <div className="phone-header-actions">
                  <button
                    className="phone-role-pill"
                    onClick={() => {
                      const next = phoneRole === 'PROFESSIONAL' ? 'MANAGER' : 'PROFESSIONAL';
                      setPhoneRole(next);
                      setPhoneTab(next === 'PROFESSIONAL' ? 'route' : 'scale');
                    }}
                  >
                    <span>{phoneRole === 'PROFESSIONAL' ? 'Campo' : 'Gestão'}</span>
                  </button>

                  <button
                    className="phone-icon-btn"
                    onClick={() => setDarkMode(!darkMode)}
                    title="Alternar tema no celular"
                  >
                    {darkMode ? <Sun size={13} color="#f59e0b" /> : <Moon size={13} />}
                  </button>
                </div>
              </div>

              {/* Profile Strip */}
              {phoneRole === 'PROFESSIONAL' && (
                <div className="phone-profile-strip">
                  <img src={activeDoc.avatar} alt={activeDoc.name} className="phone-avatar" />
                  <div className="phone-prof-info">
                    <div className="phone-prof-name">{activeDoc.name}</div>
                    <div className="phone-prof-role">{activeDoc.crm || activeDoc.councilNumber} • {activeDoc.profession}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Phone Body Content */}
            <div className="phone-content">
              {/* Tab 1: Route Screen */}
              {phoneTab === 'route' && (
                <>
                  <div className="phone-kpi-grid">
                    <div className="phone-kpi-card">
                      <span className="phone-kpi-val">{completedCount}/{totalCount}</span>
                      <span className="phone-kpi-lbl">Sessões</span>
                    </div>
                    <div className="phone-kpi-card">
                      <span className="phone-kpi-val">{totalKm} km</span>
                      <span className="phone-kpi-lbl">Distância</span>
                    </div>
                    <div className="phone-kpi-card">
                      <span className="phone-kpi-val">{inProgressApt ? '1 Ativa' : 'Em Rota'}</span>
                      <span className="phone-kpi-lbl">Status</span>
                    </div>
                  </div>

                  <div className="phone-banner">
                    <ShieldCheck size={18} color="#0d9488" />
                    <span className="phone-banner-text">
                      <strong>Geofencing 150m Ativo:</strong> Check-in auditado por satélite antes de iniciar a sessão.
                    </span>
                  </div>

                  {/* Appointments List */}
                  {appointments.slice(0, 5).map((apt, idx) => {
                    const pat = getPatient(apt.patientId);
                    const isDone = apt.status === 'completed';
                    const isInProgress = apt.status === 'in_progress';

                    return (
                      <div key={apt.id} className={`phone-apt-card ${isInProgress ? 'in-progress' : ''}`}>
                        <div className="phone-apt-header">
                          <div className="phone-apt-time">
                            <Clock size={12} />
                            <span>{apt.time || '10:00'}</span>
                          </div>
                          <span className={`phone-status-tag ${apt.status || 'scheduled'}`}>
                            {isDone ? 'Concluído' : isInProgress ? 'Em Atendimento' : 'Agendado'}
                          </span>
                        </div>

                        <div className="phone-patient-name">{idx + 1}. {pat.name}</div>
                        <div className="phone-procedure">{apt.type || 'Fisioterapia Domiciliar'}</div>
                        <div className="phone-address">
                          <MapPin size={11} />
                          <span>{pat.address}</span>
                        </div>

                        {apt.checkIn && (
                          <div style={{ fontSize: '9px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle size={10} />
                            <span>Auditado por satélite: {apt.checkIn.distanceMeters}m ({apt.checkIn.status})</span>
                          </div>
                        )}

                        <div className="phone-card-actions">
                          <button
                            className="phone-btn"
                            onClick={() => {
                              window.open(`https://maps.google.com/?q=${encodeURIComponent(pat.address)}`, '_blank');
                            }}
                          >
                            <Navigation size={11} />
                            <span>GPS</span>
                          </button>

                          <button
                            className="phone-btn"
                            onClick={() => {
                              setSelectedPatientForPEP(pat);
                              setPhoneTab('pep');
                            }}
                          >
                            <FileText size={11} />
                            <span>PEP</span>
                          </button>

                          <button
                            className={`phone-btn ${isInProgress ? 'warning' : 'primary'}`}
                            onClick={() => setSelectedAptForCheckIn(apt)}
                          >
                            <MapPin size={11} />
                            <span>{isInProgress ? 'Check-out' : isDone ? 'Revê GPS' : 'Check-in'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Tab 2: PEP SOAP Screen */}
              {phoneTab === 'pep' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800 }}>Paciente Selecionado:</div>
                    <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: 700 }}>{selectedPatientForPEP?.name || 'Selecione um paciente'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{selectedPatientForPEP?.address}</div>
                  </div>

                  {/* Sinais Vitais */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>PA</div>
                      <input
                        type="text"
                        value={pepVitals.bp}
                        onChange={(e) => setPepVitals({ ...pepVitals, bp: e.target.value })}
                        style={{ width: '100%', fontSize: '10px', textAlign: 'center', border: 'none', background: 'transparent' }}
                      />
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>FC</div>
                      <input
                        type="text"
                        value={pepVitals.hr}
                        onChange={(e) => setPepVitals({ ...pepVitals, hr: e.target.value })}
                        style={{ width: '100%', fontSize: '10px', textAlign: 'center', border: 'none', background: 'transparent' }}
                      />
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>SpO2</div>
                      <input
                        type="text"
                        value={pepVitals.spo2}
                        onChange={(e) => setPepVitals({ ...pepVitals, spo2: e.target.value })}
                        style={{ width: '100%', fontSize: '10px', textAlign: 'center', border: 'none', background: 'transparent' }}
                      />
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '4px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Temp</div>
                      <input
                        type="text"
                        value={pepVitals.temp}
                        onChange={(e) => setPepVitals({ ...pepVitals, temp: e.target.value })}
                        style={{ width: '100%', fontSize: '10px', textAlign: 'center', border: 'none', background: 'transparent' }}
                      />
                    </div>
                  </div>

                  {/* SOAP Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700 }}>S - Subjetivo (Queixa do Paciente)</div>
                    <textarea
                      rows={2}
                      value={pepSubjective}
                      onChange={(e) => setPepSubjective(e.target.value)}
                      placeholder="Relato de tosse, dores ou disposição..."
                      style={{ width: '100%', padding: '6px', fontSize: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700 }}>P - Plano & Conduta</span>
                      <button
                        onClick={() => {
                          setShowAiRAG(true);
                          setPepPlan('1. Exercícios respiratórios ativos assistidos 2x/dia.\n2. Trocas posturais a cada 2h no leito.\n3. Monitoramento de SpO2 pós-esforço.');
                        }}
                        style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '999px', background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Sparkles size={10} /> Copiloto RAG
                      </button>
                    </div>

                    {showAiRAG && (
                      <div style={{ background: '#ecfdf5', padding: '6px', borderRadius: '6px', fontSize: '9px', color: '#047857', border: '1px solid #a7f3d0' }}>
                        ✓ Sugestão RAG aplicada: Diretrizes de Mobilização Leito (EMAD Nível 2).
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={pepPlan}
                      onChange={(e) => setPepPlan(e.target.value)}
                      placeholder="Orientações e prescrição de cuidados..."
                      style={{ width: '100%', padding: '6px', fontSize: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface)' }}
                    />

                    <button
                      onClick={handleSavePEP}
                      style={{ background: '#0d9488', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                    >
                      Salvar no Prontuário
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Scale Manager Screen */}
              {phoneTab === 'scale' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', gap: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488' }}>Escala Operacional Mensal</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Travas ativas: Regra do Care Team Restrito</div>
                    <div style={{ fontSize: '9.5px', marginTop: '4px', color: 'var(--text-headline)' }}>
                      Total de <strong>{appointments.length} atendimentos</strong> programados na clínica.
                    </div>
                  </div>

                  {appointments.slice(0, 4).map((apt) => {
                    const pat = getPatient(apt.patientId);
                    return (
                      <div key={apt.id} style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700 }}>{pat.name}</div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{apt.time} • {apt.type}</div>
                        </div>
                        <span style={{ fontSize: '9px', background: '#ecfdf5', color: '#10b981', padding: '2px 6px', borderRadius: '999px', fontWeight: 700 }}>
                          Care Team OK
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 4: Financial Screen */}
              {phoneTab === 'financial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Faturamento Domiciliar Previsto</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-headline)', marginTop: '2px' }}>R$ 1.840,00</div>
                    <div style={{ fontSize: '9px', color: '#10b981', marginTop: '4px' }}>✓ 100% dos repasses auditados por GPS</div>
                  </div>

                  <div style={{ fontSize: '10px', fontWeight: 800, marginTop: '4px' }}>Matriz 3D (Profissional x Paciente x Endereço):</div>
                  {appointments.slice(0, 3).map((apt) => {
                    const pat = getPatient(apt.patientId);
                    return (
                      <div key={apt.id} style={{ background: 'var(--bg-surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '9.5px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <strong>{pat.name}</strong>
                          <div style={{ color: 'var(--text-muted)', fontSize: '8.5px' }}>{pat.address}</div>
                        </div>
                        <div style={{ textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>
                          R$ 198,00
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* In-Phone Geofencing Check-in Modal */}
            {selectedAptForCheckIn && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end',
                padding: '8px'
              }}>
                <div style={{
                  background: 'var(--bg-surface)',
                  borderRadius: '16px',
                  width: '100%',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800 }}>Validação Espacial (Geofencing)</div>
                    <button onClick={() => setSelectedAptForCheckIn(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: isWithinGeofence ? '#ecfdf5' : '#fffbeb',
                    border: `1px solid ${isWithinGeofence ? '#a7f3d0' : '#fde68a'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {isWithinGeofence ? <CheckCircle size={18} color="#10b981" /> : <AlertTriangle size={18} color="#f59e0b" />}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: isWithinGeofence ? '#047857' : '#b45309' }}>
                        {isWithinGeofence ? 'DENTRO DO DOMICÍLIO' : 'FORA DO PERÍMETRO'}
                      </div>
                      <div style={{ fontSize: '10px' }}>Distância: <strong>{distanceMeters}m</strong> (tolerância: 150m)</div>
                    </div>
                  </div>

                  {/* Sim Buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setCheckInSimMode('near')}
                      style={{ flex: 1, padding: '4px', fontSize: '9px', borderRadius: '6px', border: '1px solid var(--border-light)', background: checkInSimMode === 'near' ? '#0d9488' : 'var(--bg-surface)', color: checkInSimMode === 'near' ? '#ffffff' : 'inherit', cursor: 'pointer' }}
                    >
                      No Local (18m)
                    </button>
                    <button
                      onClick={() => setCheckInSimMode('far')}
                      style={{ flex: 1, padding: '4px', fontSize: '9px', borderRadius: '6px', border: '1px solid var(--border-light)', background: checkInSimMode === 'far' ? '#f59e0b' : 'var(--bg-surface)', color: checkInSimMode === 'far' ? '#ffffff' : 'inherit', cursor: 'pointer' }}
                    >
                      Distante (485m)
                    </button>
                  </div>

                  {!isWithinGeofence && (
                    <input
                      type="text"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Justificativa clínica obrigatória..."
                      style={{ padding: '6px', fontSize: '10px', borderRadius: '6px', border: '1px solid #f87171' }}
                    />
                  )}

                  {selectedAptForCheckIn.status === 'in_progress' ? (
                    <button
                      onClick={handleConfirmCheckOut}
                      style={{ background: '#f59e0b', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Finalizar Sessão (Check-out)
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmCheckIn}
                      style={{ background: '#0d9488', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Confirmar Check-in
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Tab Bar in Phone */}
            <div className="phone-bottom-nav">
              {phoneRole === 'PROFESSIONAL' ? (
                <>
                  <div
                    className={`phone-tab-item ${phoneTab === 'route' ? 'active' : ''}`}
                    onClick={() => setPhoneTab('route')}
                  >
                    <Car size={16} />
                    <span>Rota</span>
                  </div>

                  <div
                    className={`phone-tab-item ${phoneTab === 'pep' ? 'active' : ''}`}
                    onClick={() => setPhoneTab('pep')}
                  >
                    <FileText size={16} />
                    <span>PEP</span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={`phone-tab-item ${phoneTab === 'scale' ? 'active' : ''}`}
                    onClick={() => setPhoneTab('scale')}
                  >
                    <Calendar size={16} />
                    <span>Escala</span>
                  </div>

                  <div
                    className={`phone-tab-item ${phoneTab === 'financial' ? 'active' : ''}`}
                    onClick={() => setPhoneTab('financial')}
                  >
                    <DollarSign size={16} />
                    <span>Financeiro</span>
                  </div>
                </>
              )}
            </div>

            {/* Home Bar Indicator */}
            <div className="phone-home-indicator"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
