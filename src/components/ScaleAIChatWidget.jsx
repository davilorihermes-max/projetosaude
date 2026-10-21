// src/components/ScaleAIChatWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Minimize2,
  Key,
  ExternalLink
} from 'lucide-react';
import { ScaleAIAgent } from '../services/scale-ai-agent';
import './ScaleAIChatWidget.css';

const CHAT_STORAGE_KEY = 'projeto_saude_scale_ai_chat_messages_v1';

const getInitialMessages = () => {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar mensagens salvas do chat:', err);
  }
  return [
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Olá! Sou o **Copiloto Clínico & Operacional de Escala** da clínica. 🧠✨\n\nEstou conectado à escala deste mês em tempo real com **visão raio-X de toda a grade, rotas urbanas e Care Teams**.\n\nExperimente perguntar: *"Por que o Gabriel não teve as metas atendidas?"*, *"Quais os atendimentos do fisio1?"* ou *"Como otimizar os deslocamentos na quinta-feira?"*!`,
      timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
      actions: []
    }
  ];
};

export default function ScaleAIChatWidget({
  isOpen,
  onClose,
  isDocked = false,
  context,
  onApplyMutation,
  onRunRecalculate
}) {
  const [messages, setMessages] = useState(getInitialMessages);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => ScaleAIAgent.getStoredApiKey());
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Persiste mensagens no localStorage para nunca perder o chat ao mudar de tela
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn('Erro ao persistir chat IA no localStorage:', err);
    }
  }, [messages]);

  // Atualiza mensagem de boas-vindas com ações sugeridas se houver gargalos
  useEffect(() => {
    if (context?.scaleResult && messages.length === 1 && messages[0].id === 'welcome-msg') {
      const diag = ScaleAIAgent.diagnoseScale(context);
      if (diag.suggestedActions.length > 0) {
        setMessages((prev) => [
          {
            ...prev[0],
            actions: diag.suggestedActions.slice(0, 3)
          }
        ]);
      }
    }
  }, [context?.scaleResult]);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const cleanKey = tempKeyInput.trim();
    if (cleanKey) {
      ScaleAIAgent.setStoredApiKey(cleanKey);
      setGeminiApiKey(cleanKey);
      setIsKeyModalOpen(false);
      setTempKeyInput('');
      setMessages((prev) => [
        ...prev,
        {
          id: `key-saved-${Date.now()}`,
          sender: 'assistant',
          text: `🎉 **Google Gemini 2.5 Flash conectado com sucesso!** A partir de agora, o Copiloto usará a IA Generativa de ponta da Google para analisar detalhadamente a escala, rotas urbanas e viabilidades.`,
          timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5)
        }
      ]);
    }
  };

  const handleRemoveApiKey = () => {
    ScaleAIAgent.setStoredApiKey(null);
    setGeminiApiKey(null);
    setIsKeyModalOpen(false);
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5)
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Processamento assíncrono avançado com suporte ao Google Gemini
      const result = await ScaleAIAgent.processMessageAsync(text, context);

      // Se houve mutação de parâmetros, aplica ao estado global do planejador
      if (result.mutated) {
        onApplyMutation({
          newPatientsWithDemands: result.newPatientsWithDemands,
          newProfessionalAvailabilities: result.newProfessionalAvailabilities,
          newCareTeams: result.newCareTeams,
          newFixedAppointments: result.newFixedAppointments
        });
      }

      const agentMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
        actions: result.suggestedActions,
        actionExecuted: result.actionExecuted
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Desculpe, tive uma dificuldade para processar essa instrução: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5)
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteAction = (action) => {
    setIsTyping(true);
    setTimeout(() => {
      try {
        const result = ScaleAIAgent.executeAction(action, context);

        if (result.mutated) {
          onApplyMutation({
            newPatientsWithDemands: result.newPatientsWithDemands,
            newProfessionalAvailabilities: result.newProfessionalAvailabilities,
            newCareTeams: result.newCareTeams,
            newFixedAppointments: result.newFixedAppointments
          });
        }

        const agentMsg = {
          id: `ai-act-${Date.now()}`,
          sender: 'assistant',
          text: result.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
          actionExecuted: result.actionExecuted
        };

        setMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        console.error('Erro ao executar ação da IA:', err);
      } finally {
        setIsTyping(false);
      }
    }, 350);
  };

  const handleResetChat = () => {
    const welcomeMsg = [
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reiniciado. Como posso te orientar sobre a escala criada ou ajustar parâmetros agora?`,
        timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
        actions: context ? ScaleAIAgent.diagnoseScale(context).suggestedActions.slice(0, 3) : []
      }
    ];
    setMessages(welcomeMsg);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(welcomeMsg));
    } catch (err) {}
  };

  const firstProf = context?.professionalAvailabilities?.[0];
  const firstProfName = firstProf?.professionalName || firstProf?.name;
  const firstPat = context?.patientsWithDemands?.[0];
  const firstPatName = firstPat?.patientName || firstPat?.name;

  const quickPrompts = [
    'Como ficou a escala deste mês?',
    'Quais os principais gargalos da escala?',
    'Quantos atendimentos foram agendados?',
    firstProfName ? `Atendimentos de ${firstProfName.split(' ')[0]}` : null,
    firstPatName ? `Situação de ${firstPatName.split(' ')[0]}` : null
  ].filter(Boolean);

  if (!isOpen && !isDocked) return null;

  const currentCoverage = context?.scaleResult?.summary?.overallCoveragePercent ?? context?.scaleResult?.summary?.globalCoveragePercent ?? 0;
  const bottlenecksCount = context?.scaleResult?.bottlenecks?.length ?? 0;

  return (
    <div className={`scale-ai-widget ${isDocked ? 'is-docked' : 'is-floating'} ${isExpanded ? 'is-expanded' : ''}`}>
      {/* Header do Chatbot */}
      <div className="ai-widget-header">
        <div className="ai-header-info">
          <div className="ai-avatar-badge">
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div>
            <div className="ai-title-row">
              <span className="ai-agent-name">Copiloto IA da Escala</span>
              <span className="ai-online-dot" />
              <button
                type="button"
                className={`ai-provider-badge ${geminiApiKey ? 'active-gemini' : 'local-engine'}`}
                onClick={() => {
                  setTempKeyInput(geminiApiKey || '');
                  setIsKeyModalOpen(true);
                }}
                title="Configurar Inteligência Artificial (Google Gemini 2.5 Flash)"
              >
                <Key size={11} />
                <span>{geminiApiKey ? 'Gemini 2.5 Flash' : 'Ativar Gemini IA'}</span>
              </button>
            </div>
            <div className="ai-status-subtext">
              Cobertura: <strong>{currentCoverage}%</strong> • {bottlenecksCount} gargalo(s)
            </div>
          </div>
        </div>

        <div className="ai-header-actions">
          <button
            type="button"
            className="ai-icon-btn"
            title="Configurar Chave do Google Gemini"
            onClick={() => {
              setTempKeyInput(geminiApiKey || '');
              setIsKeyModalOpen(true);
            }}
          >
            <Key size={15} />
          </button>

          <button
            type="button"
            className="ai-icon-btn"
            title="Reiniciar conversa"
            onClick={handleResetChat}
          >
            <RotateCcw size={15} />
          </button>

          {!isDocked && (
            <button
              type="button"
              className="ai-icon-btn"
              title={isExpanded ? 'Restaurar tamanho' : 'Expandir painel'}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}

          {!isDocked && onClose && (
            <button
              type="button"
              className="ai-icon-btn ai-close-btn"
              title="Fechar chat"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Sugestões Rápidas em Chips */}
      <div className="ai-quick-prompts-bar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="ai-quick-chip"
            onClick={() => handleSendMessage(prompt)}
          >
            💡 {prompt}
          </button>
        ))}
      </div>

      {/* Área de Mensagens */}
      <div className="ai-messages-container">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div key={msg.id} className={`ai-message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
              <div className="ai-message-avatar">
                {isUser ? <User size={15} /> : <Bot size={15} />}
              </div>

              <div className="ai-message-bubble">
                {/* Badge de Ação Executada */}
                {msg.actionExecuted && (
                  <div className="ai-action-executed-badge">
                    <Zap size={13} color="#059669" />
                    <span>Ação Aplicada no Sistema: <strong>{msg.actionExecuted.description}</strong></span>
                  </div>
                )}

                {/* Conteúdo da Mensagem com quebras de linha e formatação */}
                <div className="ai-message-text">
                  {(msg.text || "").split('\n').map((line, lIdx) => {
                    if (!line.trim()) return <div key={lIdx} style={{ height: '0.4rem' }} />;

                    // Suporte simples a títulos markdown ###
                    if (line.startsWith('### ')) {
                      return <h4 key={lIdx} className="ai-md-h3">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('#### ')) {
                      return <h5 key={lIdx} className="ai-md-h4">{line.replace('#### ', '')}</h5>;
                    }

                    // Formatação de negrito **
                    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                    return (
                      <p key={lIdx} className="ai-md-p">
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx}>{p.slice(2, -2)}</strong>;
                          }
                          if (p.startsWith('*') && p.endsWith('*')) {
                            return <em key={pIdx}>{p.slice(1, -1)}</em>;
                          }
                          return p;
                        })}
                      </p>
                    );
                  })}
                </div>

                {/* Ações sugeridas pela IA com botões interativos */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="ai-suggested-actions-box">
                    <div className="ai-actions-title">
                      <Zap size={13} /> Ações Recomendadas pela IA (Clique para aplicar):
                    </div>
                    <div className="ai-actions-grid">
                      {msg.actions.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          className="ai-action-btn"
                          onClick={() => handleExecuteAction(act)}
                        >
                          <span className="ai-action-btn-icon">⚡</span>
                          <div>
                            <div className="ai-action-btn-label">{act.label}</div>
                            {act.description && <div className="ai-action-btn-desc">{act.description}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ai-message-time">{msg.timestamp}</div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="ai-message-row assistant-row">
            <div className="ai-message-avatar">
              <Bot size={15} />
            </div>
            <div className="ai-message-bubble ai-typing-bubble">
              <div className="ai-typing-indicator">
                <span /><span /><span />
              </div>
              <span className="ai-typing-text">Analisando a escala e roteirização...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Formulário de Envio */}
      <form
        className="ai-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="ai-input-field"
          placeholder="Peça um diagnóstico ou comando (ex: 'Adicione Dr. Rafael no Care Team da Mariana')..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isTyping}
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={!inputText.trim() || isTyping}
          title="Enviar mensagem para o Copiloto IA"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Modal de Configuração da Chave da API do Gemini */}
      {isKeyModalOpen && (
        <div className="gemini-key-modal-overlay" onClick={() => setIsKeyModalOpen(false)}>
          <div className="gemini-key-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gemini-key-modal-header">
              <div className="gemini-key-modal-title">
                <Sparkles size={18} color="#2563eb" />
                <span>Configurar Google Gemini IA</span>
              </div>
              <button
                type="button"
                className="ai-icon-btn"
                onClick={() => setIsKeyModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="gemini-modal-desc">
              Conecte o <strong>Google Gemini 2.5 Flash</strong> para que o Copiloto faça análises profundas da malha de escalas, rotas urbanas de deslocamento e sugestões de remanejamento com inteligência artificial generativa de última geração.
            </p>

            <form onSubmit={handleSaveApiKey} className="gemini-modal-form">
              <label className="gemini-modal-label">
                Google AI Studio API Key:
              </label>
              <input
                type="password"
                className="gemini-key-input"
                placeholder="AIzaSy..."
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                autoFocus
              />

              <div className="gemini-key-hint">
                <span>Obtenha sua chave gratuita em:</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gemini-link"
                >
                  aistudio.google.com <ExternalLink size={12} />
                </a>
              </div>

              <div className="gemini-modal-actions">
                {geminiApiKey && (
                  <button
                    type="button"
                    className="btn-remove-key"
                    onClick={handleRemoveApiKey}
                  >
                    Desconectar (Usar Motor Local)
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setIsKeyModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save-key"
                  disabled={!tempKeyInput.trim()}
                >
                  Salvar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
