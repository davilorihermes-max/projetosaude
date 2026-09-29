// src/components/NewAppointmentModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  CalendarPlus,
  Clock,
  MapPin,
  Car,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NewAppointmentModal({
  isOpen,
  onClose,
  patients = [],
  doctors = [],
  onSaveAppointment,
  initialPatientId = null,
  initialTime = '14:00'
}) {
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || '');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState('2026-09-28');
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState('Sessão Médica Domiciliar');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');

  // Live evaluation state
  const [viability, setViability] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialPatientId) setPatientId(initialPatientId);
      if (initialTime) setTime(initialTime);
      setSubmitError('');
    }
  }, [isOpen, initialPatientId, initialTime]);

  // Live check with backend scheduler evaluation
  useEffect(() => {
    if (!isOpen || !patientId || !doctorId || !date || !time) return;

    let isMounted = true;
    const evaluateLive = async () => {
      setEvaluating(true);
      try {
        const token = localStorage.getItem('omnihome_jwt');
        const proposedIso = `${date}T${time}:00.000Z`;

        const res = await fetch('http://localhost:3001/api/scheduler/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            professionalId: doctorId,
            patientId,
            proposedTime: proposedIso,
            durationMinutes: Number(durationMinutes) || 45
          })
        });

        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          setViability(data.report || null);
        } else if (res.status === 401) {
          setViability({
            unauthenticated: true,
            viable: true,
            reason: 'Autenticação necessária para validação estrita no servidor.'
          });
        } else {
          const data = await res.json().catch(() => ({}));
          setViability({
            viable: false,
            reason: data.message || 'Restrição detectada no servidor.'
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setViability(null);
      } finally {
        if (isMounted) setEvaluating(false);
      }
    };

    const timer = setTimeout(evaluateLive, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, patientId, doctorId, date, time, durationMinutes]);

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === patientId) || patients[0];
  const selectedDoctor = doctors.find((d) => d.id === doctorId) || doctors[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !time) return;

    setSaving(true);
    setSubmitError('');

    const token = localStorage.getItem('omnihome_jwt');
    const proposedIso = `${date}T${time}:00.000Z`;

    try {
      // 1. Persist in database if token is available
      if (token) {
        const res = await fetch('http://localhost:3001/api/scheduler/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            professionalId: doctorId,
            patientId,
            scheduledTime: proposedIso,
            durationMinutes: Number(durationMinutes) || 45,
            notes
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || 'Falha ao agendar sessão no servidor.');
        }
      }

      // 2. Add to frontend state
      const newApt = {
        id: `apt-${Date.now()}`,
        patientId,
        doctorId,
        date,
        time,
        type,
        durationMinutes: Number(durationMinutes) || 45,
        address: selectedPatient?.address || 'São Paulo - SP',
        notes,
        status: 'scheduled'
      };

      onSaveAppointment(newApt);

      // Trigger celebratory confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });

      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Erro ao agendar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CalendarPlus size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
                Agendar Nova Sessão Domiciliar
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Validação geodésica em tempo real & conformidade com Care Team
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {submitError && (
              <div
                style={{
                  background: 'var(--danger-subtle)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ShieldAlert size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Paciente a ser Atendido no Domicílio *</label>
              <select
                className="form-select"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.address ? `(${p.address})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Profissional em Rota *</label>
                <select
                  className="form-select"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} • {d.profession || 'Especialista'} ({d.councilNumber || d.crm || d.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Sessão / Procedimento Clínico *</label>
                <input
                  type="text"
                  list="session-types-datalist"
                  className="form-input"
                  placeholder="Selecione ou digite qualquer tipo de atendimento (Ex: Ventilação Mecânica, Quimioterapia, Fisioterapia ELA, GTT...)"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  required
                />
                <datalist id="session-types-datalist">
                  {/* Alta Complexidade & Terapia Intensiva Domiciliar */}
                  <option value="Manejo de Ventilação Mecânica Invasiva & Aspiração Traqueal" />
                  <option value="Fisioterapia Cardiorrespiratória & Desmame Ventilatório" />
                  <option value="Troca e Cuidados de Cânula de Traqueostomia com Cuff" />
                  <option value="Cuidados com Gastrostomia (GTT) & Sonda Nasoenteral (SNE)" />
                  <option value="Manejo de Terapia Nutricional Parenteral Total (NPT)" />
                  {/* Terapias Infusionais, Oncologia & Cuidados Paliativos */}
                  <option value="Quimioterapia & Terapia Biológica Infusional no Domicílio" />
                  <option value="Punção, Heparinização e Curativo de Port-a-Cath / PICC" />
                  <option value="Cuidados Paliativos Domiciliares & Hipodermóclise Contínua" />
                  <option value="Manejo de Sintomas Refratários & Controle Álgico" />
                  {/* Reabilitação Neurofuncional & Doenças Raras */}
                  <option value="Cinesioterapia Motora em Doença Neurodegenerativa (ELA / AME)" />
                  <option value="Reabilitação Neurofuncional Intensiva (Pós-AVC / TCE Grave)" />
                  <option value="Estimulação Precoce & Fisioterapia Neuropediátrica" />
                  <option value="Reabilitação de Deglutição (Disfagia) & Treino de Fala (Fonoaudiologia)" />
                  <option value="Comunicação Alternativa e Aumentativa (CAA / Fonoaudiologia)" />
                  {/* Enfermagem & Feridas Complexas */}
                  <option value="Curativo de Alta Complexidade & Terapia por Pressão Negativa (V.A.C.)" />
                  <option value="Desbridamento Instrumental / Enzimático de Lesão por Pressão Grau IV" />
                  <option value="Tratamento Avançado de Pé Diabético & Úlceras Vasculogênicas" />
                  <option value="Manejo e Troca de Bolsa de Estomia (Colostomia / Ileostomia)" />
                  {/* Avaliação Multidisciplinar & Apoio */}
                  <option value="Avaliação Nutricional Clínica & Cálculo Calórico Domiciliar" />
                  <option value="Sessão de Psicoterapia Domiciliar & Apoio à Família / Cuidador" />
                  <option value="Terapia Ocupacional, Tecnologia Assistiva & Adaptação no Lar" />
                  <option value="Consulta Médica Domiciliar Especializada & Prescrição Global" />
                  <option value="Avaliação Multidisciplinar Inicial para Internação Domiciliar" />
                </datalist>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Data da Sessão *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário de Chegada *</label>
                <input
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duração Prevista</label>
                <select
                  className="form-select"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                >
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h30 (Complexo)</option>
                </select>
              </div>
            </div>

            {/* Live Scheduler Viability Feedback Card */}
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                border: viability?.viable
                  ? '1px solid var(--success-border)'
                  : viability?.viable === false
                  ? '1px solid var(--danger-border)'
                  : '1px solid var(--border-color)',
                background: viability?.viable
                  ? 'var(--success-subtle)'
                  : viability?.viable === false
                  ? 'var(--danger-subtle)'
                  : 'var(--bg-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  {evaluating ? (
                    <span style={{ color: 'var(--text-muted)' }}>Calculando viabilidade geodésica...</span>
                  ) : viability?.viable ? (
                    <>
                      <CheckCircle2 size={16} color="var(--success)" />
                      <span style={{ color: 'var(--success)' }}>Horário 100% Viável na Rota</span>
                    </>
                  ) : viability?.viable === false ? (
                    <>
                      <AlertTriangle size={16} color="var(--danger)" />
                      <span style={{ color: 'var(--danger)' }}>Bloqueio de Rota / Restrição</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Pronto para validação</span>
                  )}
                </div>

                {viability?.distanceKm && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    📍 {viability.distanceKm.toFixed(1)} km de deslocamento
                  </span>
                )}
              </div>

              {viability?.viable && viability?.transitTimeMinutes && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Car size={14} color="var(--primary)" />
                  <span>
                    Trânsito urbano estimado: <strong>~{viability.transitTimeMinutes} min</strong>.
                    {viability.estimatedTravelWindow?.departureTime && (
                      <> Saída sugerida às <strong>{new Date(viability.estimatedTravelWindow.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.</>
                    )}
                  </span>
                </div>
              )}

              {viability?.viable === false && viability?.reason && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 500 }}>
                  Motivo: {viability.reason}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div
                style={{
                  background: 'var(--bg-page)',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  marginBottom: '1rem',
                  fontSize: '0.825rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700 }}>
                  <MapPin size={15} /> Endereço Residencial do Paciente:
                </div>
                <div style={{ marginTop: '0.2rem' }}>{selectedPatient.address}</div>
                {selectedPatient.accessNotes && (
                  <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    🔑 Acesso: {selectedPatient.accessNotes}
                  </div>
                )}
                {selectedPatient.caregiver && (
                  <div style={{ color: 'var(--text-body)', marginTop: '0.2rem' }}>
                    👤 Contato Cuidador(a): {selectedPatient.caregiver}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Orientações de Deslocamento / Notas da Sessão</label>
              <textarea
                className="form-textarea"
                placeholder="Ex: Levar maleta de curativo estéril e oxímetro de pulso calibrado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || viability?.viable === false}
              style={{
                opacity: viability?.viable === false ? 0.6 : 1,
                cursor: viability?.viable === false ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Gravando no Prisma...' : 'Confirmar Sessão na Rota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
