// src/components/VoiceEvolutionModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Volume2,
  Clock,
  Calendar,
  User,
  Heart,
  Activity,
  Stethoscope,
  X,
  FileText,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Avatar from './Avatar';
import confetti from 'canvas-confetti';
import { parseClinicalVoiceNote } from '../services/clinicalVoiceParser';
import './VoiceEvolutionModal.css';

export default function VoiceEvolutionModal({
  isOpen,
  onClose,
  patient,
  appointment,
  activeDoctor,
  currentUser,
  evolutions = [],
  onSaveEvolution
}) {
  if (!isOpen || !patient) return null;

  // Tabs: 'record' (Nova Evolução) ou 'history' (Histórico do Paciente)
  const [activeTab, setActiveTab] = useState('record');

  // Gravação de Áudio & Fala
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [rawTranscription, setRawTranscription] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Campos SOAP Estruturados
  const [vitals, setVitals] = useState({
    bloodPressure: '120/80',
    oxygenSaturation: 98,
    heartRate: 75,
    temperature: 36.5,
    glucose: ''
  });
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [detectedKeywords, setDetectedKeywords] = useState([]);
  const [hasParsed, setHasParsed] = useState(false);

  // Refs para controle do microfone
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioElementRef = useRef(null);

  // Filtra evoluções existentes do paciente atual
  const patientHistory = evolutions.filter((e) => e.patientId === patient.id);

  // Reset do estado ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab('record');
      setIsRecording(false);
      setRecordingSeconds(0);
      setRawTranscription('');
      setAudioUrl(null);
      setAudioBlob(null);
      setIsPlayingAudio(false);
      setHasParsed(false);
      setDetectedKeywords([]);

      // Valores padrão de vitais
      setVitals({
        bloodPressure: '120/80',
        oxygenSaturation: 98,
        heartRate: 75,
        temperature: 36.5,
        glucose: ''
      });
      setSubjective('');
      setObjective('');
      setAssessment('');
      setPlan('');
    }

    return () => {
      cleanupRecording();
    };
  }, [isOpen, patient?.id]);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
  };

  // Inicia Gravação de Áudio e Reconhecimento de Voz
  const startRecording = async () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRawTranscription('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    // 1. Inicia MediaRecorder nativo para capturar o áudio real
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          // Libera faixas de áudio
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(250);
      }
    } catch (err) {
      console.warn('MediaRecorder não disponível ou permissão negada:', err);
    }

    // 2. Inicia Web Speech Recognition (Google Speech API no navegador)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          setRawTranscription(fullTranscript.trim());
        };

        recognition.onerror = (event) => {
          console.warn('Erro de reconhecimento de voz:', event.error);
        };

        recognition.start();
        setIsSpeechSupported(true);
      } catch (err) {
        console.warn('Falha ao inicializar SpeechRecognition:', err);
        setIsSpeechSupported(false);
      }
    } else {
      setIsSpeechSupported(false);
    }

    setIsRecording(true);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Para a gravação e estrutura automaticamente com IA
  const stopRecordingAndProcess = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    // Processa com motor de IA clínica
    setTimeout(() => {
      processTranscriptionWithAI();
    }, 400);
  };

  // Motor de Inteligência Artificial para estruturação
  const processTranscriptionWithAI = (customText = null) => {
    const textToProcess = customText !== null ? customText : rawTranscription;
    if (!textToProcess.trim()) return;

    const structured = parseClinicalVoiceNote(textToProcess, {
      patientName: patient?.name,
      professionalName: activeDoctor?.name || currentUser?.name
    });

    setVitals((prev) => ({
      ...prev,
      ...structured.vitals
    }));
    setSubjective(structured.subjective);
    setObjective(structured.objective);
    setAssessment(structured.assessment);
    setPlan(structured.plan);
    setDetectedKeywords(structured.detectedKeywords);
    setHasParsed(true);
  };

  // Adiciona um chip rápido de conduta falada
  const handleAddQuickKeyword = (keywordText) => {
    const newText = rawTranscription ? `${rawTranscription}, ${keywordText}` : keywordText;
    setRawTranscription(newText);
    processTranscriptionWithAI(newText);
  };

  // Controle de reprodução do áudio
  const togglePlayAudio = () => {
    if (!audioUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioUrl);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (isPlayingAudio) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Formatação de tempo 00:00
  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Salvar no Prontuário
  const handleSave = () => {
    if (!patient) return;

    const now = new Date();
    const newEvolution = {
      id: `evo-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      appointmentId: appointment?.id || null,
      professionalId: activeDoctor?.id || currentUser?.id || 'prof-1',
      professionalName: activeDoctor?.name || currentUser?.name || 'Profissional da Equipe',
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawNotes: rawTranscription || 'Evolução registrada via comando rápido de voz',
      audioRecordingUrl: audioUrl || null,
      vitals: {
        bloodPressure: vitals.bloodPressure || '120/80',
        oxygenSaturation: Number(vitals.oxygenSaturation) || 98,
        heartRate: Number(vitals.heartRate) || 75,
        temperature: Number(vitals.temperature) || 36.5,
        glucose: Number(vitals.glucose) || undefined
      },
      subjective: subjective || 'Paciente avaliado no domicílio em condições clínicas estáveis.',
      objective: objective || 'Sinais vitais normais e sem intercorrências durante a sessão.',
      assessment: assessment || 'Quadro clínico estável e boa resposta ao tratamento.',
      plan: plan || 'Conduta terapêutica realizada conforme prescrição domiciliar.',
      summarizedConduct:
        detectedKeywords.join(' + ') || 'Atendimento domiciliar realizado',
      aiAssisted: true,
      createdAt: now.toISOString()
    };

    onSaveEvolution(newEvolution);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}

    onClose();
  };

  return (
    <div className="voice-evo-backdrop" onClick={onClose}>
      <div className="voice-evo-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header com Dados do Paciente */}
        <div className="voice-evo-header">
          <div className="voice-evo-patient-info">
            <Avatar src={patient.avatar} name={patient.name} size={44} />
            <div>
              <div className="voice-evo-title-row">
                <h3>{patient.name}</h3>
                <span className="voice-evo-badge">Prontuário Rápido</span>
              </div>
              <p className="voice-evo-sub">
                {patient.age ? `${patient.age} anos • ` : ''}
                {appointment?.therapyType || appointment?.type || 'Sessão Domiciliar'} •{' '}
                {activeDoctor?.name ? `Dr(a). ${activeDoctor.name}` : 'Equipe Multidisciplinar'}
              </p>
            </div>
          </div>
          <button type="button" className="voice-evo-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs: Nova Evolução vs Histórico */}
        <div className="voice-evo-tabs">
          <button
            type="button"
            className={`voice-evo-tab ${activeTab === 'record' ? 'active' : ''}`}
            onClick={() => setActiveTab('record')}
          >
            <Mic size={15} /> Gravar por Voz
          </button>
          <button
            type="button"
            className={`voice-evo-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FileText size={15} /> Histórico ({patientHistory.length})
          </button>
        </div>

        {/* Conteúdo da Tab de Gravação */}
        {activeTab === 'record' ? (
          <div className="voice-evo-body">
            {/* Bloco Central de Gravação de Voz */}
            <div className={`voice-evo-recorder-box ${isRecording ? 'is-recording' : ''}`}>
              {!isRecording ? (
                <div className="voice-evo-idle-state">
                  <button
                    type="button"
                    className="voice-evo-mic-btn"
                    onClick={startRecording}
                    title="Toque para iniciar a gravação da evolução por voz"
                  >
                    <Mic size={32} />
                  </button>
                  <div className="voice-evo-mic-instructions">
                    <strong>Toque no microfone para ditar a evolução</strong>
                    <span>
                      Exemplo: <em>"Davi estável, boa saturação, conduta: sentado, mobilização de membros..."</em>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="voice-evo-active-state">
                  <div className="voice-evo-pulse-wave">
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                    <span className="wave-bar"></span>
                  </div>

                  <div className="voice-evo-recording-meta">
                    <span className="voice-evo-recording-tag">● Gravando ({formatSeconds(recordingSeconds)})</span>
                    <span className="voice-evo-recording-tip">Fale naturalmente com a conduta do atendimento...</span>
                  </div>

                  <button
                    type="button"
                    className="voice-evo-stop-btn"
                    onClick={stopRecordingAndProcess}
                  >
                    <Square size={16} fill="currentColor" /> Parar & Estruturar com IA
                  </button>
                </div>
              )}

              {/* Player do Áudio Gravado */}
              {audioUrl && !isRecording && (
                <div className="voice-evo-audio-player">
                  <button
                    type="button"
                    className="voice-evo-play-btn"
                    onClick={togglePlayAudio}
                  >
                    {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <div className="voice-evo-audio-info">
                    <Volume2 size={15} color="var(--primary)" />
                    <span>Áudio gravado com sucesso ({formatSeconds(recordingSeconds)})</span>
                  </div>
                  <button
                    type="button"
                    className="voice-evo-redo-btn"
                    onClick={startRecording}
                    title="Gravar novamente"
                  >
                    <RotateCcw size={14} /> Gravar de novo
                  </button>
                </div>
              )}
            </div>

            {/* Chips de Atalho Rápido de Condutas */}
            <div className="voice-evo-chips-section">
              <span className="voice-evo-chips-title">Atalhos rápidos para adicionar à evolução:</span>
              <div className="voice-evo-chips-row">
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('paciente estável')}
                >
                  🟢 Estável
                </button>
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('boa saturação 98%')}
                >
                  🫁 Boa saturação (98%)
                </button>
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('conduta: sentado no leito')}
                >
                  🪑 Sentado no leito
                </button>
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('mobilização ativa e passiva de membros')}
                >
                  💪 Mobilização de membros
                </button>
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('treino de marcha com auxílio')}
                >
                  🚶 Treino de marcha
                </button>
                <button
                  type="button"
                  className="voice-evo-chip"
                  onClick={() => handleAddQuickKeyword('orientado cuidador sobre decúbito')}
                >
                  🛡️ Orientado cuidador
                </button>
              </div>
            </div>

            {/* Texto Transcrito da Fala */}
            <div className="voice-evo-transcription-box">
              <div className="voice-evo-box-header">
                <span className="voice-evo-box-label">
                  <Mic size={14} /> Fala da Profissional (Transcrição em Tempo Real):
                </span>
                {rawTranscription && (
                  <button
                    type="button"
                    className="voice-evo-btn-reparse"
                    onClick={() => processTranscriptionWithAI()}
                  >
                    <Sparkles size={13} /> Reestruturar com IA
                  </button>
                )}
              </div>
              <textarea
                className="voice-evo-textarea"
                rows={2}
                placeholder="O texto falado aparecerá aqui automaticamente..."
                value={rawTranscription}
                onChange={(e) => {
                  setRawTranscription(e.target.value);
                  processTranscriptionWithAI(e.target.value);
                }}
              />
            </div>

            {/* Ficha Estruturada SOAP Gerada pela IA */}
            <div className="voice-evo-soap-container">
              <div className="voice-evo-soap-header">
                <span className="voice-evo-soap-title">
                  <Sparkles size={15} color="#059669" /> Evolução Estruturada com IA (SOAP)
                </span>
                {detectedKeywords.length > 0 && (
                  <div className="voice-evo-tags">
                    {detectedKeywords.slice(0, 3).map((kw, idx) => (
                      <span key={idx} className="voice-evo-tag">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sinais Vitais no Domicílio */}
              <div className="voice-evo-vitals-grid">
                <div className="voice-evo-vital-cell">
                  <label>PA (mmHg)</label>
                  <input
                    type="text"
                    value={vitals.bloodPressure || '120/80'}
                    onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                  />
                </div>
                <div className="voice-evo-vital-cell">
                  <label>SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitals.oxygenSaturation || 98}
                    onChange={(e) => setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })}
                  />
                </div>
                <div className="voice-evo-vital-cell">
                  <label>FC (bpm)</label>
                  <input
                    type="number"
                    value={vitals.heartRate || 75}
                    onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                  />
                </div>
                <div className="voice-evo-vital-cell">
                  <label>Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperature || 36.5}
                    onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Subjetivo e Objetivo */}
              <div className="voice-evo-field">
                <label className="voice-evo-field-label">S - Subjetivo (Estado e Queixas):</label>
                <textarea
                  className="voice-evo-input-soap"
                  rows={2}
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  placeholder="Paciente estável, sem queixas álgicas..."
                />
              </div>

              <div className="voice-evo-field">
                <label className="voice-evo-field-label">P - Conduta Terapêutica Realizada (Plano):</label>
                <textarea
                  className="voice-evo-input-soap"
                  rows={3}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  placeholder="Sedestação assistida, mobilização de membros..."
                />
              </div>
            </div>

            {/* Ações Inferiores */}
            <div className="voice-evo-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn btn-primary voice-evo-save-btn"
                onClick={handleSave}
              >
                <CheckCircle2 size={18} /> Salvar no Prontuário
                {appointment?.status === 'in_progress' ? ' & Concluir Sessão' : ''}
              </button>
            </div>
          </div>
        ) : (
          /* Aba de Histórico de Evoluções */
          <div className="voice-evo-history-body">
            {patientHistory.length === 0 ? (
              <div className="voice-evo-empty-history">
                <FileText size={40} color="var(--text-muted)" />
                <h4>Nenhuma evolução anterior</h4>
                <p>Grave a primeira evolução por voz deste paciente tocando na aba acima.</p>
              </div>
            ) : (
              <div className="voice-evo-history-list">
                {patientHistory.map((evo) => (
                  <div key={evo.id} className="voice-evo-history-card">
                    <div className="voice-evo-hist-header">
                      <div>
                        <strong>{evo.professionalName}</strong>
                        <span className="voice-evo-hist-date">
                          {evo.date} às {evo.time}
                        </span>
                      </div>
                      <span className="voice-evo-hist-vitals">
                        PA {evo.vitals?.bloodPressure || '120/80'} • SpO2 {evo.vitals?.oxygenSaturation || 98}%
                      </span>
                    </div>

                    {evo.summarizedConduct && (
                      <div className="voice-evo-hist-conduta">
                        <strong>Conduta: </strong>{evo.summarizedConduct}
                      </div>
                    )}

                    {evo.subjective && (
                      <p className="voice-evo-hist-snippet">
                        <strong>S: </strong>{evo.subjective}
                      </p>
                    )}

                    {evo.plan && (
                      <p className="voice-evo-hist-snippet">
                        <strong>P: </strong>{evo.plan}
                      </p>
                    )}

                    {evo.audioRecordingUrl && (
                      <div className="voice-evo-hist-audio">
                        <audio controls src={evo.audioRecordingUrl} style={{ height: '32px', width: '100%', marginTop: '6px' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
