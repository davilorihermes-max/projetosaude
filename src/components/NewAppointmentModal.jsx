// src/components/NewAppointmentModal.jsx
import React, { useState } from 'react';
import { X, CalendarPlus, Clock, MapPin, User, Navigation } from 'lucide-react';

export default function NewAppointmentModal({
  isOpen,
  onClose,
  patients = [],
  doctors = [],
  onSaveAppointment,
  initialPatientId = null,
  initialTime = '09:00'
}) {
  const [patientId, setPatientId] = useState(initialPatientId || patients[0]?.id || '');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [date, setDate] = useState('2026-09-28');
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState('Sessão Médica Domiciliar');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedPatient = patients.find((p) => p.id === patientId) || patients[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !time) return;

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
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarPlus size={20} color="var(--primary)" /> Agendar Nova Sessão Domiciliar
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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
                      {d.name} ({d.specialty.split('&')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Sessão Domiciliar</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Sessão Médica Domiciliar">Sessão Médica Domiciliar</option>
                  <option value="Curativo Especial & Estomaterapia">Curativo Especial & Estomaterapia</option>
                  <option value="Fisioterapia Motora no Leito">Fisioterapia Motora no Leito</option>
                  <option value="Reabilitação Respiratória">Reabilitação Respiratória</option>
                  <option value="Visita de Enfermagem / Cuidados Paliativos">Visita de Enfermagem / Cuidados Paliativos</option>
                  <option value="Avaliação Inicial para Home Care">Avaliação Inicial para Home Care</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Data da Visita *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário de Início *</label>
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

            {selectedPatient && (
              <div style={{ background: 'var(--bg-page)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginBottom: '1rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700 }}>
                  <MapPin size={15} /> Endereço Residencial:
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmar Sessão na Rota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
