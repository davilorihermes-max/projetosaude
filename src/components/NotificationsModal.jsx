// src/components/NotificationsModal.jsx
import React from 'react';
import { X, Bell, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react';

export default function NotificationsModal({ isOpen, onClose, notifications = [], onClearAll }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Notificações da Clínica</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0' }}>
              Nenhuma nova notificação.
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ marginTop: '0.15rem' }}>
                  {item.type === 'alert' && <AlertTriangle size={18} color="var(--danger)" />}
                  {item.type === 'lab' && <FileText size={18} color="var(--primary)" />}
                  {item.type === 'info' && <CheckCircle size={18} color="var(--success)" />}
                </div>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-headline)', display: 'block' }}>
                    {item.title}
                  </strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: '0.2rem' }}>
                    {item.description}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} /> {item.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={onClearAll}>
            Marcar todas como lidas
          </button>
          <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
