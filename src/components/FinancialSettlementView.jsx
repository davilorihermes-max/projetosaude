// src/components/FinancialSettlementView.jsx
import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Receipt,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileCheck,
  Plus,
  X,
  CreditCard,
  Building,
  TrendingUp,
  FileText,
  Lock
} from 'lucide-react';
import './FinancialSettlementView.css';

export default function FinancialSettlementView({
  doctors = [],
  patients = [],
  appointments: _appointments = []
}) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || 'doc-3');
  const [periodType, setPeriodType] = useState('DECENDIAL');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-10');
  const [activeSubtab, setActiveSubtab] = useState('settlement'); // 'settlement' | 'pricing-matrix' | 'history'

  // Estado do fechamento ativo na apuração
  const [settlementState, setSettlementState] = useState({
    id: 'settlement-preview-demo',
    status: 'DRAFT', // 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'PAID' | 'CANCELLED'
    approvedAt: null,
    paidAt: null
  });

  // Tabela de Preços Contextuais: Profissional x Paciente x Endereço
  const [pricingRules, setPricingRules] = useState([
    {
      id: 'price-1',
      professionalId: 'doc-3',
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      addressId: 'addr-mariana-1',
      addressLabel: 'Alameda Santos, 1000 - Apto 82, Cerqueira César - SP',
      pricePerSession: 220.0,
      notes: 'Sessão com mobilização intensiva e suporte respiratório',
      ruleType: 'EXACT_ADDRESS',
      effectiveFrom: '2026-01-01',
      effectiveTo: null
    },
    {
      id: 'price-2',
      professionalId: 'doc-3',
      patientId: 'pat-2',
      patientName: 'Roberto Carlos Peixoto',
      addressId: null, // Padrão do paciente
      addressLabel: 'Valor Padrão do Paciente (Qualquer domicílio)',
      pricePerSession: 185.0,
      notes: 'Fisioterapia motora domiciliar padrão',
      ruleType: 'PATIENT_DEFAULT',
      effectiveFrom: '2026-01-01',
      effectiveTo: null
    },
    {
      id: 'price-3',
      professionalId: 'doc-3',
      patientId: 'pat-3',
      patientName: 'Juliana Mendes Prado',
      addressId: 'addr-juliana-1',
      addressLabel: 'Av. Moema, 350 - Bloco B, Apto 112, Moema - SP',
      pricePerSession: 195.0,
      notes: 'Atendimento Zona Sul com taxa de deslocamento inclusa',
      ruleType: 'EXACT_ADDRESS',
      effectiveFrom: '2026-01-01',
      effectiveTo: null
    },
    {
      id: 'price-4',
      professionalId: 'doc-4',
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      addressId: null,
      addressLabel: 'Valor Padrão da Paciente',
      pricePerSession: 210.0,
      notes: 'Curativos e cuidados de estomaterapia',
      ruleType: 'PATIENT_DEFAULT',
      effectiveFrom: '2026-01-01',
      effectiveTo: null
    }
  ]);

  // Modal para nova regra de preço
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    professionalId: selectedDoctorId,
    patientId: patients[0]?.id || 'pat-1',
    isSpecificAddress: false,
    pricePerSession: 200,
    notes: '',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  // Histórico de fechamentos anteriores já liquidados
  const [settlementHistory] = useState([
    {
      id: 'set-hist-101',
      professionalName: 'Rafael Fontes',
      periodLabel: '21/09/2026 a 30/09/2026 (Decendial)',
      totalSessions: 14,
      totalGrossAmount: 2840.0,
      status: 'PAID',
      paidAt: '2026-10-02',
      receiptRef: 'TED-89410-2026'
    },
    {
      id: 'set-hist-102',
      professionalName: 'Rafael Fontes',
      periodLabel: '11/09/2026 a 20/09/2026 (Decendial)',
      totalSessions: 12,
      totalGrossAmount: 2450.0,
      status: 'PAID',
      paidAt: '2026-09-22',
      receiptRef: 'PIX-77412-2026'
    }
  ]);

  const _activeDoctor = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId) || doctors[0];
  }, [doctors, selectedDoctorId]);

  // Resolução da Matriz de Preços Contextuais para os atendimentos elegíveis
  const evaluatedAttendances = useMemo(() => {
    // Lista de sessões fictícias/agendadas no período para o profissional
    const sessions = [
      {
        id: 'att-101',
        scheduleId: 'sch-101',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        addressLabel: 'Alameda Santos, 1000 - Cerqueira César, SP',
        addressId: 'addr-mariana-1',
        date: '2026-10-02',
        time: '09:00',
        scheduleType: 'INSTITUTIONAL_SCALE',
        checkInStatus: 'ON_SITE_VALIDATED',
        distanceMeters: 45
      },
      {
        id: 'att-102',
        scheduleId: 'sch-102',
        patientId: 'pat-2',
        patientName: 'Roberto Carlos Peixoto',
        addressLabel: 'Rua Fradique Coutinho, 500 - Pinheiros, SP',
        addressId: 'addr-roberto-1',
        date: '2026-10-04',
        time: '11:00',
        scheduleType: 'INSTITUTIONAL_SCALE',
        checkInStatus: 'ON_SITE_VALIDATED',
        distanceMeters: 80
      },
      {
        id: 'att-103',
        scheduleId: 'sch-103',
        patientId: 'pat-3',
        patientName: 'Juliana Mendes Prado',
        addressLabel: 'Av. Moema, 350 - Moema, SP',
        addressId: 'addr-juliana-1',
        date: '2026-10-06',
        time: '14:30',
        scheduleType: 'AUTONOMOUS_APPOINTMENT',
        checkInStatus: 'ON_SITE_VALIDATED',
        distanceMeters: 30
      },
      {
        id: 'att-104',
        scheduleId: 'sch-104',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        addressLabel: 'Alameda Santos, 1000 - Cerqueira César, SP',
        addressId: 'addr-mariana-1',
        date: '2026-10-08',
        time: '09:00',
        scheduleType: 'INSTITUTIONAL_SCALE',
        checkInStatus: 'ON_SITE_VALIDATED',
        distanceMeters: 55
      },
      {
        id: 'att-105',
        scheduleId: 'sch-105',
        patientId: 'pat-4', // Gabriel Santos - sem precificação cadastrada para demonstrar o alerta
        patientName: 'Gabriel Santos Oliveira',
        addressLabel: 'Rua Bela Cintra, 1400 - Cerqueira César, SP',
        addressId: 'addr-gabriel-1',
        date: '2026-10-09',
        time: '16:00',
        scheduleType: 'INSTITUTIONAL_SCALE',
        checkInStatus: 'ON_SITE_VALIDATED',
        distanceMeters: 60
      }
    ];

    return sessions.map(session => {
      // 1. Tenta correspondência exata de endereço (Prioridade 1)
      const exactMatch = pricingRules.find(
        r => r.professionalId === selectedDoctorId &&
             r.patientId === session.patientId &&
             r.addressId === session.addressId
      );

      if (exactMatch) {
        return {
          ...session,
          chargedAmount: exactMatch.pricePerSession,
          ruleApplied: 'EXACT_ADDRESS',
          ruleDescription: 'Preço específico do endereço (Prioridade 1)'
        };
      }

      // 2. Tenta preço padrão para o paciente (Prioridade 2)
      const defaultMatch = pricingRules.find(
        r => r.professionalId === selectedDoctorId &&
             r.patientId === session.patientId &&
             (r.addressId === null || r.addressId === undefined)
      );

      if (defaultMatch) {
        return {
          ...session,
          chargedAmount: defaultMatch.pricePerSession,
          ruleApplied: 'PATIENT_DEFAULT',
          ruleDescription: 'Valor padrão do paciente (Prioridade 2)'
        };
      }

      // 3. Nenhuma regra cadastrada (Alerta de Não Configurado)
      return {
        ...session,
        chargedAmount: 0,
        ruleApplied: 'NOT_CONFIGURED',
        ruleDescription: 'Pendente: nenhuma regra encontrada na matriz'
      };
    });
  }, [selectedDoctorId, pricingRules]);

  // Cálculos de KPIs consolidados
  const kpis = useMemo(() => {
    const pricedSessions = evaluatedAttendances.filter(s => s.ruleApplied !== 'NOT_CONFIGURED');
    const unpricedSessions = evaluatedAttendances.filter(s => s.ruleApplied === 'NOT_CONFIGURED');

    const totalGross = pricedSessions.reduce((acc, curr) => acc + curr.chargedAmount, 0);
    const avgPrice = pricedSessions.length > 0 ? totalGross / pricedSessions.length : 0;

    return {
      totalGrossAmount: totalGross,
      totalEligibleSessions: pricedSessions.length,
      unpricedCount: unpricedSessions.length,
      averageSessionPrice: avgPrice
    };
  }, [evaluatedAttendances]);

  // Ações da Máquina de Estados
  const handleGenerateSettlement = () => {
    if (kpis.unpricedCount > 0) {
      const confirmOverride = window.confirm(
        `Atenção: Existem ${kpis.unpricedCount} sessões sem precificação na matriz multidimensional. Deseja gerar o fechamento mesmo assim ignorando essas sessões?`
      );
      if (!confirmOverride) return;
    }

    setSettlementState(prev => ({
      ...prev,
      status: 'DRAFT',
      id: `set-${Date.now()}`
    }));
    alert('Fechamento financeiro DRAFT gerado com snapshots imutáveis gravados com sucesso!');
  };

  const handleSubmitForReview = () => {
    setSettlementState(prev => ({ ...prev, status: 'PENDING_REVIEW' }));
  };

  const handleApproveSettlement = () => {
    setSettlementState(prev => ({
      ...prev,
      status: 'APPROVED',
      approvedAt: new Date().toLocaleDateString('pt-BR')
    }));
  };

  const handleMarkAsPaid = () => {
    setSettlementState(prev => ({
      ...prev,
      status: 'PAID',
      paidAt: new Date().toLocaleDateString('pt-BR')
    }));
    alert('Repasse financeiro marcado como PAGO! Comprovante emitido.');
  };

  const handleCancelSettlement = () => {
    if (settlementState.status === 'PAID') {
      alert('Operação bloqueada: Não é permitido cancelar um fechamento que já foi liquidado como PAGO.');
      return;
    }
    const reason = prompt('Informe a justificativa do cancelamento (mínimo 5 caracteres):');
    if (!reason || reason.trim().length < 5) {
      alert('Justificativa inválida ou muito curta.');
      return;
    }
    setSettlementState(prev => ({ ...prev, status: 'CANCELLED' }));
  };

  // Criação de nova regra de preço na matriz
  const handleSavePricingRule = (e) => {
    e.preventDefault();
    const targetPatient = patients.find(p => p.id === newRuleForm.patientId);

    const newRule = {
      id: `price-${Date.now()}`,
      professionalId: newRuleForm.professionalId,
      patientId: newRuleForm.patientId,
      patientName: targetPatient?.name || 'Paciente',
      addressId: newRuleForm.isSpecificAddress ? `addr-${newRuleForm.patientId}-1` : null,
      addressLabel: newRuleForm.isSpecificAddress ? (targetPatient?.address || 'Endereço específico') : 'Valor Padrão do Paciente (Qualquer domicílio)',
      pricePerSession: Number(newRuleForm.pricePerSession),
      notes: newRuleForm.notes || 'Configuração via Painel Operacional',
      ruleType: newRuleForm.isSpecificAddress ? 'EXACT_ADDRESS' : 'PATIENT_DEFAULT',
      effectiveFrom: newRuleForm.effectiveFrom,
      effectiveTo: null
    };

    setPricingRules(prev => [newRule, ...prev]);
    setIsModalOpen(false);
    alert('Nova regra adicionada à matriz de precificação contextual com sucesso!');
  };

  return (
    <div className="financial-container">
      {/* Header */}
      <div className="financial-header">
        <div className="financial-header-left">
          <h1>
            <DollarSign size={28} className="text-emerald-600" />
            Fechamento Financeiro & Repasses
          </h1>
          <p>
            Apuração contextual por <strong>Profissional x Paciente x Endereço</strong> com snapshots imutáveis.
          </p>
        </div>
        <div>
          <span className="financial-badge-immutable">
            <Lock size={13} />
            Snapshots Imutáveis & Auditoria Ativa
          </span>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="financial-controls-card">
        <div className="control-group">
          <label>
            <User size={15} /> Profissional de Saúde
          </label>
          <select
            className="control-select"
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
          >
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.profession} - {doc.councilNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>
            <Calendar size={15} /> Ciclo de Fechamento
          </label>
          <select
            className="control-select"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          >
            <option value="WEEKLY">Semanal (7 dias)</option>
            <option value="DECENDIAL">Decendial (10 em 10 dias)</option>
            <option value="MONTHLY">Mensal Consolidado</option>
          </select>
        </div>

        <div className="control-group">
          <label>Período Inicial</label>
          <input
            type="date"
            className="control-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Período Final</label>
          <input
            type="date"
            className="control-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div>
          <button
            className="btn-simulate-preview"
            onClick={() => alert('Prévia recalculada com sucesso!')}
          >
            <Clock size={16} /> Recalcular Prévia
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="financial-kpi-grid">
        <div className="kpi-card emerald">
          <div className="kpi-top">
            <span className="kpi-label">Total Bruto Apurado</span>
            <div className="kpi-icon-badge">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-value">
            R$ {kpis.totalGrossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Valor elegível para repasse ao profissional</div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-top">
            <span className="kpi-label">Sessões Faturáveis</span>
            <div className="kpi-icon-badge">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value">{kpis.totalEligibleSessions} sessões</div>
          <div className="kpi-subtext">Com check-in validado e sem cancelamento</div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-top">
            <span className="kpi-label">Ticket Médio / Sessão</span>
            <div className="kpi-icon-badge">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value">
            R$ {kpis.averageSessionPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="kpi-subtext">Média ponderada do período selecionado</div>
        </div>

        <div className="kpi-card amber">
          <div className="kpi-top">
            <span className="kpi-label">Pendências na Matriz</span>
            <div className="kpi-icon-badge">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value">{kpis.unpricedCount} alertas</div>
          <div className="kpi-subtext">Sessões sem preço cadastrado na matriz</div>
        </div>
      </div>

      {/* Subtabs Navigation */}
      <div className="financial-nav-tabs">
        <button
          className={`nav-subtab ${activeSubtab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('settlement')}
        >
          <Receipt size={17} />
          Apuração do Período ({evaluatedAttendances.length})
        </button>
        <button
          className={`nav-subtab ${activeSubtab === 'pricing-matrix' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('pricing-matrix')}
        >
          <Building size={17} />
          Matriz de Preços Contextuais ({pricingRules.length})
        </button>
        <button
          className={`nav-subtab ${activeSubtab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('history')}
        >
          <FileCheck size={17} />
          Histórico de Fechamentos Pagos
        </button>
      </div>

      {/* Subtab 1: Apuração & Máquina de Estados */}
      {activeSubtab === 'settlement' && (
        <div className="financial-content-card">
          <div className="financial-table-header">
            <div>
              <h2>
                <FileText size={20} className="text-blue-600" />
                Demonstrativo de Atendimentos & Repasse
                <span className={`settlement-status-badge ${settlementState.status.toLowerCase()}`}>
                  {settlementState.status}
                </span>
              </h2>
            </div>

            {/* Máquina de Estados: Botões contextuais */}
            <div className="settlement-actions-bar">
              {settlementState.status === 'DRAFT' && (
                <>
                  <button className="btn-action review" onClick={handleSubmitForReview}>
                    <Clock size={15} /> Submeter p/ Revisão
                  </button>
                  <button className="btn-action approve" onClick={handleApproveSettlement}>
                    <ShieldCheck size={15} /> Aprovar Fechamento
                  </button>
                </>
              )}

              {settlementState.status === 'PENDING_REVIEW' && (
                <>
                  <button className="btn-action approve" onClick={handleApproveSettlement}>
                    <ShieldCheck size={15} /> Aprovar Fechamento
                  </button>
                  <button className="btn-action cancel" onClick={handleCancelSettlement}>
                    <X size={15} /> Cancelar
                  </button>
                </>
              )}

              {settlementState.status === 'APPROVED' && (
                <>
                  <button className="btn-action pay" onClick={handleMarkAsPaid}>
                    <CreditCard size={15} /> Registrar Pagamento (PAID)
                  </button>
                  <button className="btn-action cancel" onClick={handleCancelSettlement}>
                    <X size={15} /> Cancelar
                  </button>
                </>
              )}

              {settlementState.status === 'PAID' && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={16} /> Fechamento Liquidado em {settlementState.paidAt}
                </span>
              )}

              {settlementState.status === 'CANCELLED' && (
                <button className="btn-action generate" onClick={handleGenerateSettlement}>
                  <Plus size={15} /> Recriar Fechamento
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Paciente</th>
                  <th>Endereço do Domicílio</th>
                  <th>Modalidade</th>
                  <th>Regra Aplicada (Matriz)</th>
                  <th>Valor da Sessão</th>
                  <th>Check-in GPS</th>
                </tr>
              </thead>
              <tbody>
                {evaluatedAttendances.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-semibold text-slate-800">{item.date}</div>
                      <div className="text-xs text-slate-500">{item.time}</div>
                    </td>
                    <td>
                      <div className="font-bold text-slate-900">{item.patientName}</div>
                      <div className="text-xs text-slate-500">ID: {item.patientId}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span>{item.addressLabel}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.scheduleType === 'INSTITUTIONAL_SCALE' ? 'Institucional' : 'Autônomo'}
                      </span>
                    </td>
                    <td>
                      {item.ruleApplied === 'EXACT_ADDRESS' && (
                        <span className="rule-badge exact">
                          <CheckCircle2 size={12} /> Endereço Específico (P1)
                        </span>
                      )}
                      {item.ruleApplied === 'PATIENT_DEFAULT' && (
                        <span className="rule-badge default">
                          <CheckCircle2 size={12} /> Padrão do Paciente (P2)
                        </span>
                      )}
                      {item.ruleApplied === 'NOT_CONFIGURED' && (
                        <span className="rule-badge unpriced">
                          <AlertTriangle size={12} /> Não Configurado
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="amount-highlight">
                        {item.chargedAmount > 0
                          ? `R$ ${item.chargedAmount.toFixed(2)}`
                          : <span className="text-red-600 font-bold">R$ 0,00</span>
                        }
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <ShieldCheck size={14} /> Validado ({item.distanceMeters}m)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Matriz de Precificação Contextual */}
      {activeSubtab === 'pricing-matrix' && (
        <div className="financial-content-card">
          <div className="financial-table-header">
            <div>
              <h2>
                <Building size={20} className="text-emerald-600" />
                Matriz Multidimensional (Profissional x Paciente x Endereço)
              </h2>
            </div>
            <button
              className="btn-action generate"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Nova Regra de Preço
            </button>
          </div>

          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Escopo / Endereço</th>
                  <th>Prioridade</th>
                  <th>Valor / Sessão</th>
                  <th>Vigência</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {pricingRules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <div className="font-bold text-slate-900">{rule.patientName}</div>
                      <div className="text-xs text-slate-500">ID: {rule.patientId}</div>
                    </td>
                    <td>
                      <div className="text-xs text-slate-700 flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        {rule.addressLabel}
                      </div>
                    </td>
                    <td>
                      {rule.ruleType === 'EXACT_ADDRESS' ? (
                        <span className="rule-badge exact">Prioridade 1 (Endereço)</span>
                      ) : (
                        <span className="rule-badge default">Prioridade 2 (Padrão Paciente)</span>
                      )}
                    </td>
                    <td>
                      <span className="amount-highlight">
                        R$ {rule.pricePerSession.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs text-slate-600">
                        De: {rule.effectiveFrom}
                      </div>
                      <div className="text-xs text-slate-400">
                        Até: {rule.effectiveTo || 'Indeterminado'}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-slate-500">{rule.notes}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Histórico de Fechamentos Pagos */}
      {activeSubtab === 'history' && (
        <div className="financial-content-card">
          <div className="financial-table-header">
            <h2>
              <Receipt size={20} className="text-purple-600" />
              Extratos & Fechamentos Liquidados
            </h2>
          </div>

          <div className="table-responsive">
            <table className="financial-table">
              <thead>
                <tr>
                  <th>ID Fechamento</th>
                  <th>Profissional</th>
                  <th>Ciclo / Período</th>
                  <th>Total de Sessões</th>
                  <th>Valor Bruto Total</th>
                  <th>Data Pagamento</th>
                  <th>Comprovante / Ref</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {settlementHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-xs font-bold text-slate-700">{item.id}</td>
                    <td className="font-semibold text-slate-900">{item.professionalName}</td>
                    <td className="text-xs text-slate-600">{item.periodLabel}</td>
                    <td>{item.totalSessions} sessões</td>
                    <td>
                      <span className="amount-highlight text-emerald-700">
                        R$ {item.totalGrossAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600">{item.paidAt}</td>
                    <td className="font-mono text-xs text-slate-500">{item.receiptRef}</td>
                    <td>
                      <span className="settlement-status-badge paid">
                        <CheckCircle2 size={12} /> {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Cadastro de Nova Regra de Preço */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-pricing">
            <div className="modal-pricing-header">
              <h3>
                <Building size={20} className="text-emerald-600" />
                Cadastrar Preço na Matriz Multidimensional
              </h3>
              <button
                className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePricingRule}>
              <div className="modal-pricing-body">
                <div className="control-group">
                  <label>Profissional</label>
                  <select
                    className="control-select"
                    value={newRuleForm.professionalId}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, professionalId: e.target.value })}
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.profession})</option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label>Paciente</label>
                  <select
                    className="control-select"
                    value={newRuleForm.patientId}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, patientId: e.target.value })}
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1 pb-1">
                  <input
                    type="checkbox"
                    id="chkSpecificAddress"
                    checked={newRuleForm.isSpecificAddress}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, isSpecificAddress: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chkSpecificAddress" className="cursor-pointer text-sm font-medium text-slate-700">
                    Restringir ao endereço domiciliar cadastrado (Prioridade 1)
                  </label>
                </div>

                <div className="control-group">
                  <label>Valor por Sessão (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    className="control-input"
                    value={newRuleForm.pricePerSession}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, pricePerSession: e.target.value })}
                  />
                </div>

                <div className="control-group">
                  <label>Data de Início da Vigência</label>
                  <input
                    type="date"
                    required
                    className="control-input"
                    value={newRuleForm.effectiveFrom}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, effectiveFrom: e.target.value })}
                  />
                </div>

                <div className="control-group">
                  <label>Observações / Justificativa</label>
                  <input
                    type="text"
                    placeholder="Ex: Valor diferenciado para atendimento com mobilização intensiva"
                    className="control-input"
                    value={newRuleForm.notes}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-pricing-footer">
                <button
                  type="button"
                  className="btn-action cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-action generate"
                >
                  <CheckCircle2 size={16} /> Salvar Regra na Matriz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
