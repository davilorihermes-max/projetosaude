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
  Minimize2
} from 'lucide-react';
import { ScaleAIAgent } from '../services/scale-ai-agent';
import './ScaleAIChatWidget.css';

export default function ScaleAIChatWidget({
  isOpen,
  onClose,
  isDocked = false,
  context,
  onApplyMutation,
  onRunRecalculate
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `Olá! Sou o **Copiloto Inteligente de Escala e Roteirização** da clínica. 🧠\n\nEstou analisando a escala deste mês em tempo real para te ajudar a **identificar gargalos**, entender por que pacientes não atingiram a meta e **alterar parâmetros diretamente pelo chat**.\n\nExperimente clicar em uma das sugestões abaixo ou digite seu comando em linguagem natural!`,
      timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
      actions: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Atualiza mensagem de boas-vindas com ações sugeridas se houver gargalos
  useEffect(() => {
    if (context?.scaleResult && messages.length === 1) {
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

  const handleSendMessage = (textToSend = inputText) => {
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

    // Simula processamento ágil do agente de IA
    setTimeout(() => {
      try {
        const result = ScaleAIAgent.processMessage(text, context);

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
    }, 450);
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
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reiniciado. Como posso te orientar ou ajustar a escala agora?`,
        timestamp: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
        actions: ScaleAIAgent.diagnoseScale(context).suggestedActions.slice(0, 3)
      }
    ]);
  };

  const quickPrompts = [
    'Quais os principais gargalos para fechar a escala?',
    'Como atingir 100% de cobertura?',
    'Quais profissionais têm horários ociosos?',
    context?.patientsWithDemands[0] ? `Situação de ${context.patientsWithDemands[0].patientName}` : null
  ].filter(Boolean);

  if (!isOpen && !isDocked) return null;

  const currentCoverage = context?.scaleResult?.summary?.globalCoveragePercent ?? 0;
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
                  {msg.text.split('\n').map((line, lIdx) => {
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
    </div>
  );
}
