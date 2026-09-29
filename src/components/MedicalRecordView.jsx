import React, { useState } from 'react';
import {
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Scale,
  AlertTriangle,
  FileText,
  PlusCircle,
  ClipboardList,
  Printer,
  Calendar,
  CheckCircle,
  Save,
  Search,
  Clock,
  Sparkles
} from 'lucide-react';
import './MedicalRecordView.css';

export default function MedicalRecordView({
  patient,
  allPatients = [],
  onSelectPatient,
  clinicalRecords = {},
  onSaveNewEvolution,
  activeDoctor
}) {
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'new_evolution' | 'exams'

  // New evolution form state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [hda, setHda] = useState('');
  const [physicalExam, setPhysicalExam] = useState('');
  const [cid, setCid] = useState('Z00.0 - Exame médico geral');
  const [conduct, setConduct] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Selected exams state
  const [selectedExams, setSelectedExams] = useState(['Hemograma Completo', 'Glicemia de Jejum']);
  const availableExams = [
    'Hemograma Completo',
    'Glicemia de Jejum',
    'Hemoglobina Glicada (HbA1c)',
    'Perfil Lipídico Completo',
    'Creatinina e Ureia',
    'TSH e T4 Livre',
    'Urina Tipo I (EAS)',
    'Eletrocardiograma (ECG)',
    'Raio-X de Tórax (PA e Perfil)',
    'Ultrassonografia Abdominal Total'
  ];

  if (!patient) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <User size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
        <h3>Nenhum paciente selecionado</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Selecione um paciente na lista abaixo ou na aba de Pacientes para visualizar o Prontuário Eletrônico.
        </p>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <select
            className="form-select"
            onChange={(e) => {
              const p = allPatients.find((item) => item.id === e.target.value);
              if (p) onSelectPatient(p);
            }}
          >
            <option value="">Selecione um paciente...</option>
            {allPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - CPF: {p.cpf}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Calculate BMI
  const heightM = patient.height || 1.70;
  const weightKg = patient.weight || 70;
  const bmi = (weightKg / (heightM * heightM)).toFixed(1);
  const getBmiStatus = (val) => {
    if (val < 18.5) return 'Abaixo do peso';
    if (val < 25) return 'Peso adequado (Eutrófico)';
    if (val < 30) return 'Sobrepeso';
    return 'Obesidade';
  };

  const patientRecord = clinicalRecords[patient.id] || { timeline: [], diagnoses: [], currentMedications: [] };
  const latestVitals = patient.vitalsHistory?.[patient.vitalsHistory.length - 1] || {
    bpSystolic: 120,
    bpDiastolic: 80,
    hr: 72,
    temp: 36.5,
    spo2: 98
  };

  const handleSaveEvolution = (e) => {
    e.preventDefault();
    if (!chiefComplaint || !conduct) {
      alert('Por favor, preencha ao menos a Queixa Principal e a Conduta.');
      return;
    }

    const newRecordItem = {
      id: `rec-${Date.now()}`,
      date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      doctor: activeDoctor?.name || 'Dr. Lucas Silveira',
      crm: activeDoctor?.crm || 'CRM/SP 142.890',
      subject: `Evolução Clínica - ${chiefComplaint.slice(0, 30)}...`,
      chiefComplaint,
      hda,
      physicalExam,
      conduct,
      cid,
      requestedExams: selectedExams
    };

    onSaveNewEvolution(patient.id, newRecordItem);
    setSaveSuccessMessage(true);
    setTimeout(() => {
      setSaveSuccessMessage(false);
      setActiveTab('timeline');
      // Reset form
      setChiefComplaint('');
      setHda('');
      setPhysicalExam('');
      setConduct('');
    }, 1200);
  };

  const toggleExam = (exam) => {
    if (selectedExams.includes(exam)) {
      setSelectedExams(selectedExams.filter((e) => e !== exam));
    } else {
      setSelectedExams([...selectedExams, exam]);
    }
  };

  return (
    <div className="pep-container">
      {/* Patient Selector Quick Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mudar Paciente:</span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '260px' }}
            value={patient.id}
            onChange={(e) => {
              const found = allPatients.find((p) => p.id === e.target.value);
              if (found) onSelectPatient(found);
            }}
          >
            {allPatients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.insurance})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setActiveTab('new_evolution')}
          >
            <PlusCircle size={16} /> Nova Evolução no Domicílio
          </button>
        </div>
      </div>

      {/* Patient Identity Header */}
      <div className="patient-header-card">
        <div className="patient-header-top">
          <div className="patient-profile-main">
            <img src={patient.avatar} alt={patient.name} className="patient-avatar-large" />
            <div className="patient-title-group">
              <h2>{patient.name}</h2>
              <div className="patient-meta-tags">
                <span>{patient.age} anos ({patient.birthDate})</span>
                <span>• Sexo: {patient.gender}</span>
                <span>• CPF: {patient.cpf}</span>
                <span>• Convênio: <strong>{patient.insurance}</strong> (Nº {patient.insuranceNumber})</span>
                <span className="blood-type-badge">Tipo {patient.bloodType}</span>
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.825rem', color: 'var(--text-body)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div>📍 <strong>Endereço do Domicílio:</strong> {patient.address || 'São Paulo - SP'}</div>
                {patient.caregiver && <div>👤 <strong>Cuidador(a) Responsável:</strong> {patient.caregiver}</div>}
                {patient.mobilityStatus && <div>♿ <strong>Status de Mobilidade:</strong> {patient.mobilityStatus}</div>}
                {patient.accessNotes && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>🔑 <strong>Instruções de Acesso:</strong> {patient.accessNotes}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Allergies Highlight */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="allergies-banner">
            <AlertTriangle size={20} />
            <strong style={{ whiteSpace: 'nowrap' }}>Atenção Alergias:</strong>
            <div className="allergies-tags">
              {patient.allergies.map((allergy, idx) => (
                <span key={idx} className="allergy-pill">
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sinais Vitais (Vitals) */}
      <div className="vitals-grid">
        <div className="vital-card">
          <div className="vital-header">
            <span>Pressão Arterial</span>
            <Heart size={16} color="var(--primary)" />
          </div>
          <div className="vital-value">
            {latestVitals.bpSystolic}/{latestVitals.bpDiastolic}
            <span className="vital-unit">mmHg</span>
          </div>
          <span className="vital-status">Normotenso</span>
        </div>

        <div className="vital-card">
          <div className="vital-header">
            <span>Frequência Cardíaca</span>
            <Activity size={16} color="#ef4444" />
          </div>
          <div className="vital-value">
            {latestVitals.hr}
            <span className="vital-unit">bpm</span>
          </div>
          <span className="vital-status">Ritmo Regular</span>
        </div>

        <div className="vital-card">
          <div className="vital-header">
            <span>Temperatura Corporal</span>
            <Thermometer size={16} color="#f59e0b" />
          </div>
          <div className="vital-value">
            {latestVitals.temp}
            <span className="vital-unit">°C</span>
          </div>
          <span className="vital-status">Afebril</span>
        </div>

        <div className="vital-card">
          <div className="vital-header">
            <span>Oximetria (SpO2)</span>
            <Wind size={16} color="#0d9488" />
          </div>
          <div className="vital-value">
            {latestVitals.spo2}
            <span className="vital-unit">%</span>
          </div>
          <span className="vital-status">Normal em ar ambiente</span>
        </div>

        <div className="vital-card">
          <div className="vital-header">
            <span>Peso & IMC</span>
            <Scale size={16} color="#6366f1" />
          </div>
          <div className="vital-value">
            {bmi}
            <span className="vital-unit">kg/m² ({weightKg} kg)</span>
          </div>
          <span className="vital-status">{getBmiStatus(Number(bmi))}</span>
        </div>
      </div>

      {/* Navigation Tabs inside PEP */}
      <div className="pep-tabs-nav">
        <button
          className={`pep-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Clock size={16} /> Linha do Tempo Domiciliar ({patientRecord.timeline?.length || 0})
        </button>
        <button
          className={`pep-tab-btn ${activeTab === 'new_evolution' ? 'active' : ''}`}
          onClick={() => setActiveTab('new_evolution')}
        >
          <PlusCircle size={16} /> Nova Evolução no Domicílio
        </button>
        <button
          className={`pep-tab-btn ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          <ClipboardList size={16} /> Pedidos de Exames ({selectedExams.length})
        </button>
      </div>

      {/* TAB 1: Clinical Timeline */}
      {activeTab === 'timeline' && (
        <div className="records-timeline">
          {(!patientRecord.timeline || patientRecord.timeline.length === 0) ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Nenhuma evolução anterior registrada para este paciente. Clique em <strong>"Nova Evolução Clínica"</strong> para iniciar o primeiro registro.
              </p>
            </div>
          ) : (
            patientRecord.timeline.map((record) => (
              <div key={record.id} className="record-item">
                <div className="record-bullet"></div>
                <div className="record-card-content">
                  <div className="record-top-meta">
                    <div>
                      <span className="record-doctor">{record.doctor}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        {record.crm}
                      </span>
                    </div>
                    <div className="record-date">
                      <Calendar size={14} /> {record.date}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-headline)' }}>
                      {record.subject}
                    </span>
                    {record.cid && (
                      <span className="badge badge-scheduled" style={{ fontSize: '0.75rem' }}>
                        CID-10: {record.cid}
                      </span>
                    )}
                  </div>

                  <div className="clinical-section-box">
                    <span className="clinical-section-title">Queixa Principal (QP):</span>
                    <p className="clinical-section-text">{record.chiefComplaint}</p>
                  </div>

                  {record.hda && (
                    <div className="clinical-section-box">
                      <span className="clinical-section-title">História da Moléstia Atual (HDA):</span>
                      <p className="clinical-section-text">{record.hda}</p>
                    </div>
                  )}

                  {record.physicalExam && (
                    <div className="clinical-section-box">
                      <span className="clinical-section-title">Exame Físico:</span>
                      <p className="clinical-section-text">{record.physicalExam}</p>
                    </div>
                  )}

                  <div className="clinical-section-box">
                    <span className="clinical-section-title">Conduta & Orientações:</span>
                    <p className="clinical-section-text">{record.conduct}</p>
                  </div>



                  {record.requestedExams && record.requestedExams.length > 0 && (
                    <div className="clinical-section-box">
                      <span className="clinical-section-title">Exames Solicitados:</span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {record.requestedExams.map((ex, idx) => (
                          <span key={idx} className="badge badge-waiting" style={{ fontSize: '0.75rem' }}>
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: New Clinical Evolution */}
      {activeTab === 'new_evolution' && (
        <form onSubmit={handleSaveEvolution} className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--primary)" /> Registro de Atendimento / Sessão Domiciliar
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Profissional Visitador: <strong>{activeDoctor?.name || 'Dr. Lucas Silveira'}</strong>
            </span>
          </div>

          {saveSuccessMessage && (
            <div style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} />
              <strong>Evolução domiciliar gravada com sucesso no PEP do Paciente!</strong>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Queixa no Domicílio / Relato do Cuidador ou Paciente *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Cuidadora relata dor moderada no membro operado e boa aceitação alimentar..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">História da Moléstia & Condições da Residência (HDA)</label>
            <textarea
              className="form-textarea"
              placeholder="Descreva a evolução do quadro clínico, condições de higiene do leito, adesão medicamentosa informada pelo cuidador..."
              value={hda}
              onChange={(e) => setHda(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Exame Físico Realizado no Domicílio</label>
            <textarea
              className="form-textarea"
              placeholder="Sinais vitais in loco, ausculta pulmonar/cardíaca, estado da pele/curativo, mobilidade no leito..."
              value={physicalExam}
              onChange={(e) => setPhysicalExam(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Hipótese Diagnóstica (CID-10)</label>
              <select className="form-select" value={cid} onChange={(e) => setCid(e.target.value)}>
                <option value="Z96.6 - Presença de implante articular ortopédico">Z96.6 - Pós-operatório ortopédico</option>
                <option value="I10 - Hipertensão essencial">I10 - Hipertensão essencial</option>
                <option value="E11.5 - Diabetes com complicações circulatórias / Pé diabético">E11.5 - Pé diabético / Neuropatia</option>
                <option value="J45 - Asma sob oxigenoterapia">J45 - Asma grave domiciliar</option>
                <option value="G81 - Hemiplegia / Pós-AVC acamado">G81 - Sequela de AVC / Acamado</option>
                <option value="L89 - Úlcera por pressão">L89 - Úlcera por pressão / Curativo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Conduta, Prescrição e Orientações para a Família / Cuidador *</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '75px' }}
                placeholder="Prescrição de cuidados domiciliares, posologia para o cuidador administrar, data da próxima visita na rota..."
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('timeline')}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Salvar no Prontuário
            </button>
          </div>
        </form>
      )}



      {/* TAB 4: Exam Orders */}
      {activeTab === 'exams' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Solicitação de Exames Complementares</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Selecione os exames que o paciente deverá realizar.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => alert(`Pedido com ${selectedExams.length} exames gerado para o paciente ${patient.name}!`)}
            >
              <Printer size={16} /> Emitir Guia de Exames
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {availableExams.map((exam, idx) => {
              const isChecked = selectedExams.includes(exam);
              return (
                <label
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    border: '1px solid',
                    borderColor: isChecked ? 'var(--primary)' : 'var(--border-light)',
                    background: isChecked ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleExam(exam)}
                    style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: isChecked ? 700 : 500, color: 'var(--text-headline)' }}>
                    {exam}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
