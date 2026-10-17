// src/components/MonthlyFinancialSettlementView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Calendar,
  DollarSign,
  TrendingUp,
  Plus,
  MapPin,
  X,
  FileSpreadsheet,
  Printer,
  Trash2,
  Edit2,
  AlertCircle,
  Building,
  Home,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import Avatar from './Avatar';
import './MonthlyFinancialSettlementView.css';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Feriados Nacionais Brasileiros (Mês 1-indexado)
const BRAZILIAN_HOLIDAYS = [
  '01-01', // Confraternização Universal
  '21-04', // Tiradentes
  '01-05', // Dia do Trabalho
  '07-09', // Independência do Brasil
  '12-10', // Nossa Senhora Aparecida
  '02-11', // Finados
  '15-11', // Proclamação da República
  '20-11', // Dia da Consciência Negra
  '25-12'  // Natal
];

/**
 * Classifica a data do atendimento: 'HOLIDAY' | 'WEEKEND' | 'WEEKDAY'
 */
function classifyDate(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return 'WEEKDAY';
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const key = `${day}-${month}`;
  if (BRAZILIAN_HOLIDAYS.includes(key)) return 'HOLIDAY';

  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'WEEKEND';

  return 'WEEKDAY';
}

export default function MonthlyFinancialSettlementView({
  doctors = [],
  patients = [],
  appointments = [],
  currentUser
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // Outubro
  const [activeSubtab, setActiveSubtab] = useState('settlement'); // 'settlement' | 'pricing'
  const [selectedPatientId, setSelectedPatientId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Identifica o profissional estritamente logado
  const activeProfessional = useMemo(() => {
    if (currentUser) {
      const match = (doctors || []).find(
        (d) => d.id === currentUser.id || d.userId === currentUser.id || d.email === currentUser.email
      );
      if (match) return match;
    }
    return doctors[0] || {
      id: 'doc-1',
      name: 'Dr. Profissional',
      crm: 'CREFITO Ativo',
      specialty: 'Fisioterapia Domiciliar'
    };
  }, [currentUser, doctors]);

  // Regras de precificação configuradas pelo profissional
  const [pricingRules, setPricingRules] = useState(() => {
    const saved = localStorage.getItem(`omnihome_pricing_${activeProfessional?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    // Regras padrão iniciais para demonstração
    return [
      {
        id: 'rule-demo-1',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        locationType: 'HOME',
        locationName: 'Domicílio Principal',
        dayType: 'WEEKDAY',
        hourlyRate: 150.0,
        fixedPrice: 150.0,
        notes: 'Sessão padrão dias úteis'
      },
      {
        id: 'rule-demo-2',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        locationType: 'HOME',
        locationName: 'Domicílio Principal',
        dayType: 'WEEKEND',
        hourlyRate: 200.0,
        fixedPrice: 200.0,
        notes: 'Plantão de fim de semana'
      },
      {
        id: 'rule-demo-3',
        patientId: 'pat-4',
        patientName: 'Gabriel Santos Oliveira',
        locationType: 'HOME',
        locationName: 'Domicílio Principal',
        dayType: 'WEEKDAY',
        hourlyRate: 180.0,
        fixedPrice: 180.0,
        notes: 'Fisioterapia cardiorrespiratória'
      }
    ];
  });

  // Salva regras no localStorage sempre que alteradas
  useEffect(() => {
    if (activeProfessional?.id) {
      localStorage.setItem(`omnihome_pricing_${activeProfessional.id}`, JSON.stringify(pricingRules));
    }
  }, [pricingRules, activeProfessional]);

  // Lista local e editável de atendimentos do mês para este profissional
  const [settlementSessions, setSettlementSessions] = useState([]);

  // Resolve o preço para um determinado paciente, local e data
  const resolvePrice = useCallback((patientId, _address, dateObj, durationMinutes = 60) => {
    const dayCategory = classifyDate(dateObj);

    // 1. Procura regra com paciente + dia correspondente (ou ANY_DAY) + local correspondente
    const matchingRule = pricingRules.find((r) => {
      if (r.patientId !== patientId) return false;
      const dayMatches = r.dayType === 'ANY_DAY' || r.dayType === dayCategory;
      return dayMatches;
    });

    if (matchingRule) {
      const rate = matchingRule.hourlyRate || (matchingRule.fixedPrice ? (matchingRule.fixedPrice / (durationMinutes / 60)) : 150.0);
      const total = (rate * durationMinutes) / 60;
      return {
        hourlyRate: rate,
        totalAmount: Math.round(total * 100) / 100,
        ruleApplied: `${matchingRule.dayType === 'WEEKEND' ? 'Fim de Semana' : matchingRule.dayType === 'HOLIDAY' ? 'Feriado' : 'Dia Útil'} (${matchingRule.locationName || 'Domicílio'})`
      };
    }

    // Preço base fallback
    const fallbackRate = dayCategory === 'WEEKEND' ? 180.0 : dayCategory === 'HOLIDAY' ? 220.0 : 150.0;
    const fallbackTotal = (fallbackRate * durationMinutes) / 60;
    return {
      hourlyRate: fallbackRate,
      totalAmount: Math.round(fallbackTotal * 100) / 100,
      ruleApplied: 'Tarifa Base Padrão'
    };
  }, [pricingRules]);

  // Inicializa as sessões do mês com base nos agendamentos da agenda
  useEffect(() => {
    if (!activeProfessional?.id) return;

    // Filtra agendamentos do profissional no mês/ano QUE TIVERAM CHECK-IN
    const proApts = (appointments || []).filter((apt) => {
      if (!apt) return false;
      const aptDocId = apt.doctorId || apt.professionalId;
      if (aptDocId !== activeProfessional.id) return false;
      if (apt.status === 'cancelled') return false;

      // EXIGÊNCIA: Apenas atendimentos com check-in realizado
      const isCheckedIn =
        apt.status === 'in_progress' ||
        apt.status === 'completed' ||
        apt.status === 'attended' ||
        Boolean(apt.checkInTime) ||
        Boolean(apt.checkedIn);
      if (!isCheckedIn) return false;

      const dateStr = apt.date || apt.scheduledTime;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;

      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });

    const parsedSessions = proApts.map((apt) => {
      const pat = (patients || []).find((p) => p.id === apt.patientId) || {};
      const dateStr = apt.date || (apt.scheduledTime ? apt.scheduledTime.split('T')[0] : '2026-10-01');
      const timeStr = apt.time || (apt.scheduledTime ? apt.scheduledTime.split('T')[1]?.slice(0, 5) : '09:00');
      const dateObj = new Date(`${dateStr}T${timeStr}:00`);
      const duration = Number(apt.durationMinutes || apt.duration || 60);

      const pricing = resolvePrice(apt.patientId, pat.address || apt.address, dateObj, duration);

      return {
        id: apt.id || `sess-${Date.now()}-${Math.random()}`,
        patientId: apt.patientId || 'pat-1',
        patientName: pat.name || apt.patientName || 'Paciente',
        patientAddress: pat.address || apt.address || 'Vitória - ES',
        locationType: 'HOME',
        dateStr,
        timeStr,
        durationMinutes: duration,
        hourlyRate: pricing.hourlyRate,
        totalAmount: pricing.totalAmount,
        ruleApplied: pricing.ruleApplied,
        status: apt.status || 'COMPLETED'
      };
    });

    // Ordena por data e hora crescente
    parsedSessions.sort((a, b) => new Date(`${a.dateStr}T${a.timeStr}`).getTime() - new Date(`${b.dateStr}T${b.timeStr}`).getTime());

    setSettlementSessions(parsedSessions);
  }, [selectedYear, selectedMonth, activeProfessional, appointments, patients, resolvePrice]);

  // Agrupamento por Paciente
  const groupedByPatient = useMemo(() => {
    const groups = {};

    settlementSessions.forEach((sess) => {
      if (!groups[sess.patientId]) {
        const pat = (patients || []).find((p) => p.id === sess.patientId) || {};
        groups[sess.patientId] = {
          patientId: sess.patientId,
          patientName: sess.patientName,
          patientAddress: sess.patientAddress || pat.address || 'Vitória - ES',
          phone: pat.phone || pat.responsiblePhone || '(27) 99999-0000',
          responsibleName: pat.responsibleName || pat.financialResponsible || pat.name,
          sessions: [],
          totalDurationMinutes: 0,
          totalAmount: 0
        };
      }

      groups[sess.patientId].sessions.push(sess);
      groups[sess.patientId].totalDurationMinutes += Number(sess.durationMinutes || 0);
      groups[sess.patientId].totalAmount += Number(sess.totalAmount || 0);
    });

    return Object.values(groups);
  }, [settlementSessions, patients]);

  // Sincroniza o paciente selecionado com os pacientes com atendimentos no mês
  useEffect(() => {
    if (groupedByPatient.length > 0) {
      const exists = groupedByPatient.some((g) => g.patientId === selectedPatientId);
      if (!exists) {
        setSelectedPatientId(groupedByPatient[0].patientId);
      }
    } else {
      setSelectedPatientId('');
    }
  }, [groupedByPatient, selectedPatientId]);

  // Totais Gerais do Mês do Profissional
  const monthTotals = useMemo(() => {
    const totalSessions = settlementSessions.length;
    const totalMinutes = settlementSessions.reduce((acc, s) => acc + Number(s.durationMinutes || 0), 0);
    const totalAmount = settlementSessions.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
    const totalPatients = groupedByPatient.length;

    return {
      totalSessions,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPatients
    };
  }, [settlementSessions, groupedByPatient]);

  // Modais de Edição e Inclusão de Atendimentos
  const [editingSession, setEditingSession] = useState(null);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionPatientId, setNewSessionPatientId] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('2026-10-05');
  const [newSessionTime, setNewSessionTime] = useState('09:00');
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [newSessionHourlyRate, setNewSessionHourlyRate] = useState(150.0);
  const [newSessionTotal, setNewSessionTotal] = useState(150.0);
  const [newSessionAddress, setNewSessionAddress] = useState('');

  // Atualiza valor total ao alterar duração ou taxa no modal de inclusão
  useEffect(() => {
    const tot = (Number(newSessionHourlyRate) * Number(newSessionDuration)) / 60;
    setNewSessionTotal(Math.round(tot * 100) / 100);
  }, [newSessionHourlyRate, newSessionDuration]);

  // Modal de Nova Regra de Preço
  const [isNewPriceModalOpen, setIsNewPriceModalOpen] = useState(false);
  const [rulePatientId, setRulePatientId] = useState('');
  const [ruleLocationType, setRuleLocationType] = useState('HOME');
  const [ruleLocationName, setRuleLocationName] = useState('Domicílio Principal');
  const [ruleDayType, setRuleDayType] = useState('WEEKDAY');
  const [ruleHourlyRate, setRuleHourlyRate] = useState(150.0);
  const [ruleNotes, setRuleNotes] = useState('');

  // Salvar Nova Regra de Preço
  const handleSavePriceRule = (e) => {
    e.preventDefault();
    const pat = (patients || []).find((p) => p.id === rulePatientId);
    if (!pat) {
      setErrorMsg('Selecione um paciente para a regra.');
      return;
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      patientId: rulePatientId,
      patientName: pat.name,
      locationType: ruleLocationType,
      locationName: ruleLocationName || (ruleLocationType === 'HOME' ? 'Domicílio' : 'Clínica / Outro'),
      dayType: ruleDayType,
      hourlyRate: parseFloat(ruleHourlyRate) || 150.0,
      fixedPrice: parseFloat(ruleHourlyRate) || 150.0,
      notes: ruleNotes.trim()
    };

    setPricingRules((prev) => [newRule, ...prev]);
    setIsNewPriceModalOpen(false);
    setSuccessMsg('Regra de preço registrada na sua tabela com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Excluir Regra de Preço
  const handleDeletePriceRule = (ruleId) => {
    setPricingRules((prev) => prev.filter((r) => r.id !== ruleId));
    setSuccessMsg('Regra de preço removida.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Salvar Edição de Sessão
  const handleSaveEditSession = (e) => {
    e.preventDefault();
    if (!editingSession) return;

    setSettlementSessions((prev) =>
      prev.map((s) => (s.id === editingSession.id ? { ...editingSession } : s))
    );

    setEditingSession(null);
    setSuccessMsg('Atendimento e valores atualizados no fechamento!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Excluir Sessão do Fechamento
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Tem certeza que deseja excluir este atendimento do fechamento mensal?')) {
      setSettlementSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccessMsg('Atendimento excluído do fechamento.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Incluir Novo Atendimento no Fechamento
  const handleAddSession = (e) => {
    e.preventDefault();
    const pat = (patients || []).find((p) => p.id === newSessionPatientId);
    if (!pat) {
      setErrorMsg('Selecione o paciente.');
      return;
    }

    const dateObj = new Date(`${newSessionDate}T${newSessionTime}:00`);
    const dayCategory = classifyDate(dateObj);
    const dayLabel = dayCategory === 'WEEKEND' ? 'Fim de Semana' : dayCategory === 'HOLIDAY' ? 'Feriado' : 'Dia Útil';

    const newSess = {
      id: `manual-sess-${Date.now()}`,
      patientId: newSessionPatientId,
      patientName: pat.name,
      patientAddress: newSessionAddress || pat.address || 'Vitória - ES',
      locationType: 'HOME',
      dateStr: newSessionDate,
      timeStr: newSessionTime,
      durationMinutes: Number(newSessionDuration),
      hourlyRate: Number(newSessionHourlyRate),
      totalAmount: Number(newSessionTotal),
      ruleApplied: `Inclusão Manual (${dayLabel})`,
      status: 'COMPLETED'
    };

    setSettlementSessions((prev) => {
      const next = [...prev, newSess];
      next.sort((a, b) => new Date(`${a.dateStr}T${a.timeStr}`).getTime() - new Date(`${b.dateStr}T${b.timeStr}`).getTime());
      return next;
    });

    setIsAddSessionModalOpen(false);
    setSuccessMsg('Novo atendimento incluído no fechamento com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Exportar Relatório em PDF para o Paciente / Responsável Financeiro
  const handleExportPDF = (patientGroup) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no navegador para gerar o demonstrativo em PDF.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];
    const totalHours = (patientGroup.totalDurationMinutes / 60).toFixed(1);

    const rowsHtml = patientGroup.sessions
      .map(
        (s, idx) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${idx + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            ${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')} às ${s.timeStr}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            ${s.patientAddress}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: center;">
            ${s.durationMinutes} min
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right;">
            R$ ${Number(s.hourlyRate).toFixed(2)}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: bold; color: #0284c7;">
            R$ ${Number(s.totalAmount).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Demonstrativo de Atendimentos — ${patientGroup.patientName} (${monthName}/${selectedYear})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
          .pro-info h2 { margin: 0 0 5px 0; color: #0284c7; font-size: 22px; }
          .pro-info p { margin: 2px 0; font-size: 13px; color: #64748b; }
          .statement-title { text-align: right; }
          .statement-title h1 { margin: 0 0 4px 0; font-size: 20px; color: #0f172a; }
          .statement-title span { font-size: 14px; font-weight: bold; color: #64748b; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 25px; display: flex; justify-content: space-between; }
          .patient-box div p { margin: 4px 0; font-size: 13px; }
          .patient-box strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .totals-box { display: flex; justify-content: flex-end; margin-top: 15px; }
          .totals-table { width: 320px; border-collapse: collapse; }
          .totals-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .totals-table tr.grand-total td { font-size: 18px; font-weight: 800; color: #0284c7; border-top: 2px solid #0284c7; border-bottom: none; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #94a3b8; text-align: center; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="pro-info">
            <h2>${activeProfessional.name}</h2>
            <p>${activeProfessional.crm || 'CREFITO Ativo'} • ${activeProfessional.specialty || 'Fisioterapia Domiciliar'}</p>
            <p>Atendimento Fisioterapêutico Especializado em Saúde Domiciliar</p>
          </div>
          <div class="statement-title">
            <h1>DEMONSTRATIVO DE SERVIÇOS</h1>
            <span>Competência: ${monthName} / ${selectedYear}</span>
          </div>
        </div>

        <div class="patient-box">
          <div>
            <p><strong>Paciente:</strong> ${patientGroup.patientName}</p>
            <p><strong>Endereço Atendido:</strong> ${patientGroup.patientAddress}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Responsável:</strong> ${patientGroup.responsibleName}</p>
            <p><strong>Contato:</strong> ${patientGroup.phone}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Data & Horário</th>
              <th>Local do Atendimento</th>
              <th style="text-align: center;">Duração</th>
              <th style="text-align: right;">Valor Hora</th>
              <th style="text-align: right;">Valor da Sessão</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals-box">
          <table class="totals-table">
            <tr>
              <td>Total de Sessões Realizadas:</td>
              <td style="text-align: right; font-weight: bold;">${patientGroup.sessions.length}</td>
            </tr>
            <tr>
              <td>Carga Horária Total:</td>
              <td style="text-align: right; font-weight: bold;">${totalHours} horas</td>
            </tr>
            <tr class="grand-total">
              <td>Total Geral:</td>
              <td style="text-align: right;">R$ ${patientGroup.totalAmount.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 40px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
          <strong style="color: #166534; display: block; margin-bottom: 4px;">Informações para Pagamento:</strong>
          <span style="font-size: 13px; color: #15803d;">Chave PIX do Profissional: <strong>${activeProfessional.email || 'contato@omnihomecare.com'}</strong> (${activeProfessional.name})</span>
        </div>

        <div class="footer">
          <p>Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • OmniHome Care</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Exportar Planilha Excel (.xlsx/.xls) para o Paciente
  const handleExportXLSX = (patientGroup) => {
    if (!patientGroup || !patientGroup.sessions || patientGroup.sessions.length === 0) {
      alert('Não há atendimentos registrados para exportar.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];
    const totalHours = (patientGroup.totalDurationMinutes / 60).toFixed(1);

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Demonstrativo</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          .header-title { font-size: 14pt; font-weight: bold; color: #0284c7; }
          .meta-row { font-size: 11pt; color: #1e293b; margin: 4px 0; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: left; border: 1px solid #94a3b8; padding: 8px 10px; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10.5pt; }
          .center { text-align: center; }
          .right { text-align: right; }
          .subtotal-row td { background-color: #f1f5f9; font-weight: bold; }
          .grand-total td { background-color: #e0f2fe; font-weight: bold; font-size: 11.5pt; color: #0369a1; }
        </style>
      </head>
      <body>
        <div class="header-title">DEMONSTRATIVO DE ATENDIMENTOS FISIOTERAPÊUTICOS</div>
        <div class="meta-row"><strong>Profissional:</strong> ${activeProfessional.name} (${activeProfessional.crm || 'CREFITO Ativo'}) - ${activeProfessional.specialty || 'Fisioterapia Domiciliar'}</div>
        <div class="meta-row"><strong>Paciente:</strong> ${patientGroup.patientName}</div>
        <div class="meta-row"><strong>Endereço Atendido:</strong> ${patientGroup.patientAddress}</div>
        <div class="meta-row"><strong>Responsável Financeiro:</strong> ${patientGroup.responsibleName} (Contato: ${patientGroup.phone})</div>
        <div class="meta-row"><strong>Competência:</strong> ${monthName} / ${selectedYear}</div>
        <br/>
        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">#</th>
              <th style="width: 100px; text-align: center;">Data</th>
              <th style="width: 80px; text-align: center;">Horário</th>
              <th>Endereço do Domicílio</th>
              <th style="width: 110px; text-align: center;">Duração (min)</th>
              <th style="width: 130px; text-align: right;">Valor Hora (R$)</th>
              <th style="width: 140px; text-align: right;">Valor Sessão (R$)</th>
              <th>Regra Aplicada</th>
            </tr>
          </thead>
          <tbody>
            ${patientGroup.sessions.map((s, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td class="center">${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="center">${s.timeStr}</td>
                <td>${s.patientAddress}</td>
                <td class="center">${s.durationMinutes}</td>
                <td class="right">R$ ${Number(s.hourlyRate).toFixed(2).replace('.', ',')}</td>
                <td class="right"><strong>R$ ${Number(s.totalAmount).toFixed(2).replace('.', ',')}</strong></td>
                <td>${s.ruleApplied}</td>
              </tr>
            `).join('')}
            <tr class="subtotal-row">
              <td colspan="4" class="right">Total de Sessões com Check-in:</td>
              <td class="center">${patientGroup.sessions.length}</td>
              <td class="right">Carga Horária Total:</td>
              <td colspan="2" class="left">${totalHours} horas</td>
            </tr>
            <tr class="grand-total">
              <td colspan="6" class="right" style="font-size: 12pt;">VALOR TOTAL A PAGAR:</td>
              <td colspan="2" class="right" style="font-size: 12pt;">R$ ${patientGroup.totalAmount.toFixed(2).replace('.', ',')}</td>
            </tr>
          </tbody>
        </table>
        <br/>
        <div style="font-size: 9pt; color: #64748b;">
          Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • OmniHome Care
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = patientGroup.patientName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ_-]/g, '_');
    link.download = `Demonstrativo_${sanitizedName}_${monthName}_${selectedYear}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="financial-container">
      {/* Header Individual do Profissional */}
      <div className="financial-header">
        <div className="financial-title-box">
          <h2>
            <Wallet size={26} color="var(--primary)" />
            Meu Fechamento Mensal
          </h2>
          <p>
            Visão individual e demonstrativo de honorários de <strong>{activeProfessional.name}</strong> ({activeProfessional.crm || 'CREFITO Ativo'}).
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
            className="btn btn-primary"
            onClick={() => setIsAddSessionModalOpen(true)}
            title="Incluir atendimento realizado avulso neste mês"
          >
            <Plus size={16} />
            Incluir Atendimento
          </button>
        </div>
      </div>

      {/* Subtabs: Apuração Individual x Tabela de Preços */}
      <div className="financial-subtabs">
        <button
          className={`subtab-btn ${activeSubtab === 'settlement' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('settlement')}
        >
          <Calendar size={18} />
          Meus Atendimentos ({MONTH_NAMES[selectedMonth - 1]}/{selectedYear})
        </button>
        <button
          className={`subtab-btn ${activeSubtab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('pricing')}
        >
          <DollarSign size={18} />
          Minha Tabela de Preços Contextuais ({pricingRules.length})
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
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. ABA APURAÇÃO DO MÊS (POR PACIENTE) */}
      {activeSubtab === 'settlement' && (
        <>
          {/* KPI Cards do Profissional */}
          <div className="kpi-grid">
            <div className="kpi-card highlight">
              <div className="kpi-header">
                <span>Meu Faturamento no Mês</span>
                <div className="kpi-icon-badge" style={{ background: 'rgba(2, 132, 199, 0.15)', color: 'var(--primary)' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value">
                R$ {monthTotals.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtitle">
                {monthTotals.totalSessions} sessões em {monthTotals.totalHours} horas atendidas
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Total de Atendimentos</span>
                <div className="kpi-icon-badge" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                  <Calendar size={18} />
                </div>
              </div>
              <div className="kpi-value">
                {monthTotals.totalSessions}
              </div>
              <div className="kpi-subtitle">
                Em {monthTotals.totalPatients} pacientes atendidos
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span>Média por Sessão</span>
                <div className="kpi-icon-badge" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: 'var(--success)' }}>
                R$ {monthTotals.totalSessions > 0 ? (monthTotals.totalAmount / monthTotals.totalSessions).toFixed(2) : '0,00'}
              </div>
              <div className="kpi-subtitle">
                Ticket médio individual
              </div>
            </div>
          </div>

          {/* Seletor Individual de Paciente */}
          {groupedByPatient.length > 0 && (
            <div className="patient-selector-card">
              <div className="patient-selector-content">
                <div className="patient-selector-label">
                  <UserCheck size={20} color="var(--primary)" />
                  <div>
                    <span className="patient-selector-title">Visualizar Paciente Individual:</span>
                    <span className="patient-selector-subtitle">
                      Selecione um paciente para inspecionar seus atendimentos e exportar o demonstrativo mensal
                    </span>
                  </div>
                </div>

                <div className="patient-selector-controls">
                  <select
                    id="patient-select-dropdown"
                    className="select-control patient-dropdown-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    {groupedByPatient.map((g) => (
                      <option key={g.patientId} value={g.patientId}>
                        {g.patientName} — {g.sessions.length} {g.sessions.length === 1 ? 'sessão' : 'sessões'} (R$ {g.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {groupedByPatient.length > 1 && (
                <div className="patient-quick-pills">
                  {groupedByPatient.map((g) => (
                    <button
                      key={g.patientId}
                      type="button"
                      className={`patient-pill-btn ${g.patientId === selectedPatientId ? 'active' : ''}`}
                      onClick={() => setSelectedPatientId(g.patientId)}
                    >
                      <span className="pill-name">{g.patientName}</span>
                      <span className="pill-count">{g.sessions.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card do Paciente Selecionado */}
          {groupedByPatient.length === 0 ? (
            <div className="table-card">
              <div className="empty-state-box">
                <Calendar size={48} color="var(--text-muted)" />
                <h4>Nenhum atendimento com check-in realizado neste mês</h4>
                <p>
                  O fechamento mensal considera exclusivamente atendimentos em que o check-in foi efetuado.
                  Faça o check-in dos atendimentos na <strong>Agenda</strong> ou utilize o botão <strong>"Incluir Atendimento"</strong>.
                </p>
              </div>
            </div>
          ) : (
            (() => {
              const group = groupedByPatient.find((g) => g.patientId === selectedPatientId) || groupedByPatient[0];
              if (!group) return null;

              return (
                <div key={group.patientId} className="patient-financial-card">
                  {/* Header do Paciente */}
                  <div className="patient-card-header">
                    <div className="patient-info-block">
                      <Avatar name={group.patientName} size={40} color="var(--primary)" />
                      <div>
                        <h3>{group.patientName}</h3>
                        <p>
                          <MapPin size={14} color="var(--primary)" />
                          {group.patientAddress} • Responsável: {group.responsibleName} ({group.phone})
                        </p>
                      </div>
                    </div>

                    {/* Ações de Exportação para o Paciente */}
                    <div className="patient-actions-block">
                      <button
                        className="btn-export pdf"
                        onClick={() => handleExportPDF(group)}
                        title="Gerar e imprimir demonstrativo formal em PDF para enviar ao paciente/responsável"
                      >
                        <Printer size={15} />
                        Gerar PDF p/ Paciente
                      </button>

                      <button
                        className="btn-export excel"
                        onClick={() => handleExportXLSX(group)}
                        title="Baixar planilha Excel (.xls) com o demonstrativo deste paciente"
                      >
                        <FileSpreadsheet size={15} />
                        Exportar Excel (XLSX)
                      </button>
                    </div>
                  </div>

                  {/* Tabela de Atendimentos deste Paciente */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="financial-table">
                      <thead>
                        <tr>
                          <th>Data & Horário</th>
                          <th>Tipo de Dia</th>
                          <th>Duração</th>
                          <th>Custo Horário (R$/h)</th>
                          <th>Valor Total da Sessão</th>
                          <th>Regra Aplicada</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.sessions.map((sess) => {
                          const dateObj = new Date(`${sess.dateStr}T${sess.timeStr}:00`);
                          const dayCat = classifyDate(dateObj);

                          return (
                            <tr key={sess.id}>
                              <td>
                                <strong>
                                  {new Date(sess.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </strong>
                                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {sess.timeStr}
                                </span>
                              </td>

                              <td>
                                <span className={`daytype-badge ${dayCat.toLowerCase()}`}>
                                  {dayCat === 'WEEKEND' ? 'Final de Semana' : dayCat === 'HOLIDAY' ? 'Feriado' : 'Dia Útil (Semana)'}
                                </span>
                              </td>

                              <td>
                                <span style={{ fontWeight: 600 }}>{sess.durationMinutes} min</span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  ({(sess.durationMinutes / 60).toFixed(1)}h)
                                </span>
                              </td>

                              <td>
                                <strong style={{ color: 'var(--text-headline)' }}>
                                  R$ {Number(sess.hourlyRate).toFixed(2)}/h
                                </strong>
                              </td>

                              <td>
                                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                                  R$ {Number(sess.totalAmount).toFixed(2)}
                                </strong>
                              </td>

                              <td>
                                <span className="rule-tag default">
                                  {sess.ruleApplied}
                                </span>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    className="btn-action-sm"
                                    onClick={() => setEditingSession({ ...sess })}
                                    title="Corrigir valores ou duração deste atendimento"
                                  >
                                    <Edit2 size={13} />
                                    Corrigir
                                  </button>
                                  <button
                                    className="btn-action-sm danger"
                                    onClick={() => handleDeleteSession(sess.id)}
                                    title="Excluir este atendimento do fechamento"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Subtotalizador do Paciente */}
                  <div className="patient-subtotal-bar">
                    <div className="patient-subtotal-stats">
                      <span>
                        Total de Sessões: <strong>{group.sessions.length}</strong>
                      </span>
                      <span>
                        Horas Realizadas: <strong>{(group.totalDurationMinutes / 60).toFixed(1)} horas</strong>
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>
                        Subtotal a Receber de {group.patientName.split(' ')[0]}:
                      </span>
                      <div className="patient-subtotal-total">
                        R$ {group.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}

      {/* 2. ABA MINHA TABELA DE PREÇOS (MULTI-CRITÉRIO: PACIENTE X LOCAL X DIA) */}
      {activeSubtab === 'pricing' && (
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <div className="table-card-title">
                <DollarSign size={20} color="var(--primary)" />
                Minha Tabela de Preços Contextuais
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Defina preços diferenciados para o mesmo paciente variando por <strong>Local de Atendimento</strong> (Domicílio, Clínica, Outro) e <strong>Tipo de Dia</strong> (Dias de semana, Finais de semana e Feriados).
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
                  <th>Paciente</th>
                  <th>Local do Atendimento</th>
                  <th>Dia de Aplicação</th>
                  <th>Valor Hora (R$/h)</th>
                  <th>Valor Sessão Padrão (60min)</th>
                  <th>Observação</th>
                  <th style={{ textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pricingRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      Nenhuma regra personalizada cadastrada. Os atendimentos usarão a tarifa base padrão (R$ 150/h semana, R$ 180/h fim de semana, R$ 220/h feriado).
                    </td>
                  </tr>
                ) : (
                  pricingRules.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.patientName}</strong>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {r.locationType === 'CLINIC' ? (
                            <Building size={14} color="var(--primary)" />
                          ) : (
                            <Home size={14} color="var(--primary)" />
                          )}
                          {r.locationName || (r.locationType === 'CLINIC' ? 'Clínica' : 'Domicílio Principal')}
                        </span>
                      </td>
                      <td>
                        <span className={`daytype-badge ${r.dayType === 'WEEKEND' ? 'weekend' : r.dayType === 'HOLIDAY' ? 'holiday' : 'weekday'}`}>
                          {r.dayType === 'WEEKEND'
                            ? 'Finais de Semana (Sáb/Dom)'
                            : r.dayType === 'HOLIDAY'
                            ? 'Feriados Nacionais'
                            : r.dayType === 'ANY_DAY'
                            ? 'Qualquer Dia'
                            : 'Dias de Semana (Seg-Sex)'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                          R$ {Number(r.hourlyRate).toFixed(2)}/h
                        </strong>
                      </td>
                      <td>
                        <strong>
                          R$ {Number(r.fixedPrice || r.hourlyRate).toFixed(2)}
                        </strong>
                      </td>
                      <td>{r.notes || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-action-sm danger"
                          onClick={() => handleDeletePriceRule(r.id)}
                          title="Remover regra de preço"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CORRIGIR VALORES / ATENDIMENTO */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Edit2 size={18} color="var(--primary)" />
                Corrigir Valores do Atendimento — {editingSession.patientName}
              </h3>
              <button
                className="btn-action-sm"
                onClick={() => setEditingSession(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSession}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Data da Sessão</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingSession.dateStr}
                      onChange={(e) => setEditingSession({ ...editingSession, dateStr: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Horário</label>
                    <input
                      type="time"
                      className="form-input"
                      value={editingSession.timeStr}
                      onChange={(e) => setEditingSession({ ...editingSession, timeStr: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço / Local Atendido</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingSession.patientAddress}
                    onChange={(e) => setEditingSession({ ...editingSession, patientAddress: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Duração (minutos)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingSession.durationMinutes}
                      onChange={(e) => {
                        const dur = Number(e.target.value);
                        const tot = (dur * Number(editingSession.hourlyRate)) / 60;
                        setEditingSession({
                          ...editingSession,
                          durationMinutes: dur,
                          totalAmount: Math.round(tot * 100) / 100
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Custo Horário (R$/h)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={editingSession.hourlyRate}
                      onChange={(e) => {
                        const rate = Number(e.target.value);
                        const tot = (Number(editingSession.durationMinutes) * rate) / 60;
                        setEditingSession({
                          ...editingSession,
                          hourlyRate: rate,
                          totalAmount: Math.round(tot * 100) / 100
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Total da Sessão (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ fontWeight: 800, color: 'var(--primary)' }}
                      value={editingSession.totalAmount}
                      onChange={(e) => setEditingSession({ ...editingSession, totalAmount: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingSession(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Salvar Correção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INCLUIR ATENDIMENTO AVULSO */}
      {isAddSessionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddSessionModalOpen(false)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={18} color="var(--primary)" />
                Incluir Atendimento no Fechamento Mensal
              </h3>
              <button
                className="btn-action-sm"
                onClick={() => setIsAddSessionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Paciente *</label>
                  <select
                    className="form-input"
                    value={newSessionPatientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNewSessionPatientId(id);
                      const pat = (patients || []).find((p) => p.id === id);
                      if (pat) {
                        setNewSessionAddress(pat.address || '');
                      }
                    }}
                    required
                  >
                    <option value="">Selecione o paciente atendido...</option>
                    {(patients || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Data da Sessão *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Horário *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={newSessionTime}
                      onChange={(e) => setNewSessionTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço do Atendimento</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSessionAddress}
                    onChange={(e) => setNewSessionAddress(e.target.value)}
                    placeholder="Ex: Av. Dante Michelini, 500"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Duração (minutos)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newSessionDuration}
                      onChange={(e) => setNewSessionDuration(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Custo Horário (R$/h)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={newSessionHourlyRate}
                      onChange={(e) => setNewSessionHourlyRate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Total (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      style={{ fontWeight: 800, color: 'var(--primary)' }}
                      value={newSessionTotal}
                      onChange={(e) => setNewSessionTotal(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddSessionModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Incluir Atendimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVA REGRA DE PRECIFICAÇÃO CONTEXTUAL */}
      {isNewPriceModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewPriceModalOpen(false)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <DollarSign size={18} color="var(--primary)" />
                Nova Regra de Preço na Minha Tabela
              </h3>
              <button
                className="btn-action-sm"
                onClick={() => setIsNewPriceModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePriceRule}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Paciente *</label>
                  <select
                    className="form-input"
                    value={rulePatientId}
                    onChange={(e) => setRulePatientId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o paciente...</option>
                    {(patients || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tipo de Local *</label>
                    <select
                      className="form-input"
                      value={ruleLocationType}
                      onChange={(e) => setRuleLocationType(e.target.value)}
                    >
                      <option value="HOME">Domicílio do Paciente</option>
                      <option value="CLINIC">Consultório / Clínica</option>
                      <option value="OTHER">Outro Endereço Específico</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nome / Descrição do Local</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Domicílio Principal, Consultório Praia do Canto..."
                      value={ruleLocationName}
                      onChange={(e) => setRuleLocationName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Dias de Aplicação *</label>
                    <select
                      className="form-input"
                      value={ruleDayType}
                      onChange={(e) => setRuleDayType(e.target.value)}
                    >
                      <option value="WEEKDAY">Dias de Semana (Segunda a Sexta)</option>
                      <option value="WEEKEND">Final de Semana (Sábado e Domingo)</option>
                      <option value="HOLIDAY">Feriados Nacionais</option>
                      <option value="ANY_DAY">Qualquer Dia (Indiferente)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor Hora (R$/h) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={ruleHourlyRate}
                      onChange={(e) => setRuleHourlyRate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observação / Justificativa</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Atendimento com taxa extra de deslocamento ou plantão"
                    value={ruleNotes}
                    onChange={(e) => setRuleNotes(e.target.value)}
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
                  Salvar Regra de Preço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
