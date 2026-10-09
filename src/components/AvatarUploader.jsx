// src/components/AvatarUploader.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import Avatar from './Avatar';

const DEFAULT_PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1594824813576-90c741492ba6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
];

export default function AvatarUploader({
  avatar,
  onChangeAvatar,
  name = '',
  color,
  borderColor = 'var(--primary)'
}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Limpa o stream de câmera se o componente for desmontado
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Handler de Anexo de Arquivo
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl === 'string') {
        onChangeAvatar(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Reseta input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // Iniciar Câmera / Webcam
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Erro ao acessar câmera:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permissão de câmera negada. Conceda acesso nas permissões do navegador.'
          : 'Não foi possível acessar a câmera do dispositivo.'
      );
      setIsCameraActive(false);
    }
  };

  // Parar Câmera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setCameraError('');
  };

  // Capturar Foto da Câmera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Recorte centralizado quadrado
      const sx = ((video.videoWidth || size) - size) / 2;
      const sy = ((video.videoHeight || size) - size) / 2;

      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onChangeAvatar(dataUrl);
    }

    stopCamera();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label className="form-label" style={{ marginBottom: 0 }}>
        Foto do Perfil Profissional
      </label>

      {/* Visão de Câmera Ativa */}
      {isCameraActive ? (
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: '#0f172a',
            border: `2px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0.75rem'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid white',
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem'
            }}
          >
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && stream && !el.srcObject) {
                  el.srcObject = stream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Espelhar como preview de selfie
              }}
            />
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: '0.5rem', zIndex: 10 }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
              onClick={capturePhoto}
            >
              <Camera size={15} style={{ marginRight: '4px' }} /> Capturar Foto
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
              onClick={stopCamera}
            >
              <X size={15} style={{ marginRight: '4px' }} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* Modo Normal com Pré-visualização e Botões */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Avatar Preview */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatar}
              name={name || 'Profissional'}
              size={64}
              color={color}
              style={{
                border: `3px solid ${borderColor}`,
                boxShadow: 'var(--shadow-sm)'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={startCamera}
              >
                <Camera size={14} color="var(--primary)" />
                <span>Tirar Foto</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} color="var(--primary)" />
                <span>Anexar Arquivo</span>
              </button>

              {avatar && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--danger)',
                    borderColor: 'var(--danger-border)'
                  }}
                  onClick={() => onChangeAvatar(null)}
                  title="Remover foto e utilizar iniciais elegantes"
                >
                  <X size={14} />
                  <span>Remover Foto</span>
                </button>
              )}
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {avatar ? 'Foto adicionada. Você pode alterá-la ou voltar às iniciais.' : 'Nenhuma foto anexada. O sistema exibirá suas iniciais profissionais estilizadas.'}
            </span>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}

      {cameraError && (
        <div
          style={{
            background: 'var(--danger-subtle)',
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: '1px solid'
          }}
        >
          <AlertCircle size={14} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Sugestões rápidas de fotos ilustrativas */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Ou escolha uma sugestão:
        </span>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button
            type="button"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              padding: 0,
              border: !avatar ? `2px solid ${borderColor}` : '1px solid var(--border-light)',
              cursor: 'pointer',
              background: 'var(--bg-card)',
              color: 'var(--primary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: !avatar ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.15s ease'
            }}
            onClick={() => onChangeAvatar(null)}
            title="Usar iniciais estilizadas (sem foto)"
          >
            Aa
          </button>
          {DEFAULT_PRESET_AVATARS.map((url, idx) => (
            <button
              key={idx}
              type="button"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                padding: 0,
                border: avatar === url ? `2px solid ${borderColor}` : '1px solid var(--border-light)',
                cursor: 'pointer',
                overflow: 'hidden',
                background: 'none',
                opacity: avatar === url ? 1 : 0.75,
                transform: avatar === url ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s ease'
              }}
              onClick={() => onChangeAvatar(url)}
              title="Foto de exemplo"
            >
              <Avatar src={url} name={`Exemplo ${idx + 1}`} size={26} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
