// src/components/NewPatientModal.jsx
import React, { useState, useEffect } from 'react';
import { X, UserPlus, MapPin, Stethoscope, Plus, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { resolveAddressCoordinates } from '../services/geocodingService';

export const THERAPY_OPTIONS = [
  'Fisioterapia Cardiorrespiratória & Motora',
  'Fisioterapia Motora & Neuroreabilitação',
  'Fonoaudiologia Domiciliar',
  'Enfermagem Estomaterapeuta & Curativos',
  'Terapia Ocupacional Domiciliar'
];

export default function NewPatientModal({
  isOpen,
  onClose,
  onSavePatient,
  doctors = [],
  initialPatientData = null
}) {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [gender, setGender] = useState('Feminino');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [patientCoordinates, setPatientCoordinates] = useState({ latitude: -23.585, longitude: -46.638 });
  const [resolvedLocationName, setResolvedLocationName] = useState('');
  const [caregiver, setCaregiver] = useState('');

  // Demandas Terapêuticas cadastradas diretamente no perfil do paciente
  const [demands, setDemands] = useState([
    {
      id: `dem-1`,
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning'
    }
  ]);

  // Care Team do paciente selecionado a partir dos profissionais cadastrados
  const [selectedCareTeamIds, setSelectedCareTeamIds] = useState([]);

  const [isGeocoding, setIsGeocoding] = useState(false);

  // Inicializa dados se for modo de edição ou reset se novo
  useEffect(() => {
    if (initialPatientData) {
      setName(initialPatientData.name || '');
      setCpf(initialPatientData.cpf || '');
      setBirthDate(initialPatientData.birthDate || '1990-01-01');
      setGender(initialPatientData.gender || 'Feminino');
      setPhone(initialPatientData.phone || '');
      setEmail(initialPatientData.email || '');
      setAddress(initialPatientData.address || '');
      if (initialPatientData.latitude && initialPatientData.longitude) {
        setPatientCoordinates({
          latitude: initialPatientData.latitude,
          longitude: initialPatientData.longitude
        });
      }
      setCaregiver(initialPatientData.caregiver || '');
      if (initialPatientData.demands && initialPatientData.demands.length > 0) {
        setDemands(initialPatientData.demands);
      }
      const initialTeam = initialPatientData.careTeamProfessionalIds ||
        initialPatientData.careTeamMembers?.map((m) => m.professionalId || m) || [];
      setSelectedCareTeamIds(initialTeam);
    } else {
      setName('');
      setCpf('');
      setBirthDate('1990-01-01');
      setGender('Feminino');
      setPhone('');
      setEmail('');
      setAddress('');
      setPatientCoordinates({ latitude: -23.585, longitude: -46.638 });
      setResolvedLocationName('');
      setCaregiver('');
      setDemands([
        {
          id: `dem-${Date.now()}-1`,
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'morning'
        }
      ]);
      setSelectedCareTeamIds([]);
    }
  }, [initialPatientData, isOpen]);

  const handleAddressChange = async (val) => {
    setAddress(val);
    if (val && val.trim().length >= 3) {
      setIsGeocoding(true);
      try {
        const coords = await resolveAddressCoordinates(val);
        if (coords && coords.latitude && coords.longitude) {
          setPatientCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
          setResolvedLocationName(coords.matched || coords.city || 'Localização identificada');
        }
      } catch {
      } finally {
        setIsGeocoding(false);
      }
    }
  };

  // Gerenciamento de Demandas Terapêuticas
  const handleAddDemand = () => {
    const newDemand = {
      id: `dem-${Date.now()}-${demands.length + 1}`,
      therapyType: THERAPY_OPTIONS[demands.length % THERAPY_OPTIONS.length],
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning'
    };
    setDemands([...demands, newDemand]);
  };

  const handleUpdateDemand = (index, field, value) => {
    const updated = [...demands];
    updated[index] = {
      ...updated[index],
      [field]: field === 'sessionsPerWeek' || field === 'durationMinutes' ? Number(value) : value
    };
    setDemands(updated);
  };

  const handleRemoveDemand = (index) => {
    if (demands.length <= 1) return;
    setDemands(demands.filter((_, idx) => idx !== index));
  };

  // Alternar membro do Care Team
  const handleToggleCareTeamDoctor = (docId) => {
    setSelectedCareTeamIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ÚNICA informação obrigatória: Nome Completo do Paciente!
    if (!name || !name.trim()) return;

    // Calcular idade aproximada se houver data de nascimento
    const birthYear = birthDate ? new Date(birthDate).getFullYear() : 1990;
    const age = 2026 - birthYear;

    let coords = patientCoordinates;
    if (address && address.trim()) {
      try {
        const resolved = await resolveAddressCoordinates(address);
        if (resolved && resolved.latitude && resolved.longitude) {
          coords = { latitude: resolved.latitude, longitude: resolved.longitude };
        }
      } catch {}
    }

    const patientId = initialPatientData?.id || `pat-${Date.now()}`;

    const newPatient = {
      id: patientId,
      name: name.trim(),
      cpf: cpf.trim() || `000.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-00`,
      birthDate: birthDate || '1990-01-01',
      age: Math.max(1, age || 35),
      gender: gender || 'Feminino',
      phone: phone.trim() || '',
      email: email.trim() || '',
      address: address.trim() || 'São Paulo - SP',
      latitude: coords.latitude,
      longitude: coords.longitude,
      caregiver: caregiver.trim() || '',
      demands: demands.length > 0 ? demands : [
        {
          id: `dem-${patientId}-1`,
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'morning'
        }
      ],
      careTeamProfessionalIds: selectedCareTeamIds,
      careTeamMembers: selectedCareTeamIds.map((profId) => ({
        professionalId: profId,
        role: 'PRIMARY_CARE',
        active: true
      })),
      avatar: gender === 'Masculino'
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    };

    onSavePatient(newPatient);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="var(--primary)" />
            {initialPatientData ? 'Editar Cadastro do Paciente' : 'Cadastrar Novo Paciente'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Aviso informativo de campo obrigatório único */}
            <div style={{
              background: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.8rem',
              color: 'var(--text-headline)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={18} color="var(--primary)" />
              <span>
                <strong>Atenção:</strong> Apenas o <strong>Nome Completo</strong> é obrigatório. Todos os demais dados cadastrais são opcionais.
              </span>
            </div>

            {/* 1. Nome Completo (Único obrigatório) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Nome Completo do Paciente * <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>(Obrigatório)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Carlos Eduardo de Oliveira"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* 2. Dados Pessoais Opcionais */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">CPF (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sexo</label>
                <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Feminino">Feminino</option>
                  <option value="Masculino">Masculino</option>
                </select>
              </div>
            </div>

            {/* 3. Contatos e Cuidador (Opcionais) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Telefone / WhatsApp</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="(11) 90000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="paciente@exemplo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cuidador(a) Responsável / Familiar</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Dona Maria (Mãe) - (11) 98888-7777"
                value={caregiver}
                onChange={(e) => setCaregiver(e.target.value)}
              />
            </div>

            {/* 4. Endereço Residencial com Mapa Integrado */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Endereço Residencial (Domicílio de Atendimento)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Rua Vergueiro, 1500, Vila Mariana, São Paulo - SP"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
              />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '0.35rem',
                fontSize: '0.75rem'
              }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} /> {resolvedLocationName || (isGeocoding ? 'Localizando endereço no mapa...' : 'Georreferenciamento de rota')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Lat: {patientCoordinates.latitude.toFixed(4)}, Lon: {patientCoordinates.longitude.toFixed(4)}
                </span>
              </div>

              {/* PEQUENO MAPA ABAIXO DO ENDEREÇO RESIDENCIAL */}
              <div style={{
                marginTop: '0.65rem',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
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
                  <span>🗺️ Localização Residencial Mapeada</span>
                  <span>OpenStreetMap Satélite/Vias</span>
                </div>
                <iframe
                  title="Mapa Residencial do Paciente"
                  width="100%"
                  height="160"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${patientCoordinates.longitude - 0.008}%2C${patientCoordinates.latitude - 0.006}%2C${patientCoordinates.longitude + 0.008}%2C${patientCoordinates.latitude + 0.006}&layer=mapnik&marker=${patientCoordinates.latitude}%2C${patientCoordinates.longitude}`}
                />
              </div>
            </div>

            {/* 5. Demandas Terapêuticas do Paciente (fazem parte do cadastro do paciente) */}
            <div style={{
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-headline)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Stethoscope size={16} color="var(--primary)" />
                    Demandas Terapêuticas do Paciente ({demands.length})
                  </h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    As demandas cadastradas aqui alimentam automaticamente a escala mensal inteligente.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={handleAddDemand}
                >
                  <Plus size={13} /> Adicionar Terapia
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {demands.map((demand, idx) => (
                  <div
                    key={demand.id || idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--primary)' }}>
                        #{idx + 1} Especialidade
                      </span>
                      {demands.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ color: 'var(--danger)', padding: '2px' }}
                          title="Remover terapia"
                          onClick={() => handleRemoveDemand(idx)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.82rem' }}
                        value={demand.therapyType}
                        onChange={(e) => handleUpdateDemand(idx, 'therapyType', e.target.value)}
                      >
                        {THERAPY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Frequência Semanal</label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8rem' }}
                          value={demand.sessionsPerWeek}
                          onChange={(e) => handleUpdateDemand(idx, 'sessionsPerWeek', e.target.value)}
                        >
                          <option value={1}>1x por semana</option>
                          <option value={2}>2x por semana</option>
                          <option value={3}>3x por semana</option>
                          <option value={4}>4x por semana</option>
                          <option value={5}>5x por semana</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Turno Preferencial</label>
                        <select
                          className="form-select"
                          style={{ fontSize: '0.8rem' }}
                          value={demand.preferredShift}
                          onChange={(e) => handleUpdateDemand(idx, 'preferredShift', e.target.value)}
                        >
                          <option value="morning">Manhã</option>
                          <option value="afternoon">Tarde</option>
                          <option value="any">Qualquer horário</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Care Team do Paciente (Profissionais Cadastrados) */}
            <div style={{
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-headline)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="var(--primary)" />
                Equipe Autorizada (Care Team do Paciente)
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Selecione os profissionais autorizados a atender este paciente (profissionais com conta no site ou cadastrados para a escala).
              </p>

              {doctors.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem', textAlign: 'center' }}>
                  Nenhum profissional cadastrado no sistema ainda. Você pode cadastrar fisioterapeutas no Planejador Mensal ou na aba de Equipe.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
                  {doctors.map((doc) => {
                    const isSelected = selectedCareTeamIds.includes(doc.id);
                    const hasAccount = doc.hasAccount !== false && (doc.userId || doc.email);

                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleCareTeamDoctor(doc.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                          background: isSelected ? 'var(--primary-subtle)' : 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-light)'}`,
                            background: isSelected ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
                            {isSelected && <CheckCircle2 size={14} color="#ffffff" />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-headline)' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {doc.specialty || doc.profession || 'Profissional de Saúde'}
                            </div>
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          background: hasAccount ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                          color: hasAccount ? 'var(--primary)' : 'var(--text-muted)'
                        }}>
                          {hasAccount ? 'Com Conta' : 'Sem Conta'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
              {initialPatientData ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
