// src/components/MonthlyFinancialSettlementView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  X
} from 'lucide-react';
import Avatar from './Avatar';
import './MonthlyFinancialSettlementView.css';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthlyFinancialSettlementView({
  doctors = [],
  patients = [],
  appointments = [],
  currentUser
}) {
  // 1. Determina o profissional ativo
  const [selectedProId, setSelectedProId] = useState(() => {
    if (currentUser?.professional?.id) return currentUser.professional.id;
    const foundDoc = doctors.find(
      (d) => d.userId === currentUser?.id || (d.email && d.email.toLowerCase() === currentUser?.email?.toLowerCase())
    );
    if (foundDoc) return foundDoc.id;
    return doctors[0]?.id || 'prof-es-1';
  });

  const activeProfessional = useMemo(() => {
    return doctors.find((d) => d.id === selectedProId) || doctors[0] || {
      id: selectedProId,
      name: 'Dr. Profissional',
      crm: 'CREFITO Ativo',
      specialty: 'Fisioterapia Domiciliar'
    };
  }, [doctors, selectedProId]);

  // Competência selecionada
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // Outubro
  const [activeSubtab, setActiveSubtab] = useState('statement'); // 'statement' | 'pricing'

  // Mensagens de feedback
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tabela de Preços do Profissional (Persistida por profissional)
  const defaultPricingStorageKey = `omnihome_pricing_${activeProfessional?.id}`;
  const [pricingRules, setPricingRules] = useState(() => {
    try {
      const saved = localStorage.getItem(defaultPricingStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      defaultHourlyRate: 180.0,
      patientRates: {} // { [patientId]: { hourlyRate: number, fixedSessionPrice?: number } }
    };
  });

  // Atualiza tabela de preços ao trocar profissional
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`omnihome_pricing_${activeProfessional?.id}`);
      if (saved) {
        setPricingRules(JSON.parse(saved));
      } else {
        setPricingRules({
          defaultHourlyRate: 180.0,
          patientRates: {}
        });
      }
    } catch {}
  }, [activeProfessional?.id]);

  // Lista de Atendimentos do Mês (Localmente mantida para permitir inclusão, edição e exclusão)
  const settlementStorageKey = `omnihome_sessions_${activeProfessional?.id}_${selectedYear}_${selectedMonth}`;
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(settlementStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Inicializa ou sincroniza sessões ao trocar mês/ano ou profissional
  useEffect(() => {
    const saved = localStorage.getItem(settlementStorageKey);
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
        return;
      } catch {}
    }

    // Se não há dados salvos para esta competência, extrai dos agendamentos existentes
    const proApts = (appointments || []).filter((apt) => {
      if (!apt) return false;
      const aptDocId = apt.doctorId || apt.professionalId;
      if (aptDocId !== activeProfessional?.id) return false;
      if (apt.status === 'cancelled') return false;

      const dateStr = apt.date || apt.scheduledTime;
      if (!dateStr) return false;
      const aptDate = new Date(dateStr);
      if (isNaN(aptDate.getTime())) return false;

      return aptDate.getMonth() + 1 === selectedMonth && aptDate.getFullYear() === selectedYear;
    });

    const hourlyRateDefault = pricingRules.defaultHourlyRate || 180.0;

    const initialSessions = proApts.map((apt, idx) => {
      const pat = (patients || []).find((p) => p.id === apt.patientId) || {};
      const dur = apt.durationMinutes || apt.duration || 45;
      const patConfig = pricingRules.patientRates[apt.patientId];
      const hourlyRate = patConfig?.hourlyRate || hourlyRateDefault;
      const sessionPrice = patConfig?.fixedSessionPrice || Math.round((hourlyRate * (dur / 60)) * 100) / 100;

      return {
        id: apt.id || `sess-${idx}-${Date.now()}`,
        patientId: apt.patientId || 'pat-es-1',
        patientName: pat.name || apt.patientName || 'Paciente',
        patientAddress: pat.address || apt.address || 'Vitória - ES',
        date: apt.date || (apt.scheduledTime ? apt.scheduledTime.slice(0, 10) : '2026-10-19'),
        time: apt.time || '08:30',
        durationMinutes: dur,
        hourlyRate: hourlyRate,
        sessionPrice: sessionPrice,
        notes: apt.notes || 'Sessão de Fisioterapia Domiciliar'
      };
    });

    setSessions(initialSessions);
  }, [activeProfessional?.id, selectedYear, selectedMonth]);

  // Salva no localStorage sempre que sessions for alterado
  const saveSessions = (newSessions) => {
    setSessions(newSessions);
    try {
      localStorage.setItem(settlementStorageKey, JSON.stringify(newSessions));
    } catch {}
  };

  // Modais de Criação / Edição de Atendimento
  const [editingSession, setEditingSession] = useState(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [modalPatientId, setModalPatientId] = useState('');
  const [modalDate, setModalDate] = useState('2026-10-19');
  const [modalTime, setModalTime] = useState('09:00');
  const [modalDuration, setModalDuration] = useState(45);
  const [modalHourlyRate, setModalHourlyRate] = useState(180.0);
  const [modalSessionPrice, setModalSessionPrice] = useState(135.0);
  const [modalNotes, setModalNotes] = useState('');

  // Ao alterar duração ou custo horário no modal, recalcula o valor da sessão
  const handleHourlyRateChange = (newRate) => {
    const rate = parseFloat(newRate) || 0;
    setModalHourlyRate(rate);
    setModalSessionPrice(Math.round((rate * (modalDuration / 60)) * 100) / 100);
  };

  const handleDurationChange = (newDur) => {
    const dur = parseInt(newDur, 10) || 45;
    setModalDuration(dur);
    setModalSessionPrice(Math.round((modalHourlyRate * (dur / 60)) * 100) / 100);
  };

  // Abre modal para novo atendimento
  const handleOpenNewSession = (targetPatientId = '') => {
    const defaultPat = targetPatientId || (patients[0]?.id || '');
    const patConfig = pricingRules.patientRates[defaultPat];
    const initialRate = patConfig?.hourlyRate || pricingRules.defaultHourlyRate || 180.0;
    const initialPrice = patConfig?.fixedSessionPrice || Math.round((initialRate * (45 / 60)) * 100) / 100;

    setEditingSession(null);
    setModalPatientId(defaultPat);
    setModalDate(`2026-${String(selectedMonth).padStart(2, '0')}-15`);
    setModalTime('09:00');
    setModalDuration(45);
    setModalHourlyRate(initialRate);
    setModalSessionPrice(initialPrice);
    setModalNotes('Atendimento Fisioterapêutico Domiciliar');
    setIsSessionModalOpen(true);
  };

  // Abre modal para editar atendimento existente
  const handleOpenEditSession = (sess) => {
    setEditingSession(sess);
    setModalPatientId(sess.patientId);
    setModalDate(sess.date);
    setModalTime(sess.time || '09:00');
    setModalDuration(sess.durationMinutes || 45);
    setModalHourlyRate(sess.hourlyRate || 180.0);
    setModalSessionPrice(sess.sessionPrice || 135.0);
    setModalNotes(sess.notes || '');
    setIsSessionModalOpen(true);
  };

  // Salva Atendimento (Inclusão ou Edição)
  const handleSaveSession = (e) => {
    e.preventDefault();
    const pat = (patients || []).find((p) => p.id === modalPatientId) || {};

    const updatedItem = {
      id: editingSession ? editingSession.id : `sess-manual-${Date.now()}`,
      patientId: modalPatientId,
      patientName: pat.name || 'Paciente',
      patientAddress: pat.address || 'Vitória - ES',
      date: modalDate,
      time: modalTime,
      durationMinutes: parseInt(modalDuration, 10),
      hourlyRate: parseFloat(modalHourlyRate),
      sessionPrice: parseFloat(modalSessionPrice),
      notes: modalNotes
    };

    let newSessions;
    if (editingSession) {
      newSessions = (sessions || []).map((s) => (s.id === editingSession.id ? updatedItem : s));
      setFeedbackMsg('Atendimento e valores atualizados com sucesso!');
    } else {
      newSessions = [...(sessions || []), updatedItem];
      setFeedbackMsg('Novo atendimento incluído no fechamento com sucesso!');
    }

    saveSessions(newSessions);
    setIsSessionModalOpen(false);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // Exclui Atendimento
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Deseja realmente excluir este atendimento do fechamento mensal?')) {
      const newSessions = (sessions || []).filter((s) => s.id !== sessionId);
      saveSessions(newSessions);
      setFeedbackMsg('Atendimento removido do fechamento.');
      setTimeout(() => setFeedbackMsg(''), 3000);
    }
  };

  // Agrupamento dos Atendimentos por Paciente
  const groupedByPatient = useMemo(() => {
    const map = {};
    (sessions || []).forEach((sess) => {
      const pId = sess.patientId;
      if (!map[pId]) {
        map[pId] = {
          patientId: pId,
          patientName: sess.patientName,
          patientAddress: sess.patientAddress,
          items: [],
          totalDurationMinutes: 0,
          totalAmount: 0
        };
      }
      map[pId].items.push(sess);
      map[pId].totalDurationMinutes += sess.durationMinutes || 45;
      map[pId].totalAmount += sess.sessionPrice || 0;
    });

    // Ordena os atendimentos de cada paciente por data crescente
    Object.values(map).forEach((group) => {
      group.items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    });

    return Object.values(map);
  }, [sessions]);

  // Totalizadores Gerais do Mês
  const monthTotalCount = (sessions || []).length;
  const monthTotalMinutes = (sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 45), 0);
  const monthTotalGross = (sessions || []).reduce((acc, s) => acc + (s.sessionPrice || 0), 0);
  const monthTotalHoursFormatted = `${Math.floor(monthTotalMinutes / 60)}h ${monthTotalMinutes % 60}m`;
  const averagePricePerSession = monthTotalCount > 0 ? Math.round((monthTotalGross / monthTotalCount) * 100) / 100 : 0;

  // Exportar Extrato CSV Individual
  const handleExportCSV = () => {
    if (!sessions || sessions.length === 0) {
      alert('Não há atendimentos registrados nesta competência para exportar.');
      return;
    }

    const rows = [
      ['Competência', 'Profissional', 'CRM', 'Paciente', 'Endereço', 'Data', 'Horário', 'Duração (min)', 'Custo Horário (R$/h)', 'Valor Total (R$)', 'Observações']
    ];

    sessions.forEach((s) => {
      rows.push([
        `${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`,
        `"${activeProfessional.name}"`,
        `"${activeProfessional.councilNumber || activeProfessional.crm}"`,
        `"${s.patientName}"`,
        `"${s.patientAddress}"`,
        s.date,
        s.time,
        s.durationMinutes,
        s.hourlyRate.toFixed(2),
        s.sessionPrice.toFixed(2),
        `"${s.notes || ''}"`
      ]);
    });

    // Linha de totalizador
    rows.push([]);
    rows.push([
      'TOTAL GERAL',
      `"${activeProfessional.name}"`,
      '',
      `${groupedByPatient.length} Pacientes`,
      '',
      '',
      '',
      `${monthTotalMinutes} min (${monthTotalHoursFormatted})`,
      '',
      monthTotalGross.toFixed(2),
      `${monthTotalCount} Atendimentos`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Extrato_${activeProfessional.name.replace(/\s+/g, '_')}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Salvar Regras de Preço na Sub-aba Pricing
  const handleSaveDefaultRate = (newRate) => {
    const updated = {
      ...pricingRules,
      defaultHourlyRate: parseFloat(newRate) || 180.0
    };
    setPricingRules(updated);
    try {
      localStorage.setItem(defaultPricingStorageKey, JSON.stringify(updated));
      setFeedbackMsg('Custo horário padrão salvo!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch {}
  };

  const handleSavePatientRate = (patId, rate, fixedPrice) => {
    const updated = {
      ...pricingRules,
      patientRates: {
        ...pricingRules.patientRates,
        [patId]: {
          hourlyRate: parseFloat(rate) || pricingRules.defaultHourlyRate,
          fixedSessionPrice: fixedPrice ? parseFloat(fixedPrice) : undefined
        }
      }
    };
    setPricingRules(updated);
    try {
      localStorage.setItem(defaultPricingStorageKey, JSON.stringify(updated));
      setFeedbackMsg('Preço do paciente configurado com sucesso!');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch {}
  };

  return (
    <div className="pro-financial-container">
      {/* 1. Header do Profissional (Identidade Estrita) */}
      <div className="pro-profile-header-card">
        <div className="pro-info-group">
          <Avatar
            name={activeProfessional.name}
            size={48}
            color="var(--primary)"
          />
          <div className="pro-details">
            <h2>
              {activeProfessional.name}
            </h2>
            <p>
              {activeProfessional.councilNumber || activeProfessional.crm} • {activeProfessional.specialty || activeProfessional.profession}
            </p>
          </div>
        </div>

        <div className="pro-controls-group">
          {/* Seletor de Profissional (para o gestor ou troca de conta) */}
          {doctors.length > 1 && (
            <select
              className="select-competence"
              value={selectedProId}
              onChange={(e) => setSelectedProId(e.target.value)}
              title="Alternar profissional ativo"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty || d.profession})
                </option>
              ))}
            </select>
          )}

          {/* Seletor de Competência (Mês / Ano) */}
          <select
            className="select-competence"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="select-competence"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            title="Exportar extrato em CSV"
          >
            <FileSpreadsheet size={16} />
            Exportar Extrato
          </button>

          <button
            className="btn btn-primary"
            onClick={() => handleOpenNewSession()}
          >
            <Plus size={16} />
            Novo Atendimento
          </button>
        </div>
      </div>

      {/* 2. Subtabs de Navegação */}
      <div className="pro-subtabs">
        <button
          className={`pro-subtab-btn ${activeSubtab === 'statement' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('statement')}
        >
          <Calendar size={18} />
          Extrato do Mês ({MONTH_NAMES[selectedMonth - 1]}/{selectedYear})
        </button>
        <button
          className={`pro-subtab-btn ${activeSubtab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('pricing')}
        >
          <DollarSign size={18} />
          Minha Tabela de Preços & Custo Horário
        </button>
      </div>

      {/* Alertas & Feedbacks */}
      {feedbackMsg && (
        <div style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <CheckCircle2 size={18} />
          {feedbackMsg}
        </div>
      )}

      {/* SUB-ABA 1: EXTRATO DO MÊS */}
      {activeSubtab === 'statement' && (
        <>
          {/* Totalizadores Gerais do Mês do Profissional */}
          <div className="pro-kpi-grid">
            <div className="pro-kpi-card highlight">
              <div className="pro-kpi-label">
                <span>Total a Receber no Mês</span>
                <DollarSign size={16} color="var(--primary)" />
              </div>
              <div className="pro-kpi-value green">
                R$ {monthTotalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="pro-kpi-sub">
                Competência {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}
              </div>
            </div>

            <div className="pro-kpi-card">
              <div className="pro-kpi-label">
                <span>Atendimentos Executados</span>
                <Calendar size={16} />
              </div>
              <div className="pro-kpi-value">
                {monthTotalCount}
              </div>
              <div className="pro-kpi-sub">
                distribuídos em {groupedByPatient.length} paciente(s)
              </div>
            </div>

            <div className="pro-kpi-card">
              <div className="pro-kpi-label">
                <span>Horas Clínicas Dedicadas</span>
                <Clock size={16} />
              </div>
              <div className="pro-kpi-value">
                {monthTotalHoursFormatted}
              </div>
              <div className="pro-kpi-sub">
                {monthTotalMinutes} minutos de atendimento
              </div>
            </div>

            <div className="pro-kpi-card">
              <div className="pro-kpi-label">
                <span>Valor Médio por Sessão</span>
                <TrendingUp size={16} />
              </div>
              <div className="pro-kpi-value">
                R$ {averagePricePerSession.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="pro-kpi-sub">
                ticket médio por atendimento
              </div>
            </div>
          </div>

          {/* Lista de Atendimentos Agrupados por Paciente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {groupedByPatient.length === 0 ? (
              <div className="patient-settlement-block" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Calendar size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
                <h4 style={{ color: 'var(--text-headline)', margin: '0 0 0.25rem 0' }}>
                  Nenhum atendimento registrado em {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Utilize o botão <strong>"+ Novo Atendimento"</strong> para registrar atendimentos deste mês.
                </p>
              </div>
            ) : (
              groupedByPatient.map((group) => (
                <div key={group.patientId} className="patient-settlement-block">
                  {/* Cabeçalho do Paciente */}
                  <div className="patient-header-bar">
                    <div className="patient-info-box">
                      <Avatar name={group.patientName} size={40} color="var(--primary)" />
                      <div className="patient-title-text">
                        <h3>{group.patientName}</h3>
                        <span className="patient-address-desc">
                          <MapPin size={14} color="var(--primary)" />
                          {group.patientAddress}
                        </span>
                      </div>
                    </div>

                    <div className="patient-summary-box">
                      <div className="patient-stat">
                        <span>Sessões</span>
                        <strong>{group.items.length}</strong>
                      </div>
                      <div className="patient-stat">
                        <span>Horas Totais</span>
                        <strong>{Math.floor(group.totalDurationMinutes / 60)}h {group.totalDurationMinutes % 60}m</strong>
                      </div>
                      <div className="patient-stat">
                        <span>Total Paciente</span>
                        <strong className="price">R$ {group.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Atendimentos do Paciente */}
                  <div className="sessions-table-wrapper">
                    <table className="sessions-table">
                      <thead>
                        <tr>
                          <th>Data & Horário</th>
                          <th>Descrição / Procedimento</th>
                          <th>Duração</th>
                          <th>Custo Horário</th>
                          <th>Valor da Sessão</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((sess) => (
                          <tr key={sess.id}>
                            <td>
                              <strong>
                                {new Date(sess.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </strong>
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {sess.time}
                              </span>
                            </td>

                            <td>
                              <span style={{ fontWeight: 600 }}>{sess.notes || 'Fisioterapia Domiciliar'}</span>
                            </td>

                            <td>
                              <span className="badge-duration">
                                <Clock size={12} />
                                {sess.durationMinutes} min
                              </span>
                            </td>

                            <td>
                              <span className="hourly-rate-text">
                                R$ {sess.hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                              </span>
                            </td>

                            <td>
                              <span className="session-total-text">
                                R$ {sess.sessionPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </td>

                            <td>
                              <div className="actions-cell">
                                <button
                                  className="btn-icon-action"
                                  onClick={() => handleOpenEditSession(sess)}
                                  title="Corrigir valores ou dados deste atendimento"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  className="btn-icon-action danger"
                                  onClick={() => handleDeleteSession(sess.id)}
                                  title="Excluir este atendimento do fechamento"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rodapé com botão de adicionar atendimento para este paciente */}
                  <div className="patient-footer-bar">
                    <button
                      className="btn-add-session"
                      onClick={() => handleOpenNewSession(group.patientId)}
                    >
                      <Plus size={14} />
                      Incluir atendimento para {group.patientName}
                    </button>

                    <div className="patient-footer-total">
                      Total a receber deste paciente:
                      <strong>R$ {group.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* SUB-ABA 2: MINHA TABELA DE PREÇOS */}
      {activeSubtab === 'pricing' && (
        <div className="patient-settlement-block" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="var(--primary)" />
            Tabela de Preços & Custo Horário do Profissional
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 1.5rem 0' }}>
            Defina o seu custo horário padrão e valores acordados individualmente com cada paciente.
          </p>

          {/* Custo Horário Padrão */}
          <div style={{ background: 'var(--bg-surface-hover)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxWidth: '480px', marginBottom: '2rem' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Meu Custo Horário Padrão (R$/h)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
              <input
                type="number"
                step="5"
                min="0"
                className="form-input"
                defaultValue={pricingRules.defaultHourlyRate || 180.0}
                onBlur={(e) => handleSaveDefaultRate(e.target.value)}
              />
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                por hora clínica
              </span>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
              Utilizado automaticamente no cálculo de sessões de 45 min (R$ {(pricingRules.defaultHourlyRate * 0.75).toFixed(2)}) e 60 min (R$ {pricingRules.defaultHourlyRate.toFixed(2)}).
            </small>
          </div>

          {/* Tabela de Preços Diferenciados por Paciente */}
          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>
            Preços Acordados por Paciente
          </h4>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Endereço Principal</th>
                <th>Custo Horário (R$/h)</th>
                <th>Preço Fixo da Sessão (Opcional)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((pat) => {
                const config = pricingRules.patientRates[pat.id] || {};
                return (
                  <tr key={pat.id}>
                    <td>
                      <strong>{pat.name}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem' }}>{pat.address || 'Vitória - ES'}</span>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ width: '120px', padding: '0.35rem 0.6rem' }}
                        defaultValue={config.hourlyRate || pricingRules.defaultHourlyRate || 180.0}
                        id={`rate-${pat.id}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Automático"
                        style={{ width: '130px', padding: '0.35rem 0.6rem' }}
                        defaultValue={config.fixedSessionPrice || ''}
                        id={`fixed-${pat.id}`}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => {
                          const rateVal = document.getElementById(`rate-${pat.id}`)?.value;
                          const fixedVal = document.getElementById(`fixed-${pat.id}`)?.value;
                          handleSavePatientRate(pat.id, rateVal, fixedVal);
                        }}
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: INCLUIR OU CORRIGIR ATENDIMENTO */}
      {isSessionModalOpen && (
        <div className="financial-modal-backdrop" onClick={() => setIsSessionModalOpen(false)}>
          <div className="financial-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <Clock size={20} color="var(--primary)" />
                {editingSession ? 'Corrigir Atendimento' : 'Incluir Novo Atendimento'}
              </h3>
              <button
                className="btn-icon-action"
                onClick={() => setIsSessionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSession}>
              <div className="modal-body-form">
                {/* Paciente */}
                <div className="form-group">
                  <label className="form-label">Paciente *</label>
                  <select
                    className="form-input"
                    value={modalPatientId}
                    onChange={(e) => setModalPatientId(e.target.value)}
                    required
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address || 'Sem endereço'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data e Hora */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Data do Atendimento *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Horário *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={modalTime}
                      onChange={(e) => setModalTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Duração com atalhos rápidos */}
                <div className="form-group">
                  <label className="form-label">Duração da Sessão (minutos) *</label>
                  <input
                    type="number"
                    min="15"
                    step="5"
                    className="form-input"
                    value={modalDuration}
                    onChange={(e) => handleDurationChange(e.target.value)}
                    required
                  />
                  <div className="duration-quick-pills">
                    {[30, 45, 50, 60, 90].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        className={`pill-dur ${modalDuration === dur ? 'active' : ''}`}
                        onClick={() => handleDurationChange(dur)}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custo Horário e Valor da Sessão */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Custo Horário (R$/h) *</label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      className="form-input"
                      value={modalHourlyRate}
                      onChange={(e) => handleHourlyRateChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Total da Sessão (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={modalSessionPrice}
                      onChange={(e) => setModalSessionPrice(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                {/* Cálculo explicativo */}
                <div className="calc-preview-box">
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-body)' }}>
                    Fórmula: R$ {modalHourlyRate.toFixed(2)}/h × ({modalDuration} min ÷ 60)
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>
                    = R$ {modalSessionPrice.toFixed(2)}
                  </strong>
                </div>

                {/* Descrição / Notas */}
                <div className="form-group">
                  <label className="form-label">Procedimento / Observações</label>
                  <input
                    type="text"
                    className="form-input"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Ex: Cinesioterapia ativa-assistida, ganho de ADM"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSessionModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingSession ? 'Salvar Alterações' : 'Incluir Atendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
