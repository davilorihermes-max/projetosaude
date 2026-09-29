// src/components/NewPatientModal.jsx
import React, { useState } from 'react';
import { X, UserPlus, Heart, Shield } from 'lucide-react';

export default function NewPatientModal({ isOpen, onClose, onSavePatient }) {
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [gender, setGender] = useState('Feminino');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [insurance, setInsurance] = useState('Unimed Pleno');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [bloodType, setBloodType] = useState('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('1.70');
  const [address, setAddress] = useState('');
  const [caregiver, setCaregiver] = useState('');
  const [accessNotes, setAccessNotes] = useState('');
  const [mobilityStatus, setMobilityStatus] = useState('Deambula sem auxílio');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !cpf || !phone || !address) return;

    // Calculate approximate age
    const birthYear = new Date(birthDate).getFullYear();
    const age = 2026 - birthYear;

    const allergies = allergiesText
      ? allergiesText.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Nenhuma conhecida'];

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
      caregiver,
      accessNotes,
      mobilityStatus,
      bloodType,
      allergies,
      weight: parseFloat(weight) || 70,
      height: parseFloat(height) || 1.70,
      chronicConditions: [],
      vitalsHistory: [
        {
          date: 'Hoje',
          bpSystolic: 120,
          bpDiastolic: 80,
          hr: 72,
          temp: 36.5,
          spo2: 98
        }
      ],
      avatar: gender === 'Masculino'
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    };

    onSavePatient(newPatient);
    onClose();
  };

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
                placeholder="Ex: Ana Clara Barbosa"
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
                <label className="form-label">Sexo Biológico</label>
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
                  placeholder="(11) 90000-0000"
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '1rem' }}>
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

              <div className="form-group">
                <label className="form-label">Tipo Sanguíneo</label>
                <select className="form-select" value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Peso Inicial (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Altura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>

              <div className="form-group">
                <label className="form-label">Endereço Residencial Completo (Domicílio) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Rua Oscar Freire, 1200 - Apto 42, Pinheiros - São Paulo"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Cuidador(a) Responsável e Contato</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Dona Maria (Mãe) - (11) 98888-7777"
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

              <div className="form-group">
                <label className="form-label" style={{ color: '#e11d48' }}>
                  Alergias Medicamentosas ou Alimentares (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Penicilina, Sulfa, Frutos do mar..."
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
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
