// src/components/MonthlyFinancialSettlementView.jsx
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Eye,
  Check,
  CreditCard,
  Ban,
  Building,
  MapPin,
  User,
  X,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Avatar from './Avatar';
import { API_BASE_URL } from '../services/apiConfig';
import './MonthlyFinancialSettlementView.css';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthlyFinancialSettlementView({
  doctors = [],
  patients = [],
  currentUser
}) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // Outubro
  const [activeSubtab, setActiveSubtab] = useState('settlement'); // 'settlement' | 'pricing' | 'history'

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dados da API
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);

  // Modais
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [isNewPriceModalOpen, setIsNewPriceModalOpen] = useState(false);

  // Form State para Novo Preço Contextual
  const [newPriceProId, setNewPriceProId] = useState('');
  const [newPricePatientId, setNewPricePatientId] = useState('');
  const [newPriceAddress, setNewPriceAddress] = useState('');
  const [newPriceAmount, setNewPriceAmount] = useState('180.00');
  const [newPriceNotes, setNewPriceNotes] = useState('');

  // Carrega dados ao montar e quando ano/mês mudar
  useEffect(() => {
    fetchFinancialData();
  }, [selectedYear, selectedMonth]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('omnihome_jwt');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchFinancialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();

      // 1. Busca Prévia do Mês
      const resPreview = await fetch(
        `${API_BASE_URL}/api/financial/preview?year=${selectedYear}&month=${selectedMonth}`,
        { headers }
      );
      if (resPreview.ok) {
        const data = await resPreview.json();
        setPreview(data.preview);
      }

      // 2. Busca Resumo de KPIs
      const resSummary = await fetch(
        `${API_BASE_URL}/api/financial/summary?year=${selectedYear}&month=${selectedMonth}`,
        { headers }
      );
      if (resSummary.ok) {
        const data = await resSummary.json();
        setSummary(data.summary);
      }

      // 3. Busca Fechamentos Existentes
      const resSettlements = await fetch(
        `${API_BASE_URL}/api/financial/settlements`,
        { headers }
      );
      if (resSettlements.ok) {
        const data = await resSettlements.json();
        setSettlements(data.settlements || []);
      }

      // 4. Busca Matriz de Preços
      const resPricing = await fetch(
        `${API_BASE_URL}/api/financial/pricing`,
        { headers }
      );
      if (resPricing.ok) {
        const data = await resPricing.json();
        setPricingRules(data.prices || []);
      }
    } catch (err) {
      console.warn('Erro ao sincronizar com backend financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Gerar Fechamento
  const handleGenerateSettlement = async (professionalId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/financial/settlements/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          professionalId,
          year: selectedYear,
          month: selectedMonth,
          allowUnpricedOverride: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Falha ao consolidar fechamento.');
      }

      setSuccessMsg(`Fechamento financeiro de ${data.settlement?.professional?.user?.name || 'Profissional'} gerado em DRAFT!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFinancialData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Aprovar Fechamento
  const handleApproveSettlement = async (settlementId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/financial/settlements/${settlementId}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao aprovar fechamento.');

      setSuccessMsg('Fechamento aprovado formalmente com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFinancialData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Liquidar Fechamento (Marcar como Pago)
  const handleMarkAsPaid = async (settlementId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/financial/settlements/${settlementId}/pay`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes: 'Repasse via PIX liquidado' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao liquidar fechamento.');

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSuccessMsg('Repasse liquidado como PAGO com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchFinancialData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cadastrar Novo Preço Contextual
  const handleCreatePricingRule = async (e) => {
    e.preventDefault();
    if (!newPriceProId || !newPricePatientId || !newPriceAmount) {
      setErrorMsg('Profissional, Paciente e Valor são obrigatórios.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/financial/pricing`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          professionalId: newPriceProId,
          patientId: newPricePatientId,
          address: newPriceAddress.trim() || null,
          pricePerSession: parseFloat(newPriceAmount),
          notes: newPriceNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar regra.');

      setSuccessMsg('Regra de preço contextual cadastrada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
      setIsNewPriceModalOpen(false);
      setNewPriceAddress('');
      setNewPriceNotes('');
      fetchFinancialData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    if (!preview || !preview.professionals || preview.professionals.length === 0) {
      alert('Não há dados apurados no período para exportar.');
      return;
    }

    const rows = [
      ['Competencia', 'Profissional', 'CRM', 'Especialidade', 'Sessoes Elegiveis', 'Faturamento Bruto (R$)', 'Status']
    ];

    preview.professionals.forEach((p) => {
      const existingSettlement = settlements.find((s) => s.professionalId === p.professionalId);
      const statusLabel = existingSettlement ? existingSettlement.status : 'PREVIA';
      rows.push([
        `${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`,
        `"${p.professionalName}"`,
        `"${p.councilRegistration}"`,
        `"${p.specialty}"`,
        p.totalSessions,
        p.totalGrossAmount.toFixed(2),
        statusLabel
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fechamento_Mensal_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="financial-container">
      {/* Header */}
      <div className="financial-header">
        <div className="financial-title-box">
          <h2>
            <Wallet size={26} color="var(--primary)" />
            Fechamento Financeiro Mensal
          </h2>
          <p>
            Matriz de precificação contextual (Profissional x Paciente x Endereço), auditoria e repasses com snapshots imutáveis.
          </p>
        </div>

        <div className="financial-controls">
          <select
            className="select-control"
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
            className="select-control"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={fetchFinancialData}
            title="Atualizar apuração"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            title="Exportar planilha para conferência contábil"
          >
            <FileSpreadsheet size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Subtabs de Navegação */}
      <div className="financial-subtabs">
        <button
          className={`subtab-btn ${activeSubtab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('settlement')}
        >
          <Calendar size={18} />
          Apuração do Mês ({MONTH_NAMES[selectedMonth - 1]}/{selectedYear})
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('pricing')}
        >
          <DollarSign size={18} />
          Matriz de Preços Contextuais
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('history')}
        >
          <FileText size={18} />
          Histórico de Fechamentos ({settlements.length})
        </button>
      </div>

      {/* Alertas & Mensagens */}
      {successMsg && (
        <div style={{ background: 'var(--success-subtle)', border: '1px solid var(--success-border)', color: 'var(--success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={18} />
          <strong>{successMsg}</strong>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. ABA APURAÇÃO DO MÊS */}
      {activeSubtab === 'settlement' && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card highlight">
              <div className="kpi-header">
                <span>Faturamento Bruto Apurado</span>
                <div className="kpi-icon-badge" style={{ background: 'rgba(2, 132, 199, 0.15)', color: 'var(--primary)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value">
                R$ {(preview?.totalGrossAmount ?? summary?.totalGrossSettled ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtitle">
                {preview?.totalSessions ?? 0} atendimentos domiciliares elegíveis
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Repasses em Aberto / Rascunho</span>
                <div className="kpi-icon-badge" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value">
                R$ {(summary?.totalDraftAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtitle">
                {summary?.settlementsCount?.draft ?? 0} em DRAFT / {summary?.settlementsCount?.pendingReview ?? 0} em auditoria
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Aprovado p/ Pagamento</span>
                <div className="kpi-icon-badge" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}>
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-value">
                R$ {(summary?.totalApprovedAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtitle">
                {summary?.settlementsCount?.approved ?? 0} fechamento(s) homologado(s)
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total Liquidado (Pago)</span>
                <div className="kpi-icon-badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: 'var(--success)' }}>
                R$ {(summary?.totalPaidAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtitle">
                {summary?.settlementsCount?.paid ?? 0} repasse(s) quitado(s)
              </div>
            </div>
          </div>

          {/* Banner de Sessões Não Precificadas */}
          {preview?.professionals?.some((p) => p.unpricedAlerts?.length > 0) && (
            <div className="unpriced-alert-banner">
              <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4>Atenção: Existem atendimentos sem precificação configurada</h4>
                <p>
                  Algumas sessões executadas não possuem regra de preço correspondente na matriz tridimensional.
                  Configure a tabela de preços na aba <strong>"Matriz de Preços Contextuais"</strong> antes de aprovar formalmente os repasses.
                </p>
              </div>
            </div>
          )}

          {/* Tabela de Fechamento por Profissional */}
          <div className="table-card">
            <div className="table-card-header">
              <div className="table-card-title">
                <Users size={20} color="var(--primary)" />
                Apuração por Fisioterapeuta / Terapeuta ({MONTH_NAMES[selectedMonth - 1]}/{selectedYear})
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {preview?.professionals?.length || 0} profissional(is) com escala no período
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Especialidade & Conselho</th>
                    <th>Sessões Elegíveis</th>
                    <th>Valor Bruto Calculado</th>
                    <th>Status do Fechamento</th>
                    <th style={{ textAlign: 'right' }}>Ações de Auditoria</th>
                  </tr>
                </thead>
                <tbody>
                  {(!preview?.professionals || preview.professionals.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        Nenhum atendimento faturável encontrado para {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    preview.professionals.map((pro) => {
                      const existing = settlements.find((s) => s.professionalId === pro.professionalId);

                      return (
                        <tr key={pro.professionalId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Avatar name={pro.professionalName} size={36} color="var(--primary)" />
                              <div>
                                <strong style={{ color: 'var(--text-headline)', display: 'block' }}>
                                  {pro.professionalName}
                                </strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ID: {pro.professionalId.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div>
                              <span>{pro.specialty}</span>
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {pro.councilRegistration}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                              {pro.totalSessions} sessões
                            </span>
                          </td>

                          <td>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                              R$ {pro.totalGrossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td>
                            {!existing ? (
                              <span className="status-pill preview">PRÉVIA ABERTA</span>
                            ) : existing.status === 'DRAFT' ? (
                              <span className="status-pill draft">RASCUNHO (DRAFT)</span>
                            ) : existing.status === 'PENDING_REVIEW' ? (
                              <span className="status-pill pending">EM REVISÃO</span>
                            ) : existing.status === 'APPROVED' ? (
                              <span className="status-pill approved">APROVADO</span>
                            ) : existing.status === 'PAID' ? (
                              <span className="status-pill paid">LIQUIDADO (PAGO)</span>
                            ) : (
                              <span className="status-pill cancelled">CANCELADO</span>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                              {/* Botão de Ver Extrato */}
                              <button
                                className="btn-action-sm"
                                onClick={() => setDetailModalItem(pro)}
                                title="Ver extrato completo de sessões com snapshots"
                              >
                                <Eye size={14} />
                                Extrato ({pro.items.length})
                              </button>

                              {/* Ações baseadas no ciclo de vida */}
                              {!existing && pro.totalSessions > 0 && (
                                <button
                                  className="btn-action-sm primary"
                                  onClick={() => handleGenerateSettlement(pro.professionalId)}
                                  title="Consolidar fechamento em DRAFT com snapshots imutáveis"
                                >
                                  <FileSpreadsheet size={14} />
                                  Fechar Mês
                                </button>
                              )}

                              {existing && existing.status === 'DRAFT' && (
                                <button
                                  className="btn-action-sm primary"
                                  onClick={() => handleApproveSettlement(existing.id)}
                                  title="Aprovar formalmente para pagamento"
                                >
                                  <ShieldCheck size={14} />
                                  Aprovar
                                </button>
                              )}

                              {existing && (existing.status === 'PENDING_REVIEW' || existing.status === 'APPROVED') && (
                                <button
                                  className="btn-action-sm success"
                                  onClick={() => handleMarkAsPaid(existing.id)}
                                  title="Confirmar transferência e marcar como PAGO"
                                >
                                  <CreditCard size={14} />
                                  Pagar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 2. ABA MATRIZ DE PREÇOS CONTEXTUAIS */}
      {activeSubtab === 'pricing' && (
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <div className="table-card-title">
                <DollarSign size={20} color="var(--primary)" />
                Matriz de Precificação Contextual (Profissional x Paciente x Endereço)
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Regras hierárquicas: Correspondência Exata de Endereço ➔ Preço Padrão do Paciente ➔ Preço de Base.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setIsNewPriceModalOpen(true)}
            >
              <Plus size={16} />
              Nova Regra de Preço
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Profissional</th>
                  <th>Paciente</th>
                  <th>Domicílio / Endereço</th>
                  <th>Valor por Sessão</th>
                  <th>Vigência</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {pricingRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Nenhuma regra contextual cadastrada. Todas as sessões utilizarão a tarifa de base de R$ 150,00.
                    </td>
                  </tr>
                ) : (
                  pricingRules.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.professional?.user?.name || 'Profissional'}</strong>
                      </td>
                      <td>{p.patient?.name || 'Paciente'}</td>
                      <td>
                        {p.address ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={14} color="var(--primary)" />
                            {p.address}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Qualquer endereço (Padrão do paciente)
                          </span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                          R$ {p.pricePerSession.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Desde {new Date(p.effectiveFrom).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td>{p.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ABA HISTÓRICO DE FECHAMENTOS */}
      {activeSubtab === 'history' && (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <FileText size={20} color="var(--primary)" />
              Histórico de Fechamentos Consolidados
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total de {settlements.length} fechamentos registrados
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="financial-table">
              <thead>
                <tr>
                  <th>ID Fechamento</th>
                  <th>Profissional</th>
                  <th>Período de Competência</th>
                  <th>Total de Sessões</th>
                  <th>Valor Bruto</th>
                  <th>Status</th>
                  <th>Criado Em</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Nenhum fechamento histórico registrado ainda.
                    </td>
                  </tr>
                ) : (
                  settlements.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code style={{ fontSize: '0.78rem', background: 'var(--bg-surface-hover)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          {s.id.slice(0, 8)}...
                        </code>
                      </td>
                      <td>
                        <strong>{s.professional?.user?.name || 'Profissional'}</strong>
                      </td>
                      <td>
                        {new Date(s.periodStart).toLocaleDateString('pt-BR')} até {new Date(s.periodEnd).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <strong>{s.totalSessions} sessões</strong>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)' }}>
                          R$ {Number(s.totalGrossAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span className={`status-pill ${s.status.toLowerCase()}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EXTRATO DETALHADO DO PROFISSIONAL */}
      {detailModalItem && (
        <div className="modal-overlay" onClick={() => setDetailModalItem(null)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FileText size={20} color="var(--primary)" />
                Extrato de Atendimentos — {detailModalItem.professionalName}
              </h3>
              <button
                className="btn-action-sm"
                onClick={() => setDetailModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-subtle)', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)' }}>
                <div>
                  <strong style={{ color: 'var(--primary)', display: 'block' }}>
                    Competência: {MONTH_NAMES[selectedMonth - 1]}/{selectedYear}
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-body)' }}>
                    {detailModalItem.councilRegistration} • {detailModalItem.specialty}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Total Bruto</span>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--text-headline)' }}>
                    R$ {detailModalItem.totalGrossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Data & Hora</th>
                    <th>Paciente</th>
                    <th>Endereço do Domicílio</th>
                    <th>Regra Aplicada</th>
                    <th style={{ textAlign: 'right' }}>Valor Cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {detailModalItem.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        Nenhum atendimento realizado no período.
                      </td>
                    </tr>
                  ) : (
                    detailModalItem.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{new Date(item.scheduledTime).toLocaleDateString('pt-BR')}</strong>
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(item.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <strong>{item.patientName}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{item.patientAddress}</span>
                        </td>
                        <td>
                          <span className={`rule-tag ${item.ruleApplied === 'EXACT_ADDRESS' ? 'exact' : item.ruleApplied === 'PATIENT_DEFAULT' ? 'default' : 'base'}`}>
                            {item.ruleApplied === 'EXACT_ADDRESS' ? 'Endereço Exato' : item.ruleApplied === 'PATIENT_DEFAULT' ? 'Padrão Paciente' : 'Tarifa Base'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                            R$ {item.chargedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDetailModalItem(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVA REGRA DE PRECIFICAÇÃO CONTEXTUAL */}
      {isNewPriceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewPriceModalOpen(false)}>
          <div className="modal-content-lg" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} color="var(--primary)" />
                Cadastrar Regra de Preço Contextual
              </h3>
              <button
                className="btn-action-sm"
                onClick={() => setIsNewPriceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePricingRule}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Profissional / Fisioterapeuta *</label>
                  <select
                    className="form-input"
                    value={newPriceProId}
                    onChange={(e) => setNewPriceProId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o profissional...</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialty || d.profession})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Paciente *</label>
                  <select
                    className="form-input"
                    value={newPricePatientId}
                    onChange={(e) => setNewPricePatientId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o paciente...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address || 'Sem endereço'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço Específico (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Rua das Flores, 120 (Deixe vazio para ser o preço padrão do paciente)"
                    value={newPriceAddress}
                    onChange={(e) => setNewPriceAddress(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Se preenchido, esta regra terá prioridade máxima caso o atendimento ocorra exatamente neste endereço.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Valor da Sessão (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="form-input"
                    value={newPriceAmount}
                    onChange={(e) => setNewPriceAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Observação / Justificativa</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Acordo familiar / Adicional de deslocamento urbano"
                    value={newPriceNotes}
                    onChange={(e) => setNewPriceNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsNewPriceModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
