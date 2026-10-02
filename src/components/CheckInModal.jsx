// src/components/CheckInModal.jsx
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  X,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import './CheckInModal.css';

function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function CheckInModal({
  isOpen,
  onClose,
  appointment,
  patient,
  onCheckInSuccess
}) {
  if (!isOpen || !appointment) return null;

  // Coordenadas alvo do paciente
  const targetLat = patient?.coordinates?.latitude || patient?.latitude || -23.563099;
  const targetLng = patient?.coordinates?.longitude || patient?.longitude || -46.654271;

  // Estado de localização (padrão inicial: simulado a 35m para demonstração rápida)
  const [currentLat, setCurrentLat] = useState(() => targetLat + 0.00025);
  const [currentLng, setCurrentLng] = useState(() => targetLng + 0.00020);
  const [isLocating, setIsLocating] = useState(false);
  const [simMode, setSimMode] = useState('nearby'); // 'nearby' | 'far' | 'device'
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Calcula a distância atual em metros
  const distanceMeters = calculateHaversine(currentLat, currentLng, targetLat, targetLng);
  const isWithinRadius = distanceMeters <= 150;

  // Sugestões rápidas de justificativa
  const suggestions = [
    'Paciente aguardando na portaria / calçada',
    'Intercorrência no portão de pedestres do condomínio',
    'Oscilação ou desvio momentâneo do satélite GPS',
    'Atendimento iniciado com cuidador na entrada'
  ];

  // Captura GPS real do dispositivo
  const handleGetRealGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada por este navegador.');
      return;
    }
    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLat(position.coords.latitude);
        setCurrentLng(position.coords.longitude);
        setSimMode('device');
        setIsLocating(false);
      },
      (error) => {
        console.warn('Erro ao obter GPS do navegador:', error);
        setErrorMessage('Não foi possível obter o sinal de GPS do aparelho. Usando modo simulado.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSimulateNearby = () => {
    setCurrentLat(targetLat + 0.00025);
    setCurrentLng(targetLng + 0.00020);
    setSimMode('nearby');
    setErrorMessage(null);
  };

  const handleSimulateFar = () => {
    // ~750m a 850m de distância
    setCurrentLat(targetLat + 0.0068);
    setCurrentLng(targetLng + 0.0055);
    setSimMode('far');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!isWithinRadius && (!overrideReason || overrideReason.trim().length === 0)) {
      setErrorMessage('Por favor, informe uma justificativa para registrar o check-in fora do raio de 150m.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('omnihome_jwt');
      const payload = {
        appointmentId: appointment.id,
        latitude: currentLat,
        longitude: currentLng,
        overrideReason: !isWithinRadius ? overrideReason.trim() : undefined
      };

      let attendanceRecord = null;

      if (token) {
        try {
          const res = await fetch('http://localhost:3001/api/attendance/check-in', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            attendanceRecord = data.attendance;
          }
        } catch (apiErr) {
          console.warn('Backend indisponível, aplicando fallback local:', apiErr);
        }
      }

      // Se a API não respondeu ou estamos offline, cria o registro localmente
      if (!attendanceRecord) {
        attendanceRecord = {
          id: `att-${Date.now()}`,
          appointmentId: appointment.id,
          checkInAt: new Date().toISOString(),
          checkInDistanceMeters: distanceMeters,
          checkInStatus: isWithinRadius ? 'ON_SITE_VALIDATED' : 'OUT_OF_BOUNDS_ACCEPTED',
          overrideReason: !isWithinRadius ? overrideReason.trim() : null
        };
      }

      onCheckInSuccess(appointment.id, attendanceRecord);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Falha ao processar check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkin-modal-overlay" onClick={onClose}>
      <div className="checkin-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="checkin-header">
          <div className="checkin-header-left">
            <div className="checkin-icon-box">
              <Compass size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="checkin-title">Check-in com Geofencing</h3>
              <div className="checkin-subtitle">Validação de Presença no Domicílio</div>
            </div>
          </div>
          <button className="checkin-close-btn" onClick={onClose} title="Fechar modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="checkin-body">
          {/* Patient Card */}
          <div className="checkin-patient-summary">
            <img
              src={patient?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'}
              alt={patient?.name}
              className="checkin-patient-avatar"
            />
            <div className="checkin-patient-details">
              <h4>{patient?.name}</h4>
              <div className="checkin-address-line">
                <MapPin size={14} />
                <span>{patient?.address || appointment.address}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Clock size={12} /> Horário: <strong>{appointment.time}</strong> • {appointment.type}
              </div>
            </div>
          </div>

          {/* Proximity / Radar Gauge */}
          <div className={`checkin-radar-card ${isWithinRadius ? 'within-radius' : 'out-of-radius'}`}>
            <div className="radar-top-row">
              <div className="radar-distance-box">
                <span className="radar-distance-number">{distanceMeters}m</span>
                <span className="radar-distance-unit">do domicílio</span>
              </div>

              {isWithinRadius ? (
                <div className="radar-status-badge badge-valid-gps">
                  <ShieldCheck size={14} />
                  <span>Raio Permitido (≤ 150m)</span>
                </div>
              ) : (
                <div className="radar-status-badge badge-warning-gps">
                  <AlertTriangle size={14} />
                  <span>Fora do Raio (&gt; 150m)</span>
                </div>
              )}
            </div>

            <p className="radar-message">
              {isWithinRadius ? (
                <>Presença confirmada! As coordenadas capturadas coincidem com o endereço cadastrado do paciente.</>
              ) : (
                <>Você está fora do perímetro de 150 metros. Para registrar presença à distância, forneça uma justificativa operacional.</>
              )}
            </p>

            {/* GPS Controls Row */}
            <div className="radar-controls-row">
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Testar GPS:</span>
              <button
                type="button"
                className={`gps-sim-btn ${simMode === 'nearby' ? 'active' : ''}`}
                onClick={handleSimulateNearby}
              >
                <MapPin size={12} /> No Domicílio (~35m)
              </button>
              <button
                type="button"
                className={`gps-sim-btn ${simMode === 'far' ? 'active' : ''}`}
                onClick={handleSimulateFar}
              >
                <AlertTriangle size={12} /> Fora do Raio (~780m)
              </button>
              <button
                type="button"
                className={`gps-sim-btn ${simMode === 'device' ? 'active' : ''}`}
                onClick={handleGetRealGps}
                disabled={isLocating}
              >
                <Navigation size={12} /> {isLocating ? 'Obtendo GPS...' : 'GPS do Dispositivo'}
              </button>
            </div>
          </div>

          {/* Justification Box (Active when out of bounds) */}
          {!isWithinRadius && (
            <div className="checkin-override-box">
              <label className="override-label">
                <AlertTriangle size={14} />
                Justificativa Obrigatória para Check-in Fora do Raio:
              </label>
              <textarea
                className="override-textarea"
                placeholder="Descreva o motivo do registro à distância..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
              <div className="suggestion-chips">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="chip-btn"
                    onClick={() => setOverrideReason(sug)}
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', background: 'var(--danger-subtle)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="checkin-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            className={`btn ${isWithinRadius ? 'btn-success' : 'btn-primary'}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Gravando Check-in...'
            ) : isWithinRadius ? (
              <>
                <ShieldCheck size={16} /> Confirmar Presença no Domicílio
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Gravar Check-in Justificado
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
