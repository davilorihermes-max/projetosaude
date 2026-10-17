// src/components/NewPatientModal.jsx
import React, { useState } from 'react';
import { X, UserPlus, Shield, MapPin } from 'lucide-react';
import { resolveAddressCoordinates } from '../services/geocodingService';

export default function NewPatientModal({ isOpen, onClose, onSavePatient }) {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [gender, setGender] = useState('Feminino');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('Unimed Pleno');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [address, setAddress] = useState('');
  const [patientCoordinates, setPatientCoordinates] = useState({ latitude: -23.585, longitude: -46.638 });
  const [resolvedLocationName, setResolvedLocationName] = useState('');
  const [caregiver, setCaregiver] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [mobilityStatus, setMobilityStatus] = useState('Deambula sem auxílio');

  const [isGeocoding, setIsGeocoding] = useState(false);

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
      } catch {} finally {
        setIsGeocoding(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !cpf || !phone || !address) return;

    // Calculate approximate age
    const birthYear = new Date(birthDate).getFullYear();
    const age = 2026 - birthYear;

    let coords = patientCoordinates;
    try {
      const resolved = await resolveAddressCoordinates(address);
      if (resolved && resolved.latitude && resolved.longitude) {
        coords = { latitude: resolved.latitude, longitude: resolved.longitude };
      }
    } catch {}

    const newPatient = {
      id: `pat-${Date.now()}`,
      name,
      cpf,
      birthDate,
      age: Math.max(1, age),
      gender,
      phone,
      email,
      insurance,
      insuranceNumber: insuranceNumber || 'PART-000',
      address,
      latitude: coords.latitude,
      longitude: coords.longitude,
      caregiver,
      accessNotes,
      mobilityStatus,
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="var(--primary)" /> Cadastrar Novo Paciente
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nome Completo do Paciente *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Nome completo do paciente"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Convênio</label>
                <select className="form-select" value={insurance} onChange={(e) => setInsurance(e.target.value)}>
                  <option value="Particular">Particular</option>
                  <option value="Unimed Pleno">Unimed Pleno</option>
                  <option value="Bradesco Saúde Top">Bradesco Saúde Top</option>
                  <option value="SulAmérica Exato">SulAmérica Exato</option>
                  <option value="Amil Fácil">Amil Fácil</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nº Carteirinha</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Número de matrícula"
                  value={insuranceNumber}
                  onChange={(e) => setInsuranceNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Endereço Residencial Completo (Domicílio) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Rua, número, bairro e cidade"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={11} /> {resolvedLocationName || (isGeocoding ? 'Localizando endereço...' : 'Georreferenciamento automático')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {patientCoordinates.latitude.toFixed(4)}, {patientCoordinates.longitude.toFixed(4)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Cuidador(a) Responsável e Contato</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome do responsável e telefone"
                  value={caregiver}
                  onChange={(e) => setCaregiver(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status de Mobilidade</label>
                <select className="form-select" value={mobilityStatus} onChange={(e) => setMobilityStatus(e.target.value)}>
                  <option value="Deambula sem auxílio">Deambula sem auxílio</option>
                  <option value="Deambula com andador / bengala">Deambula com andador / bengala</option>
                  <option value="Cadeirante">Cadeirante</option>
                  <option value="Restrito ao leito (Acamado)">Restrito ao leito (Acamado)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Instruções de Acesso ao Domicílio</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Interfone 42, portão automático, vaga de visitante autorizada..."
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Cadastrar Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
