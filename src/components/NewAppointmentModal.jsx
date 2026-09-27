// src/components/NewAppointmentModal.jsx
import React, { useState } from 'react';
import { X, CalendarPlus, Clock, Video, User } from 'lucide-react';

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
  const [date, setDate] = useState('2026-09-27');
  const [time, setTime] = useState(initialTime);
  const [type, setType] = useState('Consulta de Rotina');
  const [modality, setModality] = useState('Presencial');
  const [room, setRoom] = useState('Consultório 01');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

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
      modality,
      room,
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
            <CalendarPlus size={20} color="var(--primary)" /> Novo Agendamento de Consulta
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Paciente *</label>
              <select
                className="form-select"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - CPF: {p.cpf} ({p.insurance})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Médico Especialista *</label>
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
                <label className="form-label">Tipo de Procedimento</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Consulta de Rotina">Consulta de Rotina</option>
                  <option value="Primeira Consulta">Primeira Consulta</option>
                  <option value="Retorno com Exames">Retorno com Exames</option>
                  <option value="Avaliação Cardiológica">Avaliação Cardiológica</option>
                  <option value="Check-up Preventivo">Check-up Preventivo</option>
                  <option value="Urgência Leve">Urgência Leve</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Horário *</label>
                <input
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Modalidade</label>
                <select className="form-select" value={modality} onChange={(e) => setModality(e.target.value)}>
                  <option value="Presencial">Presencial</option>
                  <option value="Telemedicina">Telemedicina</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Consultório / Sala de Atendimento</label>
              <input
                type="text"
                className="form-input"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Observações Clínicas ou Queixa Preliminar</label>
              <textarea
                className="form-textarea"
                placeholder="Ex: Paciente relata pico pressórico recente..."
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
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
