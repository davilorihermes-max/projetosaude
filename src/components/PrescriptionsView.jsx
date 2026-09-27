// src/components/PrescriptionsView.jsx
import React, { useState } from 'react';
import { Pill, Plus, Printer, Trash2, FileCheck, Shield, Sparkles } from 'lucide-react';
import { COMMON_MEDICATIONS } from '../data/mockData';

export default function PrescriptionsView({
  patients = [],
  doctors = [],
  onOpenPrescriptionModal,
  activeDoctor
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
  const [items, setItems] = useState([
    { drug: 'Losartana Potássica 50mg', dosage: 'Tomar 1 comprimido pela manhã em jejum por 60 dias.' },
    { drug: 'Hidroclorotiazida 25mg', dosage: 'Tomar 1/2 comprimido junto com a Losartana.' }
  ]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!medName) return;
    setItems([...items, { drug: medName, dosage: dosage || 'Tomar conforme orientação médica.' }]);
    setMedName('');
    setDosage('');
  };

  const handleSelectPreset = (med) => {
    setMedName(`${med.name} ${med.defaultDose}`);
    setDosage(med.defaultInstructions);
  };

  const handlePrint = () => {
    onOpenPrescriptionModal({
      patient: currentPatient,
      doctor: activeDoctor,
      medications: items
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Emissor Rápido de Prescrição Digital</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Crie receitas médicas padronizadas com carimbo digital, QR Code de validação e layout para impressão.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Configuration Form */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill size={18} color="var(--primary)" /> Dados da Receita
          </h3>

          <div className="form-group">
            <label className="form-label">Selecione o Paciente *</label>
            <select
              className="form-select"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - CPF: {p.cpf} ({p.insurance})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Médico Prescritor</label>
            <input
              type="text"
              className="form-input"
              value={`${activeDoctor?.name} - ${activeDoctor?.crm}`}
              disabled
              style={{ opacity: 0.8 }}
            />
          </div>

          {/* Quick presets */}
          <div style={{ margin: '1rem 0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Sugestões Rápidas:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {COMMON_MEDICATIONS.slice(0, 6).map((med, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
                  onClick={() => handleSelectPreset(med)}
                >
                  + {med.name}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nome do Fármaco e Dosagem</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Amoxicilina + Clavulanato 875mg"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Posologia & Instruções de Uso</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '60px' }}
                placeholder="Ex: Tomar 1 comprimido por via oral a cada 12 horas durante 7 dias consecutivos."
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline-primary">
              <Plus size={16} /> Incluir Fármaco na Receita
            </button>
          </form>
        </div>

        {/* Right: Live Preview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileCheck size={18} color="var(--success)" /> Pré-visualização do Receituário
              </h3>
              <span className="badge badge-completed" style={{ fontSize: '0.7rem' }}>
                <Shield size={12} /> Assinatura Válida
              </span>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-light)', fontSize: '0.825rem' }}>
              <div><strong>Paciente:</strong> {currentPatient?.name}</div>
              <div><strong>CPF:</strong> {currentPatient?.cpf} | <strong>Idade:</strong> {currentPatient?.age} anos</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
              {items.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                  Nenhum medicamento adicionado ainda.
                </p>
              ) : (
                items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{idx + 1}. {it.drug}</strong>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', marginTop: '0.2rem' }}>
                        Uso: {it.dosage}
                      </p>
                    </div>
                    <button
                      className="btn btn-icon"
                      style={{ color: 'var(--danger)', padding: '0.3rem' }}
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      title="Excluir item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handlePrint} disabled={items.length === 0}>
              <Printer size={16} /> Emitir e Imprimir Receituário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
