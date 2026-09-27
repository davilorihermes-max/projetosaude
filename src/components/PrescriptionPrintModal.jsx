// src/components/PrescriptionPrintModal.jsx
import React from 'react';
import { X, Printer, ShieldCheck, QrCode } from 'lucide-react';
import { CLINIC_INFO } from '../data/mockData';

export default function PrescriptionPrintModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const { patient, doctor, medications = [] } = data;
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const prescriptionCode = `BR-ICP-${Math.random().toString(36).substring(2, 8).toUpperCase()}-2026`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700 }}>Emissão de Receituário Médico Oficial</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Printable Paper Leaf Area */}
        <div
          id="printable-prescription"
          style={{
            background: '#ffffff',
            color: '#111827',
            padding: '2.5rem',
            fontFamily: "'Times New Roman', Times, serif, system-ui",
            minHeight: '620px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'inset 0 0 0 1px #e5e7eb'
          }}
        >
          {/* Official Clinic Header */}
          <div>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', color: '#0369a1', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {CLINIC_INFO.name}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: '0.2rem 0' }}>
                {CLINIC_INFO.address} • Tel: {CLINIC_INFO.phone}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                CNES: {CLINIC_INFO.cnes} • CNPJ: {CLINIC_INFO.cnpj}
              </p>
            </div>

            {/* Prescribing Doctor & Patient Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px dashed #d1d5db', paddingBottom: '1rem', fontSize: '0.9rem' }}>
              <div>
                <strong>Paciente:</strong> {patient?.name}<br />
                <strong>CPF:</strong> {patient?.cpf} | <strong>Idade:</strong> {patient?.age} anos<br />
                <strong>Convênio:</strong> {patient?.insurance}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Data de Emissão:</strong> {currentDate}<br />
                <strong>Médico:</strong> {doctor?.name || 'Dr. Lucas Silveira'}<br />
                <span>{doctor?.crm || 'CRM/SP 142.890'}</span>
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
              <h3 style={{ textDecoration: 'underline', letterSpacing: '0.1em', fontSize: '1.2rem', margin: 0 }}>
                RECEITUÁRIO MÉDICO
              </h3>
              <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#4b5563' }}>Via do Paciente</span>
            </div>

            {/* Medications List */}
            <div style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '220px' }}>
              {medications.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Nenhum medicamento listado.</p>
              ) : (
                medications.map((item, idx) => (
                  <div key={idx} style={{ lineHeight: '1.4' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
                      {idx + 1}. {item.drug} {item.qty ? `------------- ${item.qty}` : ''}
                    </div>
                    <div style={{ fontSize: '0.95rem', marginLeft: '1.25rem', marginTop: '0.2rem', color: '#1f2937' }}>
                      Uso: {item.dosage}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Footer: Digital Signature & QR Validation */}
          <div style={{ borderTop: '2px solid #0284c7', paddingTop: '1.25rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #d1d5db', padding: '0.35rem', borderRadius: '4px', background: '#f9fafb' }}>
                  <QrCode size={48} color="#0369a1" />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontWeight: 'bold' }}>
                    <ShieldCheck size={14} /> Assinado Digitalmente (ICP-Brasil)
                  </div>
                  <span>Código de Verificação: <strong>{prescriptionCode}</strong></span><br />
                  <span>Válido em todo o território nacional.</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', minWidth: '220px' }}>
                <div style={{ borderBottom: '1px solid #111827', width: '100%', marginBottom: '0.25rem', height: '35px' }}></div>
                <strong style={{ fontSize: '0.85rem' }}>{doctor?.name || 'Dr. Lucas Silveira'}</strong><br />
                <span style={{ fontSize: '0.75rem', color: '#4b5563' }}>{doctor?.crm || 'CRM/SP 142.890'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
