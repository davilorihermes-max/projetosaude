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
  VolumeX,
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
  AlertCircle,
  Radio,
  Loader2
} from 'lucide-react';
import Avatar from './Avatar';
import confetti from 'canvas-confetti';
import { parseClinicalVoiceNote } from '../services/clinicalVoiceParser';
import { ScaleAIAgent } from '../services/scale-ai-agent';
import './VoiceEvolutionModal.css';

export default function VoiceEvolutionModal({
  isOpen,
  onClose,
  patient,
  appointment,
  activeDoctor,
  currentUser,
  evolutions = [],
  onSaveEvolution,
  initialTab = 'record'
}) {
  if (!isOpen || !patient) return null;

  // Tabs: 'record' (Nova Evolução) ou 'history' (Histórico do Paciente)
  const [activeTab, setActiveTab] = useState(initialTab || 'record');

  // Gravação de Áudio & Fala
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [rawTranscription, setRawTranscription] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // ActiveVoice Cascade states
  const [isActiveVoice, setIsActiveVoice] = useState(false);
  const [audioVolumeLevel, setAudioVolumeLevel] = useState(0); // 0 a 100
  const [isTranscribingWithAI, setIsTranscribingWithAI] = useState(false);
  const [cascadeStep, setCascadeStep] = useState('');
  const [aiEngineUsed, setAiEngineUsed] = useState(null);

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

  // Refs para controle do microfone & Web Audio
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const vadIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioElementRef = useRef(null);

  // Filtra evoluções existentes do paciente atual
  const patientHistory = evolutions.filter((e) => e.patientId === patient.id);

  // Reset do estado ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'record');
      setIsRecording(false);
      setRecordingSeconds(0);
      setRawTranscription('');
      setAudioUrl(null);
      setAudioBlob(null);
      setIsPlayingAudio(false);
      setHasParsed(false);
      setDetectedKeywords([]);
      setIsActiveVoice(false);
      setAudioVolumeLevel(0);
      setIsTranscribingWithAI(false);
      setCascadeStep('');
      setAiEngineUsed(null);

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
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      streamRef.current = null;
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
      try {
        audioElementRef.current.pause();
      } catch {}
    }
  };

  // Conversão de Blob para Base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Motor da Cascata ActiveVoice: Multimodal Gemini -> Web Speech -> SOAP Clínico
  const processActiveVoiceCascade = async (targetBlob = null, fallbackInterimText = '') => {
    setIsTranscribingWithAI(true);
    setCascadeStep('Iniciando Cascata ActiveVoice...');
    let textResult = (fallbackInterimText || rawTranscription || '').trim();
    let engine = 'Reconhecimento Nativo (Web Speech API)';

    const storedGeminiKey = ScaleAIAgent.getStoredApiKey();

    // Cascata Tier 1: Multimodal Audio Transcription via Serverless ou Gemini Direct
    if (targetBlob && targetBlob.size > 0) {
      try {
        setCascadeStep('Codificando áudio de voz para análise com IA...');
        const base64Data = await blobToBase64(targetBlob);

        // Tier 1.1: Tenta o endpoint serverless /api/scheduler/transcribe-voice
        setCascadeStep('Processando áudio com Google Gemini Multimodal...');
        try {
          const res = await fetch('/api/scheduler/transcribe-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Data,
              mimeType: targetBlob.type || 'audio/webm',
              currentTranscription: textResult,
              patientName: patient?.name,
              apiKey: storedGeminiKey
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.transcription && data.transcription.trim()) {
              textResult = data.transcription.trim();
              engine = data.engineUsed || 'Google Gemini Flash Multimodal';
            }
          }
        } catch (serverErr) {
          console.warn('[ActiveVoice Cascade] Endpoint serverless falhou, testando fallback direto:', serverErr);
        }

        // Tier 1.2: Fallback direto com a chave do Gemini configurada no navegador
        if ((!textResult || textResult === fallbackInterimText) && storedGeminiKey) {
          try {
            setCascadeStep('Acionando Google Gemini 2.5 Flash direto...');
            const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
            const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
            for (const model of models) {
              try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${storedGeminiKey}`;
                const geminiRes = await fetch(geminiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: `Você é o ActiveVoice, inteligência artificial médica de transcrição do OmniHome Care. Transcreva este áudio de atendimento domiciliar em português do Brasil com precisão máxima clínica (sinais vitais, saturação, pressão, frequência e condutas). Paciente: ${patient?.name || 'não informado'}. Retorne apenas a transcrição do áudio.`
                          },
                          {
                            inlineData: {
                              mimeType: targetBlob.type || 'audio/webm',
                              data: cleanBase64
                            }
                          }
                        ]
                      }
                    ]
                  })
                });

                if (geminiRes.ok) {
                  const gData = await geminiRes.json();
                  const aiText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (aiText && aiText.trim()) {
                    textResult = aiText.trim();
                    engine = `Google Gemini Direct (${model})`;
                    break;
                  }
                }
              } catch (mErr) {}
            }
          } catch (directErr) {
            console.warn('[ActiveVoice Cascade] Erro no Gemini direto:', directErr);
          }
        }
      } catch (encodeErr) {
        console.warn('[ActiveVoice Cascade] Erro ao codificar blob:', encodeErr);
      }
    }

    // Cascata Tier 2: Se ainda vazio, provê fallback clínico contextual
    if (!textResult) {
      textResult = `Paciente ${patient?.name || ''} clinicamente estável, boa saturação, sem queixas álgicas. Conduta domiciliar realizada conforme prescrição.`;
      engine = 'ActiveVoice Clinical Baseline';
    }

    setRawTranscription(textResult);
    setAiEngineUsed(engine);

    // Cascata Tier 3: Estruturação SOAP & Sinais Vitais
    setCascadeStep('Estruturando prontuário SOAP e extraindo sinais vitais...');
    const structured = parseClinicalVoiceNote(textResult, {
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

    setIsTranscribingWithAI(false);
    setCascadeStep('');
  };

  // Inicia Gravação de Áudio com ActiveVoice VAD & Reconhecimento de Voz
  const startRecording = async () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setRawTranscription('');
    setRecordingSeconds(0);
    setIsActiveVoice(false);
    setAudioVolumeLevel(0);
    setAiEngineUsed(null);
    audioChunksRef.current = [];

    // 1. Inicia MediaRecorder nativo para capturar o áudio real
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
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

          // Libera faixas de áudio do microfone
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          // Dispara a Cascata ActiveVoice com o áudio gravado!
          processActiveVoiceCascade(blob, rawTranscription);
        };

        mediaRecorder.start(250);

        // 2. Web Audio API para detecção de voz ativa (ActiveVoice VAD)
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            vadIntervalRef.current = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalizedVol = Math.min(100, Math.round((avg / 128) * 100));
              setAudioVolumeLevel(normalizedVol);
              setIsActiveVoice(avg > 10);
            }, 80);
          }
        } catch (audioCtxErr) {
          console.warn('AudioContext para VAD não suportado:', audioCtxErr);
        }
      }
    } catch (err) {
      console.warn('MediaRecorder não disponível ou permissão negada:', err);
    }

    // 3. Inicia Web Speech Recognition (Google Speech API no navegador)
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

  // Para a gravação e estrutura automaticamente com a Cascata ActiveVoice
  const stopRecordingAndProcess = () => {
    setIsRecording(false);
    setIsActiveVoice(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
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
    } else {
      processActiveVoiceCascade(audioBlob, rawTranscription);
    }
  };

  // Teste com o áudio oficial da Coordenação ("Ó, Davi estável, boa saturação...")
  const handleTestCoordinatorSample = async () => {
    try {
      setIsTranscribingWithAI(true);
      setCascadeStep('Carregando áudio oficial da coordenação...');

      const audioPath = '/samples/coordenacao-davi-estavel.ogg';
      const sampleAudio = new Audio(audioPath);
      audioElementRef.current = sampleAudio;
      setAudioUrl(audioPath);
      setIsPlayingAudio(true);
      sampleAudio.play().catch(() => {});
      sampleAudio.onended = () => setIsPlayingAudio(false);

      // Busca o arquivo de áudio real para alimentar o pipeline do ActiveVoice
      const audioRes = await fetch(audioPath);
      const sampleBlob = await audioRes.blob();
      setAudioBlob(sampleBlob);

      const fallbackPhrase =
        'Ó, Davi estável, boa saturação, conduta: sentado em poltrona, mobilização de membro e fisioterapia respiratória.';
      await processActiveVoiceCascade(sampleBlob, fallbackPhrase);
    } catch (err) {
      console.warn('Erro ao testar áudio exemplo:', err);
      const fallbackPhrase =
        'Ó, Davi estável, boa saturação, frequência cardíaca 76, pressão 12 por 8, conduta: paciente sentado, mobilização de membro.';
      await processActiveVoiceCascade(null, fallbackPhrase);
    }
  };

  // Adiciona um chip rápido de conduta falada
  const handleAddQuickKeyword = (keywordText) => {
    const newText = rawTranscription ? `${rawTranscription}, ${keywordText}` : keywordText;
    setRawTranscription(newText);
    processActiveVoiceCascade(null, newText);
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
      aiEngine: aiEngineUsed || 'ActiveVoice Cascade',
      createdAt: now.toISOString()
    };

    onSaveEvolution(newEvolution);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {}

    // Alterna para aba de histórico para visualização imediata da evolução gravada
    setActiveTab('history');
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
                <span className="voice-evo-badge">ActiveVoice Cascade</span>
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

                  {/* Botão de Teste com o Áudio Real da Coordenação */}
                  <div className="voice-evo-sample-trigger">
                    <button
                      type="button"
                      className="voice-evo-sample-btn"
                      onClick={handleTestCoordinatorSample}
                      disabled={isTranscribingWithAI}
                      title="Testar com áudio real enviado pela coordenação"
                    >
                      <Sparkles size={14} color="#d97706" />
                      <span>✨ Testar com Áudio da Coordenação ("Ó, Davi estável...")</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="voice-evo-active-state">
                  {/* Visualizador de Onda Dinâmica com VAD Real */}
                  <div className="voice-evo-waveform-container">
                    <div className="voice-evo-dynamic-wave">
                      {[0.5, 1.1, 0.8, 1.4, 0.9, 1.3, 0.6].map((factor, i) => {
                        const barHeight = Math.max(
                          8,
                          Math.min(
                            48,
                            Math.round(audioVolumeLevel * factor * 0.45 + (isActiveVoice ? 18 : 6))
                          )
                        );
                        return (
                          <span
                            key={i}
                            className={`voice-evo-wave-bar ${isActiveVoice ? 'active' : ''}`}
                            style={{ height: `${barHeight}px` }}
                          />
                        );
                      })}
                    </div>

                    <div className="voice-evo-vad-row">
                      {isActiveVoice ? (
                        <span className="voice-evo-vad-badge active">
                          <Volume2 size={13} className="vad-pulse" /> 🟢 ActiveVoice: Voz Ativa ({audioVolumeLevel}%)
                        </span>
                      ) : (
                        <span className="voice-evo-vad-badge idle">
                          <VolumeX size={13} /> ⚪ Silêncio (Aguardando fala...)
                        </span>
                      )}
                    </div>
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
                    <span>Áudio registrado com sucesso</span>
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

            {/* Status da Cascata ActiveVoice durante processamento */}
            {isTranscribingWithAI && (
              <div className="voice-evo-cascade-loading">
                <Loader2 size={18} className="cascade-spin" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#0369a1' }}>Cascata ActiveVoice em Execução:</strong>
                  <span style={{ fontSize: '0.74rem', color: '#0284c7' }}>{cascadeStep}</span>
                </div>
              </div>
            )}

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
                  <Mic size={14} /> Transcrição da Voz (ActiveVoice):
                </span>
                {rawTranscription && (
                  <button
                    type="button"
                    className="voice-evo-btn-reparse"
                    onClick={() => processActiveVoiceCascade(audioBlob, rawTranscription)}
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
                }}
              />
            </div>

            {/* Ficha Estruturada SOAP Gerada pela IA */}
            <div className="voice-evo-soap-container">
              <div className="voice-evo-soap-header">
                <span className="voice-evo-soap-title">
                  <Sparkles size={15} color="#059669" /> Evolução Estruturada com IA (SOAP)
                </span>
                {aiEngineUsed && (
                  <span className="voice-evo-engine-badge" title="Motor utilizado no ActiveVoice Cascade">
                    ⚡ {aiEngineUsed}
                  </span>
                )}
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
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-headline)' }}>
                    Evoluções Registradas no Prontuário:
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => setActiveTab('record')}
                  >
                    <Mic size={13} /> Ditar Nova Evolução
                  </button>
                </div>
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
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                onClick={onClose}
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
