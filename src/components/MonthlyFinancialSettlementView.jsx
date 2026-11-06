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
  UserCheck,
  Layers,
  FileText,
  RefreshCw,
  Users
} from 'lucide-react';
import Avatar from './Avatar';
import './MonthlyFinancialSettlementView.css';
import { API_BASE_URL } from '../services/apiConfig';

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

const DEFAULT_DEMO_PRICING_RULES = [
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

function parseNumericInput(val, fallback = 0) {
  if (val === '' || val === null || val === undefined) return fallback;
  const normalized = String(val).replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
}

function readLocalStorageJson(key, fallback) {
  if (typeof window === 'undefined' || !key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function extractYearMonthFromDateStr(dateStr) {
  if (!dateStr) return null;
  const isoPart = String(dateStr).split('T')[0];
  const parts = isoPart.split('-').map(Number);
  if (parts.length === 3 && parts[0] > 1900 && parts[1] >= 1 && parts[1] <= 12) {
    return { year: parts[0], month: parts[1], cleanDateStr: isoPart };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    cleanDateStr: d.toISOString().slice(0, 10)
  };
}

function formatCurrencyBR(val) {
  return Number(val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSwapBadgeText(sess) {
  if (!sess) return '';
  if (sess.swapType === 'COVERED') {
    const partner = sess.swapPartnerName ? `Atendeu no lugar de ${sess.swapPartnerName}` : 'Assumiu plantão em troca';
    const reason = sess.swapReason ? ` (${sess.swapReason})` : '';
    return `🔄 Troca: ${partner}${reason}`;
  }
  if (sess.swapType === 'CEDED' || sess.isInformationalSwap) {
    const partner = sess.swapPartnerName ? `Realizado por ${sess.swapPartnerName}` : 'Realizado por colega';
    const reason = sess.swapReason ? ` (${sess.swapReason})` : '';
    return `↪ Plantão Cedido: ${partner}${reason}`;
  }
  return '';
}

export default function MonthlyFinancialSettlementView({
  doctors = [],
  patients = [],
  appointments = [],
  currentUser,
  selectedDoctorId,
  setSelectedDoctorId,
  onUpdateAppointment
}) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // Outubro
  const [activeSubtab, setActiveSubtab] = useState('settlement'); // 'settlement' | 'pricing'
  const [selectedPatientId, setSelectedPatientId] = useState('all');
  const [consolidatedViewMode, setConsolidatedViewMode] = useState('by_patient'); // 'by_patient' | 'chronological'
  const [includeScheduled, setIncludeScheduled] = useState(false);
  const [internalDoctorId, setInternalDoctorId] = useState(() => {
    if (selectedDoctorId && selectedDoctorId !== 'all') return selectedDoctorId;
    if (currentUser?.professionalId) return currentUser.professionalId;
    const match = (doctors || []).find(
      (d) => d.id === currentUser?.id || d.userId === currentUser?.id || d.email === currentUser?.email
    );
    if (match) return match.id;
    return doctors[0]?.id || 'doc-1';
  });

  const effectiveDoctorId = selectedDoctorId && selectedDoctorId !== 'all' ? selectedDoctorId : internalDoctorId;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Identifica o profissional estritamente logado
  const activeProfessional = useMemo(() => {
    const docMatch = (doctors || []).find((d) => d.id === effectiveDoctorId);
    if (docMatch) return docMatch;
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
  }, [effectiveDoctorId, currentUser, doctors]);

  // Lista de colegas da clínica para seleção rápida nas trocas de escala ("quem fez o quê")
  const colleagueOptions = useMemo(() => {
    return (doctors || []).filter((d) => d && d.id !== 'all' && d.id !== activeProfessional?.id);
  }, [doctors, activeProfessional?.id]);

  // Helper para persistir estado compartilhado no localStorage e na nuvem PostgreSQL
  const persistCloudAndLocal = useCallback((localKey, cloudKey, value) => {
    if (typeof window !== 'undefined' && localKey) {
      try {
        localStorage.setItem(localKey, JSON.stringify(value));
      } catch {}
    }
    if (cloudKey) {
      fetch(`${API_BASE_URL}/api/scheduler/cloud-state/${cloudKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      }).catch((err) => console.warn(`Erro ao sincronizar ${cloudKey} na nuvem:`, err));
    }
  }, []);

  // Regras de precificação configuradas pelo profissional
  const [pricingRules, setPricingRules] = useState(() =>
    readLocalStorageJson(`omnihome_pricing_${activeProfessional?.id}`, DEFAULT_DEMO_PRICING_RULES)
  );

  // Correções manuais de valores/dados de sessões ("Corrigir") persistidas em localStorage e nuvem
  const [sessionOverrides, setSessionOverrides] = useState(() =>
    readLocalStorageJson(`omnihome_settlement_overrides_${activeProfessional?.id}`, {})
  );

  // Lista local e editável de atendimentos do mês para este profissional
  const [settlementSessions, setSettlementSessions] = useState([]);
  const [manualSessions, setManualSessions] = useState(() =>
    readLocalStorageJson(`omnihome_settlement_manual_${activeProfessional?.id}`, [])
  );
  const [deletedSessionIds, setDeletedSessionIds] = useState(() =>
    readLocalStorageJson(`omnihome_settlement_deleted_${activeProfessional?.id}`, [])
  );

  // Carrega regras de preço, correções de valores e sessões manuais ao iniciar ou trocar de profissional
  useEffect(() => {
    const profId = activeProfessional?.id;
    if (!profId) return;

    let cancelled = false;

    // 1. Hidratação imediata do localStorage específico deste profissional
    const localRules = readLocalStorageJson(`omnihome_pricing_${profId}`, DEFAULT_DEMO_PRICING_RULES);
    const localOverrides = readLocalStorageJson(`omnihome_settlement_overrides_${profId}`, {});
    const localManual = readLocalStorageJson(`omnihome_settlement_manual_${profId}`, []);
    const localDeleted = readLocalStorageJson(`omnihome_settlement_deleted_${profId}`, []);

    setPricingRules(Array.isArray(localRules) ? localRules : DEFAULT_DEMO_PRICING_RULES);
    setSessionOverrides(localOverrides && typeof localOverrides === 'object' ? localOverrides : {});
    setManualSessions(Array.isArray(localManual) ? localManual : []);
    setDeletedSessionIds(Array.isArray(localDeleted) ? localDeleted : []);

    // 2. Sincronização assíncrona com o PostgreSQL na nuvem (Cross-Device)
    const syncFromCloud = async () => {
      try {
        const [rulesRes, overridesRes, manualRes, deletedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/scheduler/cloud-state/pricing_rules_${profId}`).catch(() => null),
          fetch(`${API_BASE_URL}/api/scheduler/cloud-state/settlement_overrides_${profId}`).catch(() => null),
          fetch(`${API_BASE_URL}/api/scheduler/cloud-state/settlement_manual_${profId}`).catch(() => null),
          fetch(`${API_BASE_URL}/api/scheduler/cloud-state/settlement_deleted_${profId}`).catch(() => null)
        ]);

        if (cancelled) return;

        if (rulesRes && rulesRes.ok) {
          const data = await rulesRes.json().catch(() => null);
          if (!cancelled && data && Array.isArray(data.value) && data.value.length > 0) {
            setPricingRules(data.value);
            localStorage.setItem(`omnihome_pricing_${profId}`, JSON.stringify(data.value));
          }
        }

        if (overridesRes && overridesRes.ok) {
          const data = await overridesRes.json().catch(() => null);
          if (!cancelled && data && data.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
            setSessionOverrides((prev) => {
              const merged = { ...data.value };
              for (const [k, localVal] of Object.entries(prev || {})) {
                const cloudVal = merged[k];
                if (!cloudVal || (localVal?.updatedAt || 0) >= (cloudVal?.updatedAt || 0)) {
                  merged[k] = localVal;
                }
              }
              localStorage.setItem(`omnihome_settlement_overrides_${profId}`, JSON.stringify(merged));
              return merged;
            });
          }
        }

        if (manualRes && manualRes.ok) {
          const data = await manualRes.json().catch(() => null);
          if (!cancelled && data && Array.isArray(data.value)) {
            setManualSessions(data.value);
            localStorage.setItem(`omnihome_settlement_manual_${profId}`, JSON.stringify(data.value));
          }
        }

        if (deletedRes && deletedRes.ok) {
          const data = await deletedRes.json().catch(() => null);
          if (!cancelled && data && Array.isArray(data.value)) {
            setDeletedSessionIds(data.value);
            localStorage.setItem(`omnihome_settlement_deleted_${profId}`, JSON.stringify(data.value));
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar estado financeiro da nuvem:', err);
      }
    };

    syncFromCloud();

    return () => {
      cancelled = true;
    };
  }, [activeProfessional?.id]);

  // Resolve o preço para um determinado paciente, local e data
  const resolvePrice = useCallback((patientId, _address, dateObj, durationMinutes = 60) => {
    const dayCategory = classifyDate(dateObj);
    const safeDuration = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;

    // 1. Procura regra com paciente + dia correspondente (ou ANY_DAY) + local correspondente
    const matchingRule = pricingRules.find((r) => {
      if (r.patientId !== patientId) return false;
      const dayMatches = r.dayType === 'ANY_DAY' || r.dayType === dayCategory;
      return dayMatches;
    });

    if (matchingRule) {
      const rawRate =
        matchingRule.hourlyRate ||
        (matchingRule.fixedPrice ? matchingRule.fixedPrice / (safeDuration / 60) : 150.0);
      const rate = Math.round(Number(rawRate) * 100) / 100;
      const total = (rate * safeDuration) / 60;
      return {
        hourlyRate: rate,
        totalAmount: Math.round(total * 100) / 100,
        ruleApplied: `${matchingRule.dayType === 'WEEKEND' ? 'Fim de Semana' : matchingRule.dayType === 'HOLIDAY' ? 'Feriado' : 'Dia Útil'} (${matchingRule.locationName || 'Domicílio'})`
      };
    }

    // Preço base fallback
    const fallbackRate = dayCategory === 'WEEKEND' ? 180.0 : dayCategory === 'HOLIDAY' ? 220.0 : 150.0;
    const fallbackTotal = (fallbackRate * safeDuration) / 60;
    return {
      hourlyRate: fallbackRate,
      totalAmount: Math.round(fallbackTotal * 100) / 100,
      ruleApplied: 'Tarifa Base Padrão'
    };
  }, [pricingRules]);

  // Inicializa as sessões do mês com base nos agendamentos da agenda + correções manuais + inclusões avulsas
  useEffect(() => {
    if (!activeProfessional?.id) return;

    const deletedSet = new Set(deletedSessionIds || []);
    const matchedManualIds = new Set();

    // Filtra agendamentos do profissional no mês/ano QUE TIVERAM CHECK-IN
    const proApts = (appointments || []).filter((apt) => {
      if (!apt) return false;
      if (apt.id && deletedSet.has(apt.id)) return false;

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
      if (!isCheckedIn && !includeScheduled) return false;

      const override = apt.id ? sessionOverrides?.[apt.id] : null;
      const effectiveDateInput = override?.dateStr || apt.date || apt.scheduledTime;
      const ym = extractYearMonthFromDateStr(effectiveDateInput);
      if (!ym) return false;

      return ym.month === selectedMonth && ym.year === selectedYear;
    });

    const parsedSessions = proApts.map((apt) => {
      const pat = (patients || []).find((p) => p.id === apt.patientId) || {};
      const baseYm = extractYearMonthFromDateStr(apt.date || apt.scheduledTime);
      const baseDateStr = baseYm?.cleanDateStr || '2026-10-01';
      const baseTimeStr =
        apt.time || (apt.scheduledTime ? apt.scheduledTime.split('T')[1]?.slice(0, 5) : '09:00');

      // Verifica se este agendamento corresponde a uma inclusão manual (por ID ou chave composta)
      const manualMatch = (manualSessions || []).find(
        (m) =>
          m &&
          (m.id === apt.id ||
            (!m.isInformationalSwap &&
              m.swapType !== 'CEDED' &&
              m.patientId === apt.patientId &&
              m.dateStr === baseDateStr &&
              m.timeStr === baseTimeStr))
      );
      if (manualMatch?.id) {
        matchedManualIds.add(manualMatch.id);
      }

      const override =
        (apt.id && sessionOverrides?.[apt.id]) ||
        (manualMatch?.id && sessionOverrides?.[manualMatch.id]) ||
        null;

      const dateStr = override?.dateStr || manualMatch?.dateStr || baseDateStr;
      const timeStr = override?.timeStr || manualMatch?.timeStr || baseTimeStr;
      const dateObj = new Date(`${dateStr}T${timeStr}:00`);
      const duration = Number(
        override?.durationMinutes ?? manualMatch?.durationMinutes ?? apt.durationMinutes ?? apt.duration ?? 60
      );
      const patientAddress =
        override?.patientAddress || manualMatch?.patientAddress || pat.address || apt.address || 'Vitória - ES';

      const swapType = override?.swapType || manualMatch?.swapType || 'NONE';
      const swapPartnerName = override?.swapPartnerName ?? manualMatch?.swapPartnerName ?? '';
      const swapReason = override?.swapReason ?? manualMatch?.swapReason ?? '';
      const isInformationalSwap = Boolean(
        override?.isInformationalSwap ?? manualMatch?.isInformationalSwap ?? swapType === 'CEDED'
      );

      const pricing = resolvePrice(apt.patientId, patientAddress, dateObj, duration);

      const rawHourlyRate =
        override?.hourlyRate !== undefined
          ? Number(override.hourlyRate)
          : manualMatch?.hourlyRate !== undefined
          ? Number(manualMatch.hourlyRate)
          : pricing.hourlyRate;

      const rawTotalAmount =
        override?.totalAmount !== undefined
          ? Number(override.totalAmount)
          : manualMatch?.totalAmount !== undefined
          ? Number(manualMatch.totalAmount)
          : pricing.totalAmount;

      const hourlyRate = isInformationalSwap ? 0 : rawHourlyRate;
      const totalAmount = isInformationalSwap ? 0 : rawTotalAmount;

      const ruleApplied = isInformationalSwap
        ? 'Troca de Escala (Plantão Cedido)'
        : override?.ruleApplied || manualMatch?.ruleApplied || pricing.ruleApplied;

      const rawAptNotes = apt.notes || apt.swapInfo || apt.observation || apt.comments || '';
      const notes =
        override?.notes !== undefined
          ? override.notes
          : manualMatch?.notes !== undefined
          ? manualMatch.notes
          : rawAptNotes;

      return {
        id: apt.id || `sess-${Date.now()}-${Math.random()}`,
        patientId: apt.patientId || 'pat-1',
        patientName: pat.name || apt.patientName || manualMatch?.patientName || 'Paciente',
        patientAddress,
        locationType: 'HOME',
        dateStr,
        timeStr,
        durationMinutes: duration,
        hourlyRate: Math.round(hourlyRate * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        ruleApplied,
        notes,
        swapType,
        swapPartnerName,
        swapReason,
        isInformationalSwap,
        status: apt.status || 'COMPLETED'
      };
    });

    // Combina agendamentos com as sessões manuais persistidas na nuvem ainda não vinculadas
    const monthManual = (manualSessions || [])
      .filter((s) => {
        if (!s || !s.id) return false;
        if (deletedSet.has(s.id) || matchedManualIds.has(s.id)) return false;
        const override = sessionOverrides?.[s.id];
        const ym = extractYearMonthFromDateStr(override?.dateStr || s.dateStr);
        if (!ym) return false;
        return ym.month === selectedMonth && ym.year === selectedYear;
      })
      .map((s) => {
        const override = sessionOverrides?.[s.id];
        const swapType = override?.swapType || s.swapType || 'NONE';
        const swapPartnerName = override?.swapPartnerName ?? s.swapPartnerName ?? '';
        const swapReason = override?.swapReason ?? s.swapReason ?? '';
        const isInformationalSwap = Boolean(
          override?.isInformationalSwap ?? s.isInformationalSwap ?? swapType === 'CEDED'
        );

        const durationMinutes = Number(override?.durationMinutes ?? s.durationMinutes ?? 60);
        const hourlyRate = isInformationalSwap
          ? 0
          : Math.round(Number(override?.hourlyRate ?? s.hourlyRate ?? 150) * 100) / 100;
        const totalAmount = isInformationalSwap
          ? 0
          : Math.round(Number(override?.totalAmount ?? s.totalAmount ?? 150) * 100) / 100;

        return {
          ...s,
          dateStr: override?.dateStr || s.dateStr,
          timeStr: override?.timeStr || s.timeStr,
          patientAddress: override?.patientAddress || s.patientAddress,
          durationMinutes,
          hourlyRate,
          totalAmount,
          ruleApplied: isInformationalSwap
            ? 'Troca de Escala (Plantão Cedido)'
            : override?.ruleApplied || s.ruleApplied,
          notes: override?.notes !== undefined ? override.notes : s.notes,
          swapType,
          swapPartnerName,
          swapReason,
          isInformationalSwap
        };
      });

    const combined = [...parsedSessions, ...monthManual];
    const seen = new Set();
    const deduped = [];
    for (const sess of combined) {
      if (!seen.has(sess.id)) {
        seen.add(sess.id);
        deduped.push(sess);
      }
    }

    // Ordena por data e hora crescente
    deduped.sort(
      (a, b) =>
        new Date(`${a.dateStr}T${a.timeStr}`).getTime() -
        new Date(`${b.dateStr}T${b.timeStr}`).getTime()
    );

    setSettlementSessions(deduped);
  }, [
    selectedYear,
    selectedMonth,
    activeProfessional,
    appointments,
    patients,
    resolvePrice,
    includeScheduled,
    manualSessions,
    sessionOverrides,
    deletedSessionIds
  ]);

  // Agrupamento separado por Paciente (ordenado alfabeticamente para facilitar conferência na escala)
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
          billedSessionsCount: 0,
          swapsCount: 0,
          cededCount: 0,
          totalDurationMinutes: 0,
          totalAmount: 0
        };
      }

      const grp = groups[sess.patientId];
      grp.sessions.push(sess);

      if (sess.swapType && sess.swapType !== 'NONE') {
        grp.swapsCount += 1;
      }

      if (sess.isInformationalSwap || sess.swapType === 'CEDED') {
        grp.cededCount += 1;
      } else {
        grp.billedSessionsCount += 1;
        grp.totalDurationMinutes += Number(sess.durationMinutes || 0);
        grp.totalAmount += Number(sess.totalAmount || 0);
      }
    });

    return Object.values(groups).sort((a, b) =>
      String(a.patientName || '').localeCompare(String(b.patientName || ''), 'pt-BR')
    );
  }, [settlementSessions, patients]);

  // Sincroniza o paciente selecionado com os pacientes com atendimentos no mês
  useEffect(() => {
    if (groupedByPatient.length > 0) {
      if (selectedPatientId === 'all') return;
      const exists = groupedByPatient.some((g) => g.patientId === selectedPatientId);
      if (!exists) {
        setSelectedPatientId('all');
      }
    } else {
      setSelectedPatientId('all');
    }
  }, [groupedByPatient, selectedPatientId]);

  // Totais Gerais do Mês do Profissional (contabilizando apenas sessões efetivamente realizadas/faturadas)
  const monthTotals = useMemo(() => {
    const billedSessions = settlementSessions.filter((s) => !s.isInformationalSwap && s.swapType !== 'CEDED');
    const swappedSessions = settlementSessions.filter((s) => s.swapType && s.swapType !== 'NONE');
    const totalSessions = billedSessions.length;
    const totalMinutes = billedSessions.reduce((acc, s) => acc + Number(s.durationMinutes || 0), 0);
    const totalAmount = billedSessions.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
    const billedPatientsCount = groupedByPatient.filter((g) => g.billedSessionsCount > 0).length;
    const totalPatients = billedPatientsCount > 0 ? billedPatientsCount : groupedByPatient.length;

    return {
      totalSessions,
      totalSwaps: swappedSessions.length,
      totalHours: (totalMinutes / 60).toFixed(1),
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPatients
    };
  }, [settlementSessions, groupedByPatient]);

  // Modais de Edição e Inclusão de Atendimentos / Trocas
  const [editingSession, setEditingSession] = useState(null);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionPatientId, setNewSessionPatientId] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('2026-10-05');
  const [newSessionTime, setNewSessionTime] = useState('09:00');
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [newSessionHourlyRate, setNewSessionHourlyRate] = useState(150.0);
  const [newSessionTotal, setNewSessionTotal] = useState(150.0);
  const [newSessionAddress, setNewSessionAddress] = useState('');
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [newSessionSwapType, setNewSessionSwapType] = useState('NONE'); // 'NONE' | 'COVERED' | 'CEDED'
  const [newSessionSwapPartnerSelect, setNewSessionSwapPartnerSelect] = useState('');
  const [newSessionSwapPartnerCustom, setNewSessionSwapPartnerCustom] = useState('');
  const [newSessionSwapReason, setNewSessionSwapReason] = useState('');

  // Sugere tarifa inteligente baseada nas sessões anteriores do paciente ou regra da tabela
  const getSuggestedPatientPricing = useCallback(
    (patientId, dateStr, durationMins = 60) => {
      const safeDur = Number(durationMins) > 0 ? Number(durationMins) : 60;
      const existingBilled = settlementSessions.find(
        (s) => s.patientId === patientId && !s.isInformationalSwap && Number(s.hourlyRate) > 0
      );
      if (existingBilled) {
        const rate = Number(existingBilled.hourlyRate);
        const dur = Number(existingBilled.durationMinutes) > 0 ? Number(existingBilled.durationMinutes) : safeDur;
        return {
          durationMinutes: dur,
          hourlyRate: rate,
          totalAmount: Math.round(((rate * dur) / 60) * 100) / 100
        };
      }
      const resolved = resolvePrice(patientId, '', new Date(`${dateStr}T12:00:00`), safeDur);
      return {
        durationMinutes: safeDur,
        hourlyRate: resolved.hourlyRate,
        totalAmount: resolved.totalAmount
      };
    },
    [settlementSessions, resolvePrice]
  );

  // Abre modal de Inclusão de Atendimento ou Registro de Troca
  const openAddSessionModal = useCallback(
    ({ patientId = '', initialSwapType = 'NONE' } = {}) => {
      const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-05`;
      const targetPatId = patientId || (selectedPatientId !== 'all' ? selectedPatientId : '');
      const pat = (patients || []).find((p) => p.id === targetPatId);

      setNewSessionPatientId(targetPatId);
      setNewSessionDate(defaultDate);
      setNewSessionTime('08:00');
      setNewSessionAddress(pat?.address || '');
      setNewSessionNotes('');
      setNewSessionSwapType(initialSwapType);
      setNewSessionSwapPartnerSelect('');
      setNewSessionSwapPartnerCustom('');
      setNewSessionSwapReason('');

      if (targetPatId && initialSwapType !== 'CEDED') {
        const suggested = getSuggestedPatientPricing(targetPatId, defaultDate, 60);
        setNewSessionDuration(suggested.durationMinutes);
        setNewSessionHourlyRate(suggested.hourlyRate);
        setNewSessionTotal(suggested.totalAmount);
      } else if (initialSwapType === 'CEDED') {
        setNewSessionDuration(60);
        setNewSessionHourlyRate(0);
        setNewSessionTotal(0);
      } else {
        setNewSessionDuration(60);
        setNewSessionHourlyRate(150.0);
        setNewSessionTotal(150.0);
      }

      setErrorMsg('');
      setIsAddSessionModalOpen(true);
    },
    [selectedYear, selectedMonth, selectedPatientId, patients, getSuggestedPatientPricing]
  );

  // Abre modal de Edição / Registro de Troca em sessão existente
  const openEditSessionModal = useCallback(
    (sess, defaultSwapFocus = false) => {
      const existingPartner = sess.swapPartnerName || '';
      const matchedColleague = colleagueOptions.find((c) => c.name === existingPartner);
      const partnerSelect = existingPartner
        ? matchedColleague
          ? matchedColleague.name
          : '__custom__'
        : '';
      const partnerCustom = existingPartner && !matchedColleague ? existingPartner : '';

      const initialSwapType =
        defaultSwapFocus && (!sess.swapType || sess.swapType === 'NONE')
          ? 'COVERED'
          : sess.swapType || 'NONE';

      const fallbackPricing = getSuggestedPatientPricing(
        sess.patientId,
        sess.dateStr,
        sess.durationMinutes || 60
      );

      setErrorMsg('');
      setEditingSession({
        ...sess,
        swapType: initialSwapType,
        swapPartnerSelect: partnerSelect,
        swapPartnerCustom: partnerCustom,
        swapReason: sess.swapReason || '',
        _backupHourlyRate: Number(sess.hourlyRate) > 0 ? sess.hourlyRate : fallbackPricing.hourlyRate,
        _backupTotalAmount: Number(sess.totalAmount) > 0 ? sess.totalAmount : fallbackPricing.totalAmount,
        _focusSwap: defaultSwapFocus
      });
    },
    [colleagueOptions, getSuggestedPatientPricing]
  );

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

    const rateVal = parseNumericInput(ruleHourlyRate, 150.0);
    const newRule = {
      id: `rule-${Date.now()}`,
      patientId: rulePatientId,
      patientName: pat.name,
      locationType: ruleLocationType,
      locationName: ruleLocationName || (ruleLocationType === 'HOME' ? 'Domicílio' : 'Clínica / Outro'),
      dayType: ruleDayType,
      hourlyRate: rateVal,
      fixedPrice: rateVal,
      notes: ruleNotes.trim()
    };

    const profId = activeProfessional?.id;
    setPricingRules((prev) => {
      const updated = [newRule, ...prev];
      if (profId) {
        persistCloudAndLocal(`omnihome_pricing_${profId}`, `pricing_rules_${profId}`, updated);
      }
      return updated;
    });
    setIsNewPriceModalOpen(false);
    setSuccessMsg('Regra de preço registrada na sua tabela com sucesso!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Excluir Regra de Preço
  const handleDeletePriceRule = (ruleId) => {
    const profId = activeProfessional?.id;
    setPricingRules((prev) => {
      const updated = prev.filter((r) => r.id !== ruleId);
      if (profId) {
        persistCloudAndLocal(`omnihome_pricing_${profId}`, `pricing_rules_${profId}`, updated);
      }
      return updated;
    });
    setSuccessMsg('Regra de preço removida.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Salvar Edição de Sessão ("Corrigir" / "Informar Troca") com persistência local + nuvem PostgreSQL
  const handleSaveEditSession = async (e) => {
    e.preventDefault();
    if (!editingSession) return;

    const sessionToSave = { ...editingSession };
    const profId = activeProfessional?.id;

    const swapType = sessionToSave.swapType || 'NONE';
    const resolvedPartner =
      swapType === 'NONE'
        ? ''
        : sessionToSave.swapPartnerSelect === '__custom__'
        ? (sessionToSave.swapPartnerCustom || '').trim()
        : (sessionToSave.swapPartnerSelect || sessionToSave.swapPartnerName || '').trim();

    if (swapType !== 'NONE' && !resolvedPartner) {
      setErrorMsg('Informe com qual profissional foi feita a troca de escala.');
      return;
    }

    const cleanSwapReason = swapType === 'NONE' ? '' : (sessionToSave.swapReason || '').trim();
    const isInformationalSwap = swapType === 'CEDED';

    const cleanDuration = Math.max(1, Math.round(parseNumericInput(sessionToSave.durationMinutes, 60)));
    const cleanTotal = isInformationalSwap ? 0 : Math.max(0, parseNumericInput(sessionToSave.totalAmount, 0));
    const computedRateFromTotal =
      cleanDuration > 0 ? Math.round(((cleanTotal * 60) / cleanDuration) * 100) / 100 : 0;
    const cleanRate = isInformationalSwap
      ? 0
      : sessionToSave.hourlyRate !== '' &&
        sessionToSave.hourlyRate !== null &&
        sessionToSave.hourlyRate !== undefined
      ? Math.max(0, parseNumericInput(sessionToSave.hourlyRate, computedRateFromTotal))
      : computedRateFromTotal;

    const cleanNotes = (sessionToSave.notes || '').trim();
    const cleanDateStr = sessionToSave.dateStr;
    const cleanTimeStr = sessionToSave.timeStr;
    const cleanAddress = (sessionToSave.patientAddress || '').trim() || 'Vitória - ES';

    // Verifica se o valor difere da regra automática para rotular claramente a correção manual
    const autoPricing = resolvePrice(
      sessionToSave.patientId,
      cleanAddress,
      new Date(`${cleanDateStr}T${cleanTimeStr}:00`),
      cleanDuration
    );
    const priceDiffersFromAuto =
      !isInformationalSwap &&
      (Math.abs(cleanTotal - autoPricing.totalAmount) >= 0.01 ||
        Math.abs(cleanRate - autoPricing.hourlyRate) >= 0.01);

    const nextRuleApplied = isInformationalSwap
      ? 'Troca de Escala (Plantão Cedido)'
      : sessionToSave.ruleApplied && String(sessionToSave.ruleApplied).startsWith('Inclusão Manual')
      ? sessionToSave.ruleApplied
      : priceDiffersFromAuto || sessionToSave.isManualValueOverride
      ? 'Valor Corrigido Manualmente'
      : sessionToSave.ruleApplied === 'Troca de Escala (Plantão Cedido)'
      ? autoPricing.ruleApplied
      : sessionToSave.ruleApplied || autoPricing.ruleApplied;

    const updatedSession = {
      ...sessionToSave,
      dateStr: cleanDateStr,
      timeStr: cleanTimeStr,
      patientAddress: cleanAddress,
      durationMinutes: cleanDuration,
      hourlyRate: cleanRate,
      totalAmount: cleanTotal,
      notes: cleanNotes,
      swapType,
      swapPartnerName: resolvedPartner,
      swapReason: cleanSwapReason,
      isInformationalSwap,
      ruleApplied: nextRuleApplied
    };
    delete updatedSession.isManualValueOverride;
    delete updatedSession.swapPartnerSelect;
    delete updatedSession.swapPartnerCustom;
    delete updatedSession._backupHourlyRate;
    delete updatedSession._backupTotalAmount;
    delete updatedSession._focusSwap;

    const overrideEntry = {
      id: sessionToSave.id,
      patientId: sessionToSave.patientId,
      dateStr: cleanDateStr,
      timeStr: cleanTimeStr,
      patientAddress: cleanAddress,
      durationMinutes: cleanDuration,
      hourlyRate: cleanRate,
      totalAmount: cleanTotal,
      notes: cleanNotes,
      swapType,
      swapPartnerName: resolvedPartner,
      swapReason: cleanSwapReason,
      isInformationalSwap,
      ruleApplied: nextRuleApplied,
      updatedAt: Date.now()
    };

    // 1. Atualização imediata na UI da tabela
    setSettlementSessions((prev) => {
      const next = prev.map((s) => (s.id === sessionToSave.id ? updatedSession : s));
      next.sort(
        (a, b) =>
          new Date(`${a.dateStr}T${a.timeStr}`).getTime() -
          new Date(`${b.dateStr}T${b.timeStr}`).getTime()
      );
      return next;
    });

    // 2. Persiste override no localStorage e na nuvem (sobrevive a reloads e ao sync de 25s)
    setSessionOverrides((prev) => {
      const nextOverrides = { ...(prev || {}), [sessionToSave.id]: overrideEntry };
      if (profId) {
        persistCloudAndLocal(
          `omnihome_settlement_overrides_${profId}`,
          `settlement_overrides_${profId}`,
          nextOverrides
        );
      }
      return nextOverrides;
    });

    // 3. Se for sessão manual, atualiza também a lista de sessões manuais persistida
    setManualSessions((prev) => {
      if (!Array.isArray(prev) || !prev.some((m) => m.id === sessionToSave.id)) return prev;
      const nextManual = prev.map((m) => (m.id === sessionToSave.id ? { ...m, ...updatedSession } : m));
      if (profId) {
        persistCloudAndLocal(
          `omnihome_settlement_manual_${profId}`,
          `settlement_manual_${profId}`,
          nextManual
        );
      }
      return nextManual;
    });

    const swapSummaryForAgenda = formatSwapBadgeText(updatedSession);
    const combinedAgendaNotes = [swapSummaryForAgenda, cleanNotes].filter(Boolean).join(' • ');

    // 4. Notifica estado global da agenda no App.jsx (se disponível)
    if (onUpdateAppointment) {
      onUpdateAppointment(sessionToSave.id, {
        date: cleanDateStr,
        time: cleanTimeStr,
        durationMinutes: cleanDuration,
        address: cleanAddress,
        notes: combinedAgendaNotes
      });
    }

    setEditingSession(null);
    setErrorMsg('');
    setSuccessMsg(
      swapType !== 'NONE'
        ? 'Troca de escala e atendimento salvos na nuvem com sucesso!'
        : 'Atendimento e valores atualizados e salvos na nuvem!'
    );
    setTimeout(() => setSuccessMsg(''), 3500);

    // 5. Sincroniza metadados do agendamento no PostgreSQL (horário, duração e observações)
    if (!String(sessionToSave.id).startsWith('manual-sess-') && !String(sessionToSave.id).startsWith('swap-ceded-')) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('omnihome_jwt') : null;
        const res = await fetch(`${API_BASE_URL}/api/scheduler/appointments/${sessionToSave.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            status: sessionToSave.status || 'COMPLETED',
            notes: combinedAgendaNotes,
            professionalId: profId,
            patientId: sessionToSave.patientId,
            scheduledTime: `${cleanDateStr}T${cleanTimeStr}:00.000Z`,
            durationMinutes: cleanDuration,
            updateDetails: true
          })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const newDbId = data.appointment?.id;
          if (newDbId && newDbId !== sessionToSave.id) {
            setSessionOverrides((prev) => {
              const nextOverrides = {
                ...(prev || {}),
                [newDbId]: { ...overrideEntry, id: newDbId }
              };
              if (profId) {
                persistCloudAndLocal(
                  `omnihome_settlement_overrides_${profId}`,
                  `settlement_overrides_${profId}`,
                  nextOverrides
                );
              }
              return nextOverrides;
            });
            setSettlementSessions((prev) =>
              prev.map((s) => (s.id === sessionToSave.id ? { ...s, id: newDbId } : s))
            );
          }
        }
      } catch (err) {
        console.warn('Sincronização de edição do agendamento em contingência:', err);
      }
    }
  };

  // Excluir Sessão do Fechamento
  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Tem certeza que deseja excluir este registro do fechamento mensal?')) {
      const profId = activeProfessional?.id;
      const updatedManual = manualSessions.filter((s) => s.id !== sessionId);
      setManualSessions(updatedManual);
      setSettlementSessions((prev) => prev.filter((s) => s.id !== sessionId));

      setDeletedSessionIds((prev) => {
        const updatedDeleted = Array.from(new Set([...(prev || []), sessionId]));
        if (profId) {
          persistCloudAndLocal(
            `omnihome_settlement_deleted_${profId}`,
            `settlement_deleted_${profId}`,
            updatedDeleted
          );
        }
        return updatedDeleted;
      });

      setSessionOverrides((prev) => {
        if (!prev || !(sessionId in prev)) return prev;
        const nextOverrides = { ...prev };
        delete nextOverrides[sessionId];
        if (profId) {
          persistCloudAndLocal(
            `omnihome_settlement_overrides_${profId}`,
            `settlement_overrides_${profId}`,
            nextOverrides
          );
        }
        return nextOverrides;
      });

      // Sincroniza exclusão na nuvem PostgreSQL (Cross-Device)
      if (profId) {
        persistCloudAndLocal(
          `omnihome_settlement_manual_${profId}`,
          `settlement_manual_${profId}`,
          updatedManual
        );
      }

      if (!String(sessionId).startsWith('swap-ceded-')) {
        fetch(`${API_BASE_URL}/api/scheduler/appointments/${sessionId}`, {
          method: 'DELETE'
        }).catch(() => null);
      }

      setSuccessMsg('Registro excluído do fechamento.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Incluir Novo Atendimento ou Registro de Troca no Fechamento
  const handleAddSession = async (e) => {
    e.preventDefault();
    const pat = (patients || []).find((p) => p.id === newSessionPatientId);
    if (!pat) {
      setErrorMsg('Selecione o paciente.');
      return;
    }

    const swapType = newSessionSwapType || 'NONE';
    const resolvedPartner =
      swapType === 'NONE'
        ? ''
        : newSessionSwapPartnerSelect === '__custom__'
        ? newSessionSwapPartnerCustom.trim()
        : newSessionSwapPartnerSelect.trim();

    if (swapType !== 'NONE' && !resolvedPartner) {
      setErrorMsg('Selecione ou digite o nome do profissional envolvido na troca de escala.');
      return;
    }

    const cleanSwapReason = swapType === 'NONE' ? '' : newSessionSwapReason.trim();
    const isInformationalSwap = swapType === 'CEDED';

    const profId = activeProfessional?.id;
    const dateObj = new Date(`${newSessionDate}T${newSessionTime}:00`);
    const dayCategory = classifyDate(dateObj);
    const dayLabel = dayCategory === 'WEEKEND' ? 'Fim de Semana' : dayCategory === 'HOLIDAY' ? 'Feriado' : 'Dia Útil';

    const cleanDuration = Math.max(1, Math.round(parseNumericInput(newSessionDuration, 60)));
    const cleanTotal = isInformationalSwap ? 0 : Math.max(0, parseNumericInput(newSessionTotal, 150));
    const cleanRate = isInformationalSwap
      ? 0
      : Math.max(
          0,
          parseNumericInput(newSessionHourlyRate, Math.round(((cleanTotal * 60) / cleanDuration) * 100) / 100)
        );
    const cleanNotes = newSessionNotes.trim();
    const cleanAddress = newSessionAddress.trim() || pat.address || 'Vitória - ES';
    const manualRuleLabel = isInformationalSwap
      ? 'Troca de Escala (Plantão Cedido)'
      : `Inclusão Manual (${dayLabel})`;

    const tempId = isInformationalSwap ? `swap-ceded-${Date.now()}` : `manual-sess-${Date.now()}`;
    const newSess = {
      id: tempId,
      patientId: newSessionPatientId,
      patientName: pat.name,
      patientAddress: cleanAddress,
      locationType: 'HOME',
      dateStr: newSessionDate,
      timeStr: newSessionTime,
      durationMinutes: cleanDuration,
      hourlyRate: cleanRate,
      totalAmount: cleanTotal,
      ruleApplied: manualRuleLabel,
      notes: cleanNotes,
      swapType,
      swapPartnerName: resolvedPartner,
      swapReason: cleanSwapReason,
      isInformationalSwap,
      status: isInformationalSwap ? 'SWAP_CEDED' : 'COMPLETED'
    };

    const initialOverride = {
      id: tempId,
      patientId: newSessionPatientId,
      dateStr: newSessionDate,
      timeStr: newSessionTime,
      patientAddress: cleanAddress,
      durationMinutes: cleanDuration,
      hourlyRate: cleanRate,
      totalAmount: cleanTotal,
      notes: cleanNotes,
      swapType,
      swapPartnerName: resolvedPartner,
      swapReason: cleanSwapReason,
      isInformationalSwap,
      ruleApplied: manualRuleLabel,
      updatedAt: Date.now()
    };

    // 1. Atualização otimista imediata na UI + persistência local e nuvem
    const updatedManual = [...manualSessions, newSess];
    setManualSessions(updatedManual);
    if (profId) {
      persistCloudAndLocal(
        `omnihome_settlement_manual_${profId}`,
        `settlement_manual_${profId}`,
        updatedManual
      );
    }

    setSessionOverrides((prev) => {
      const nextOverrides = { ...(prev || {}), [tempId]: initialOverride };
      if (profId) {
        persistCloudAndLocal(
          `omnihome_settlement_overrides_${profId}`,
          `settlement_overrides_${profId}`,
          nextOverrides
        );
      }
      return nextOverrides;
    });

    setSettlementSessions((prev) => {
      const next = [...prev, newSess];
      next.sort(
        (a, b) =>
          new Date(`${a.dateStr}T${a.timeStr}`).getTime() -
          new Date(`${b.dateStr}T${b.timeStr}`).getTime()
      );
      return next;
    });

    // 2. Se for atendimento efetivamente realizado pela profissional (não cedido), grava também em appointments
    if (!isInformationalSwap) {
      const swapSummaryForAgenda = formatSwapBadgeText(newSess);
      const combinedAgendaNotes = [swapSummaryForAgenda, cleanNotes].filter(Boolean).join(' • ');
      try {
        const res = await fetch(`${API_BASE_URL}/api/scheduler/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            professionalId: profId,
            patientId: newSessionPatientId,
            scheduledTime: `${newSessionDate}T${newSessionTime}:00.000Z`,
            durationMinutes: cleanDuration,
            notes: combinedAgendaNotes || undefined,
            status: 'COMPLETED'
          })
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.appointment?.id) {
            const finalId = data.appointment.id;
            setManualSessions((prev) => {
              const syncedManual = prev.map((s) => (s.id === tempId ? { ...s, id: finalId } : s));
              if (profId) {
                persistCloudAndLocal(
                  `omnihome_settlement_manual_${profId}`,
                  `settlement_manual_${profId}`,
                  syncedManual
                );
              }
              return syncedManual;
            });
            setSessionOverrides((prev) => {
              const nextOverrides = { ...(prev || {}) };
              delete nextOverrides[tempId];
              nextOverrides[finalId] = { ...initialOverride, id: finalId, updatedAt: Date.now() };
              if (profId) {
                persistCloudAndLocal(
                  `omnihome_settlement_overrides_${profId}`,
                  `settlement_overrides_${profId}`,
                  nextOverrides
                );
              }
              return nextOverrides;
            });
            setSettlementSessions((prev) =>
              prev.map((s) => (s.id === tempId ? { ...s, id: finalId } : s))
            );
          }
        }
      } catch (err) {
        console.warn('Erro ao gravar atendimento no banco:', err);
      }
    }

    setNewSessionNotes('');
    setNewSessionSwapType('NONE');
    setNewSessionSwapPartnerSelect('');
    setNewSessionSwapPartnerCustom('');
    setNewSessionSwapReason('');
    setErrorMsg('');
    setIsAddSessionModalOpen(false);
    setSuccessMsg(
      isInformationalSwap
        ? 'Troca de escala (plantão cedido) registrada para conferência!'
        : swapType === 'COVERED'
        ? 'Atendimento com troca de escala incluído e sincronizado na nuvem!'
        : 'Novo atendimento incluído e sincronizado na nuvem com sucesso!'
    );
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Exportar Relatório em PDF Individual para o Paciente / Responsável Financeiro
  const handleExportPDF = (patientGroup) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no navegador para gerar o demonstrativo em PDF.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];
    const totalHours = (patientGroup.totalDurationMinutes / 60).toFixed(1);
    const billedOnly = patientGroup.sessions.filter((s) => !s.isInformationalSwap && s.swapType !== 'CEDED');
    const sessionsToPrint = billedOnly.length > 0 ? billedOnly : patientGroup.sessions;

    const rowsHtml = sessionsToPrint
      .map((s, idx) => {
        const swapLabel = formatSwapBadgeText(s);
        const obsParts = [swapLabel, s.notes ? `Obs: ${s.notes}` : ''].filter(Boolean).join(' • ');
        return `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; white-space: nowrap;">
            ${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')} às ${escapeHtml(s.timeStr)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
            ${escapeHtml(s.patientAddress)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: center;">
            ${s.durationMinutes} min
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: right;">
            R$ ${formatCurrencyBR(s.hourlyRate)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: right; font-weight: bold; color: #0284c7;">
            R$ ${formatCurrencyBR(s.totalAmount)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #475569;">
            ${obsParts ? escapeHtml(obsParts) : escapeHtml(s.ruleApplied || 'Sessão realizada')}
          </td>
        </tr>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Demonstrativo de Atendimentos — ${escapeHtml(patientGroup.patientName)} (${monthName}/${selectedYear})</title>
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
          th { background: #f1f5f9; padding: 10px 10px; font-size: 11.5px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .totals-box { display: flex; justify-content: flex-end; margin-top: 15px; }
          .totals-table { width: 340px; border-collapse: collapse; }
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
            <h2>${escapeHtml(activeProfessional.name)}</h2>
            <p>${escapeHtml(activeProfessional.crm || 'CREFITO Ativo')} • ${escapeHtml(activeProfessional.specialty || 'Fisioterapia Domiciliar')}</p>
            <p>Atendimento Fisioterapêutico Especializado em Saúde Domiciliar</p>
          </div>
          <div class="statement-title">
            <h1>DEMONSTRATIVO DE SERVIÇOS</h1>
            <span>Competência: ${monthName} / ${selectedYear}</span>
          </div>
        </div>

        <div class="patient-box">
          <div>
            <p><strong>Paciente:</strong> ${escapeHtml(patientGroup.patientName)}</p>
            <p><strong>Endereço Atendido:</strong> ${escapeHtml(patientGroup.patientAddress)}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Responsável:</strong> ${escapeHtml(patientGroup.responsibleName)}</p>
            <p><strong>Contato:</strong> ${escapeHtml(patientGroup.phone)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 36px; text-align: center;">#</th>
              <th>Data & Horário</th>
              <th>Local do Atendimento</th>
              <th style="text-align: center;">Duração</th>
              <th style="text-align: right;">Valor Hora</th>
              <th style="text-align: right;">Valor da Sessão</th>
              <th>Observações / Escala</th>
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
              <td style="text-align: right; font-weight: bold;">${patientGroup.billedSessionsCount}</td>
            </tr>
            <tr>
              <td>Carga Horária Total:</td>
              <td style="text-align: right; font-weight: bold;">${totalHours} horas</td>
            </tr>
            <tr class="grand-total">
              <td>Total Geral:</td>
              <td style="text-align: right;">R$ ${formatCurrencyBR(patientGroup.totalAmount)}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 40px; padding: 15px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
          <strong style="color: #166534; display: block; margin-bottom: 4px;">Informações para Pagamento:</strong>
          <span style="font-size: 13px; color: #15803d;">Chave PIX do Profissional: <strong>${escapeHtml(activeProfessional.email || 'contato@omnihomecare.com')}</strong> (${escapeHtml(activeProfessional.name)})</span>
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

  // Exportar Planilha Excel (.xlsx/.xls) Individual para o Paciente
  const handleExportXLSX = (patientGroup) => {
    if (!patientGroup || !patientGroup.sessions || patientGroup.sessions.length === 0) {
      alert('Não há atendimentos registrados para exportar.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];
    const totalHours = (patientGroup.totalDurationMinutes / 60).toFixed(1);
    let billedCounter = 0;

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
          .ceded td { background-color: #fffbeb; color: #92400e; }
          .subtotal-row td { background-color: #f1f5f9; font-weight: bold; }
          .grand-total td { background-color: #e0f2fe; font-weight: bold; font-size: 11.5pt; color: #0369a1; }
        </style>
      </head>
      <body>
        <div class="header-title">DEMONSTRATIVO DE ATENDIMENTOS FISIOTERAPÊUTICOS</div>
        <div class="meta-row"><strong>Profissional:</strong> ${escapeHtml(activeProfessional.name)} (${escapeHtml(activeProfessional.crm || 'CREFITO Ativo')}) - ${escapeHtml(activeProfessional.specialty || 'Fisioterapia Domiciliar')}</div>
        <div class="meta-row"><strong>Paciente:</strong> ${escapeHtml(patientGroup.patientName)}</div>
        <div class="meta-row"><strong>Endereço Atendido:</strong> ${escapeHtml(patientGroup.patientAddress)}</div>
        <div class="meta-row"><strong>Responsável Financeiro:</strong> ${escapeHtml(patientGroup.responsibleName)} (Contato: ${escapeHtml(patientGroup.phone)})</div>
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
              <th>Troca de Escala / Regra / Observações</th>
            </tr>
          </thead>
          <tbody>
            ${patientGroup.sessions
              .map((s) => {
                const isCeded = Boolean(s.isInformationalSwap || s.swapType === 'CEDED');
                if (!isCeded) billedCounter += 1;
                const swapLabel = formatSwapBadgeText(s);
                const fullObs = [swapLabel, s.notes ? `[Obs: ${s.notes}]` : '', s.ruleApplied]
                  .filter(Boolean)
                  .join(' • ');
                return `
              <tr class="${isCeded ? 'ceded' : ''}">
                <td class="center">${isCeded ? '↪' : billedCounter}</td>
                <td class="center">${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="center">${escapeHtml(s.timeStr)}</td>
                <td>${escapeHtml(s.patientAddress)}</td>
                <td class="center">${isCeded ? '—' : s.durationMinutes}</td>
                <td class="right">${isCeded ? '—' : `R$ ${formatCurrencyBR(s.hourlyRate)}`}</td>
                <td class="right"><strong>${isCeded ? 'R$ 0,00 (Troca)' : `R$ ${formatCurrencyBR(s.totalAmount)}`}</strong></td>
                <td>${escapeHtml(fullObs)}</td>
              </tr>
            `;
              })
              .join('')}
            <tr class="subtotal-row">
              <td colspan="4" class="right">Total de Sessões Realizadas:</td>
              <td class="center">${patientGroup.billedSessionsCount}</td>
              <td class="right">Carga Horária Total:</td>
              <td colspan="2" class="left">${totalHours} horas</td>
            </tr>
            <tr class="grand-total">
              <td colspan="6" class="right" style="font-size: 12pt;">VALOR TOTAL A PAGAR:</td>
              <td colspan="2" class="right" style="font-size: 12pt;">R$ ${formatCurrencyBR(patientGroup.totalAmount)}</td>
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

  // Exportar Relatório Consolidado em PDF de TODOS os Pacientes do Mês — SEPARADO POR PACIENTE + TROCAS (Para a Gestora / Sabrina)
  const handleExportConsolidatedPDF = () => {
    if (!settlementSessions || settlementSessions.length === 0) {
      alert('Não há atendimentos registrados para exportar.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups no navegador para gerar o demonstrativo em PDF.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];

    // 1. Tabela sintética por paciente no topo
    const summaryRowsHtml = groupedByPatient
      .map((g, idx) => {
        const swapSummaryPill =
          g.swapsCount > 0
            ? `<span style="display:inline-block; padding:2px 7px; border-radius:999px; background:#fef3c7; color:#92400e; font-size:11px; font-weight:700;">${g.swapsCount} ${g.swapsCount === 1 ? 'troca' : 'trocas'}</span>`
            : `<span style="color:#94a3b8; font-size:11px;">Sem trocas</span>`;
        return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700;">${escapeHtml(g.patientName)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">${escapeHtml(g.patientAddress)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: center; font-weight: 700;">${g.billedSessionsCount}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; text-align: center;">${(g.totalDurationMinutes / 60).toFixed(1)}h</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center;">${swapSummaryPill}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-weight: 800; color: #0284c7;">
          R$ ${formatCurrencyBR(g.totalAmount)}
        </td>
      </tr>
    `;
      })
      .join('');

    // 2. Blocos separados por paciente (em ordem cronológica dentro de cada paciente!)
    const patientBlocksHtml = groupedByPatient
      .map((g, pIdx) => {
        let billedIdx = 0;
        const patientHours = (g.totalDurationMinutes / 60).toFixed(1);
        const rowsHtml = g.sessions
          .map((s) => {
            const isCeded = Boolean(s.isInformationalSwap || s.swapType === 'CEDED');
            if (!isCeded) billedIdx += 1;

            const swapText = formatSwapBadgeText(s);
            const swapHtml =
              s.swapType === 'COVERED'
                ? `<div style="display:inline-block; background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; padding:2px 6px; border-radius:4px; font-weight:700; font-size:11px; margin-bottom:2px;">${escapeHtml(swapText)}</div>`
                : isCeded
                ? `<div style="display:inline-block; background:#fef3c7; color:#92400e; border:1px solid #fde68a; padding:2px 6px; border-radius:4px; font-weight:700; font-size:11px; margin-bottom:2px;">${escapeHtml(swapText)}</div>`
                : '';

            const noteHtml = s.notes
              ? `<div style="color:#92400e; font-weight:600; font-size:11px;">Obs: ${escapeHtml(s.notes)}</div>`
              : '';

            const ruleHtml = !isCeded
              ? `<div style="color:#64748b; font-size:10.5px;">${escapeHtml(s.ruleApplied || 'Padrão')}</div>`
              : `<div style="color:#92400e; font-size:10.5px;">Informativo p/ conferência da escala (não faturado)</div>`;

            return `
            <tr style="${isCeded ? 'background-color: #fffbeb;' : ''}">
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center; font-weight: 600;">
                ${isCeded ? '↪' : billedIdx}
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; white-space: nowrap;">
                <strong>${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                <span style="color: #64748b; margin-left: 4px;">${escapeHtml(s.timeStr)}</span>
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #475569;">
                ${escapeHtml(s.patientAddress)}
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: center;">
                ${isCeded ? '—' : `${s.durationMinutes} min`}
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; white-space: nowrap;">
                ${isCeded ? '—' : `R$ ${formatCurrencyBR(s.hourlyRate)}`}
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; text-align: right; font-weight: 700; color: ${isCeded ? '#92400e' : '#0284c7'}; white-space: nowrap;">
                ${isCeded ? 'R$ 0,00 (Troca)' : `R$ ${formatCurrencyBR(s.totalAmount)}`}
              </td>
              <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                ${swapHtml}${noteHtml}${ruleHtml}
              </td>
            </tr>
          `;
          })
          .join('');

        return `
        <div class="patient-group-card">
          <div class="patient-group-header">
            <div>
              <span class="patient-badge-num">2.${pIdx + 1}</span>
              <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(g.patientName)}</strong>
              <span style="color: #64748b; font-size: 12px; margin-left: 8px;">• ${escapeHtml(g.patientAddress)}</span>
            </div>
            <div style="font-size: 12.5px; font-weight: 700; color: #0369a1;">
              ${g.billedSessionsCount} ${g.billedSessionsCount === 1 ? 'sessão' : 'sessões'} • ${patientHours}h • Subtotal: R$ ${formatCurrencyBR(g.totalAmount)}
            </div>
          </div>
          <table style="margin-bottom: 0;">
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th style="width: 125px;">Data & Horário</th>
                <th>Local Atendido</th>
                <th style="width: 72px; text-align: center;">Duração</th>
                <th style="width: 92px; text-align: right;">Valor Hora</th>
                <th style="width: 105px; text-align: right;">Total Sessão</th>
                <th>Troca de Escala ("Quem Fez") / Obs</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background: #f8fafc;">
                <td colspan="5" style="padding: 8px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #334155;">
                  Subtotal de ${escapeHtml(g.patientName)} (${g.billedSessionsCount} ${g.billedSessionsCount === 1 ? 'sessão faturada' : 'sessões faturadas'} • ${patientHours}h${g.cededCount > 0 ? ` • ${g.cededCount} plantão cedido` : ''}):
                </td>
                <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: 800; color: #0284c7; white-space: nowrap;">
                  R$ ${formatCurrencyBR(g.totalAmount)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      })
      .join('');

    // 3. Quadro-resumo dedicado de Trocas de Escala (exibido automaticamente se houver alguma troca no mês!)
    const allSwaps = settlementSessions.filter((s) => s.swapType && s.swapType !== 'NONE');
    const swapsSectionHtml =
      allSwaps.length > 0
        ? `
        <div class="section-title">3. Quadro Resumo de Trocas & Coberturas de Escala ("Quem Fez o Quê")</div>
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Data & Horário</th>
              <th>Paciente</th>
              <th>Tipo de Troca</th>
              <th>Profissional Envolvido</th>
              <th>Detalhe / Observação p/ Escala</th>
            </tr>
          </thead>
          <tbody>
            ${allSwaps
              .map((s) => {
                const isCeded = Boolean(s.isInformationalSwap || s.swapType === 'CEDED');
                return `
              <tr style="${isCeded ? 'background:#fffbeb;' : 'background:#f8fafc;'}">
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700;">
                  ${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')} ${escapeHtml(s.timeStr)}
                </td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700;">
                  ${escapeHtml(s.patientName)}
                </td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 700; color: ${isCeded ? '#92400e' : '#4338ca'};">
                  ${isCeded ? '↪ Plantão Cedido (Colega fez)' : `🔄 Assumiu / Cobriu (${escapeHtml(activeProfessional.name)} fez)`}
                </td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;">
                  ${escapeHtml(s.swapPartnerName || '—')}
                </td>
                <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; color: #475569;">
                  ${escapeHtml([s.swapReason, s.notes].filter(Boolean).join(' • ') || 'Conferência de escala')}
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      `
        : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Fechamento Geral Consolidado — ${escapeHtml(activeProfessional.name)} (${monthName}/${selectedYear})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 28px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
          .pro-info h2 { margin: 0 0 4px 0; color: #0284c7; font-size: 22px; }
          .pro-info p { margin: 2px 0; font-size: 12px; color: #64748b; }
          .statement-title { text-align: right; }
          .statement-title h1 { margin: 0 0 4px 0; font-size: 19px; color: #0f172a; }
          .statement-title span { font-size: 13px; font-weight: bold; color: #64748b; }
          
          .kpi-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; text-align: center; }
          .kpi-box .val { font-size: 18px; font-weight: 800; color: #0284c7; margin-top: 4px; }
          .kpi-box .lbl { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
          
          .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 22px 0 10px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          
          .patient-group-card { border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 18px; page-break-inside: avoid; }
          .patient-group-header { background: #f0f9ff; border-bottom: 2px solid #0284c7; padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
          .patient-badge-num { display: inline-block; background: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; padding: 2px 7px; border-radius: 999px; margin-right: 6px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 2px solid #cbd5e1; }
          
          .totals-box { display: flex; justify-content: flex-end; margin-top: 15px; }
          .totals-table { width: 380px; border-collapse: collapse; }
          .totals-table td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .totals-table tr.grand-total td { font-size: 16px; font-weight: 800; color: #0284c7; border-top: 2px solid #0284c7; border-bottom: none; }
          
          .pix-box { margin-top: 25px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; }
          .footer { margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
          
          @media print {
            body { margin: 14px; font-size: 11px; }
            .patient-group-card { break-inside: avoid; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="pro-info">
            <h2>${escapeHtml(activeProfessional.name)}</h2>
            <p>${escapeHtml(activeProfessional.crm || 'CREFITO Ativo')} • ${escapeHtml(activeProfessional.specialty || 'Fisioterapia Domiciliar')}</p>
            <p>Atendimento Fisioterapêutico Especializado em Saúde Domiciliar</p>
          </div>
          <div class="statement-title">
            <h1>DEMONSTRATIVO GERAL CONSOLIDADO</h1>
            <span>Competência: ${monthName} / ${selectedYear}</span>
          </div>
        </div>

        <div class="kpi-cards">
          <div class="kpi-box">
            <div class="lbl">Faturamento Geral</div>
            <div class="val">R$ ${formatCurrencyBR(monthTotals.totalAmount)}</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Total de Atendimentos</div>
            <div class="val">${monthTotals.totalSessions}</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Carga Horária</div>
            <div class="val">${monthTotals.totalHours}h</div>
          </div>
          <div class="kpi-box">
            <div class="lbl">Pacientes Atendidos</div>
            <div class="val">${monthTotals.totalPatients}</div>
          </div>
        </div>

        <div class="section-title">1. Resumo Sintético por Paciente</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Paciente</th>
              <th>Endereço Principal</th>
              <th style="text-align: center;">Sessões</th>
              <th style="text-align: center;">Horas</th>
              <th style="text-align: center;">Trocas</th>
              <th style="text-align: right;">Subtotal a Receber</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRowsHtml}
          </tbody>
        </table>

        <div class="section-title">2. Detalhamento Separado por Paciente (Ordem Cronológica por Paciente & Trocas)</div>
        ${patientBlocksHtml}

        ${swapsSectionHtml}

        <div class="totals-box">
          <table class="totals-table">
            <tr>
              <td>Total Geral de Sessões Faturadas:</td>
              <td style="text-align: right; font-weight: bold;">${monthTotals.totalSessions}</td>
            </tr>
            <tr>
              <td>Carga Horária Total Realizada:</td>
              <td style="text-align: right; font-weight: bold;">${monthTotals.totalHours} horas</td>
            </tr>
            <tr>
              <td>Pacientes Atendidos no Mês:</td>
              <td style="text-align: right; font-weight: bold;">${monthTotals.totalPatients}</td>
            </tr>
            ${
              monthTotals.totalSwaps > 0
                ? `<tr>
              <td>Registros de Troca / Cobertura de Escala:</td>
              <td style="text-align: right; font-weight: bold; color: #92400e;">${monthTotals.totalSwaps}</td>
            </tr>`
                : ''
            }
            <tr class="grand-total">
              <td>VALOR TOTAL A RECEBER:</td>
              <td style="text-align: right;">R$ ${formatCurrencyBR(monthTotals.totalAmount)}</td>
            </tr>
          </table>
        </div>

        <div class="pix-box">
          <strong style="color: #166534; display: block; margin-bottom: 3px;">Dados para Quitação de Honorários (Chave PIX):</strong>
          <span style="font-size: 13px; color: #15803d;">
            Chave: <strong>${escapeHtml(activeProfessional.email || 'contato@omnihomecare.com')}</strong> • Titular: <strong>${escapeHtml(activeProfessional.name)}</strong>
          </span>
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

  // Exportar Planilha Excel Geral Consolidada (.xlsx/.xls) — SEPARADA POR PACIENTE + TROCAS (Para a Gestora / Sabrina)
  const handleExportConsolidatedXLSX = () => {
    if (!settlementSessions || settlementSessions.length === 0) {
      alert('Não há atendimentos registrados para exportar.');
      return;
    }

    const monthName = MONTH_NAMES[selectedMonth - 1];
    const allSwaps = settlementSessions.filter((s) => s.swapType && s.swapType !== 'NONE');

    const groupedTablesExcelHtml = groupedByPatient
      .map((g, pIdx) => {
        let billedIdx = 0;
        const patientHours = (g.totalDurationMinutes / 60).toFixed(1);
        return `
        <table>
          <thead>
            <tr>
              <th colspan="8" style="background-color: #e0f2fe; color: #0f172a; font-size: 11.5pt; text-align: left; border: 1px solid #0284c7; padding: 8px 10px;">
                2.${pIdx + 1} PACIENTE: ${escapeHtml(g.patientName)} — ${escapeHtml(g.patientAddress)} (${g.billedSessionsCount} sessões • ${patientHours}h • Subtotal: R$ ${formatCurrencyBR(g.totalAmount)})
              </th>
            </tr>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 100px; text-align: center;">Data</th>
              <th style="width: 75px; text-align: center;">Horário</th>
              <th>Endereço Atendido</th>
              <th style="width: 100px; text-align: center;">Duração (min)</th>
              <th style="width: 120px; text-align: right;">Valor Hora (R$)</th>
              <th style="width: 130px; text-align: right;">Valor Sessão (R$)</th>
              <th>Troca de Escala ("Quem Fez") / Regra / Obs</th>
            </tr>
          </thead>
          <tbody>
            ${g.sessions
              .map((s) => {
                const isCeded = Boolean(s.isInformationalSwap || s.swapType === 'CEDED');
                if (!isCeded) billedIdx += 1;
                const swapText = formatSwapBadgeText(s);
                const fullObs = [swapText, s.notes ? `[Obs: ${s.notes}]` : '', s.ruleApplied]
                  .filter(Boolean)
                  .join(' • ');
                return `
              <tr class="${isCeded ? 'ceded-row' : ''}">
                <td class="center">${isCeded ? '↪' : billedIdx}</td>
                <td class="center">${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="center">${escapeHtml(s.timeStr)}</td>
                <td>${escapeHtml(s.patientAddress)}</td>
                <td class="center">${isCeded ? '—' : s.durationMinutes}</td>
                <td class="right">${isCeded ? '—' : `R$ ${formatCurrencyBR(s.hourlyRate)}`}</td>
                <td class="right"><strong>${isCeded ? 'R$ 0,00 (Troca)' : `R$ ${formatCurrencyBR(s.totalAmount)}`}</strong></td>
                <td>${escapeHtml(fullObs)}</td>
              </tr>
            `;
              })
              .join('')}
            <tr class="subtotal-row">
              <td colspan="6" class="right">Subtotal — ${escapeHtml(g.patientName)} (${g.billedSessionsCount} sessões • ${patientHours}h):</td>
              <td class="right">R$ ${formatCurrencyBR(g.totalAmount)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `;
      })
      .join('');

    const swapsExcelHtml =
      allSwaps.length > 0
        ? `
        <div class="section-title">3. QUADRO RESUMO DE TROCAS DE ESCALA ("QUEM FEZ O QUÊ")</div>
        <table>
          <thead>
            <tr>
              <th style="width: 100px; text-align: center;">Data</th>
              <th style="width: 75px; text-align: center;">Horário</th>
              <th>Paciente</th>
              <th>Tipo de Troca</th>
              <th>Profissional Envolvido</th>
              <th>Detalhes / Observação</th>
            </tr>
          </thead>
          <tbody>
            ${allSwaps
              .map((s) => {
                const isCeded = Boolean(s.isInformationalSwap || s.swapType === 'CEDED');
                return `
              <tr class="${isCeded ? 'ceded-row' : ''}">
                <td class="center">${new Date(s.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                <td class="center">${escapeHtml(s.timeStr)}</td>
                <td><strong>${escapeHtml(s.patientName)}</strong></td>
                <td>${isCeded ? 'Plantão Cedido (Colega atendeu)' : `Assumiu Troca (${escapeHtml(activeProfessional.name)} atendeu)`}</td>
                <td><strong>${escapeHtml(s.swapPartnerName || '—')}</strong></td>
                <td>${escapeHtml([s.swapReason, s.notes].filter(Boolean).join(' • ') || '—')}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      `
        : '';

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Consolidado por Paciente</x:Name>
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
          .section-title { font-size: 12pt; font-weight: bold; color: #0f172a; margin-top: 15px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 18px; }
          th { background-color: #0284c7; color: #ffffff; font-weight: bold; text-align: left; border: 1px solid #94a3b8; padding: 7px 10px; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10.5pt; }
          .center { text-align: center; }
          .right { text-align: right; }
          .ceded-row td { background-color: #fffbeb; color: #92400e; }
          .subtotal-row td { background-color: #f1f5f9; font-weight: bold; }
          .grand-total td { background-color: #e0f2fe; font-weight: bold; font-size: 12pt; color: #0369a1; }
        </style>
      </head>
      <body>
        <div class="header-title">DEMONSTRATIVO GERAL CONSOLIDADO DE ATENDIMENTOS (SEPARADO POR PACIENTE)</div>
        <div class="meta-row"><strong>Profissional:</strong> ${escapeHtml(activeProfessional.name)} (${escapeHtml(activeProfessional.crm || 'CREFITO Ativo')}) - ${escapeHtml(activeProfessional.specialty || 'Fisioterapia Domiciliar')}</div>
        <div class="meta-row"><strong>Competência:</strong> ${monthName} / ${selectedYear}</div>
        <div class="meta-row"><strong>Chave PIX:</strong> ${escapeHtml(activeProfessional.email || 'contato@omnihomecare.com')}</div>
        <br/>

        <div class="section-title">1. RESUMO SINTÉTICO POR PACIENTE</div>
        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">#</th>
              <th>Paciente</th>
              <th>Endereço Principal</th>
              <th>Responsável / Contato</th>
              <th style="width: 95px; text-align: center;">Sessões</th>
              <th style="width: 100px; text-align: center;">Horas (h)</th>
              <th style="width: 100px; text-align: center;">Trocas</th>
              <th style="width: 150px; text-align: right;">Subtotal (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${groupedByPatient
              .map(
                (g, idx) => `
              <tr>
                <td class="center">${idx + 1}</td>
                <td><strong>${escapeHtml(g.patientName)}</strong></td>
                <td>${escapeHtml(g.patientAddress)}</td>
                <td>${escapeHtml(g.responsibleName)} (${escapeHtml(g.phone)})</td>
                <td class="center">${g.billedSessionsCount}</td>
                <td class="center">${(g.totalDurationMinutes / 60).toFixed(1)}h</td>
                <td class="center">${g.swapsCount > 0 ? g.swapsCount : '—'}</td>
                <td class="right"><strong>R$ ${formatCurrencyBR(g.totalAmount)}</strong></td>
              </tr>
            `
              )
              .join('')}
            <tr class="grand-total">
              <td colspan="4" class="right">TOTAIS CONSOLIDADOS DO MÊS:</td>
              <td class="center">${monthTotals.totalSessions}</td>
              <td class="center">${monthTotals.totalHours}h</td>
              <td class="center">${monthTotals.totalSwaps > 0 ? monthTotals.totalSwaps : '—'}</td>
              <td class="right">R$ ${formatCurrencyBR(monthTotals.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. DETALHAMENTO DE ATENDIMENTOS E TROCAS SEPARADO POR PACIENTE</div>
        ${groupedTablesExcelHtml}

        ${swapsExcelHtml}

        <table>
          <tbody>
            <tr class="grand-total">
              <td colspan="6" class="right">VALOR TOTAL GERAL A RECEBER NO MÊS (${monthTotals.totalSessions} sessões • ${monthTotals.totalHours}h):</td>
              <td colspan="2" class="right">R$ ${formatCurrencyBR(monthTotals.totalAmount)}</td>
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
    const sanitizedDocName = (activeProfessional.name || 'Profissional').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ_-]/g, '_');
    link.download = `Fechamento_Consolidado_${sanitizedDocName}_${monthName}_${selectedYear}.xls`;
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
            style={{ fontWeight: 600 }}
            value={effectiveDoctorId}
            onChange={(e) => {
              setInternalDoctorId(e.target.value);
              if (setSelectedDoctorId) setSelectedDoctorId(e.target.value);
            }}
            title="Selecionar profissional para apuração de honorários"
          >
            {doctors
              .filter((d) => d.id !== 'all')
              .map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} • {doc.profession || 'Especialista'}
                </option>
              ))}
          </select>

          <button
            type="button"
            className={`btn ${includeScheduled ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', fontWeight: 600 }}
            onClick={() => setIncludeScheduled(!includeScheduled)}
            title="Alternar entre apurar apenas atendimentos já realizados (com check-in) ou exibir toda a escala mensal planejada"
          >
            {includeScheduled ? '✓ Prévia Escala Completa' : 'Apenas com Check-in'}
          </button>
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
            type="button"
            className="btn-export pdf-consolidated"
            onClick={handleExportConsolidatedPDF}
            title="Gerar e imprimir Demonstrativo Geral Consolidado em PDF de TODOS os pacientes atendidos no mês"
          >
            <Printer size={15} />
            Gerar PDF Geral
          </button>

          <button
            type="button"
            className="btn-export excel-consolidated"
            onClick={handleExportConsolidatedXLSX}
            title="Exportar planilha Excel (.xls) com o consolidado de todos os pacientes e ocorrências do mês"
          >
            <FileSpreadsheet size={15} />
            Exportar Excel Geral
          </button>

          <button
            type="button"
            className="btn-swap-register"
            onClick={() => openAddSessionModal({ initialSwapType: 'COVERED' })}
            title="Registrar troca ou cobertura de escala (quem fez o quê para conferência da escala)"
          >
            <RefreshCw size={15} />
            Registrar Troca
          </button>

          <button
            className="btn btn-primary"
            onClick={() => openAddSessionModal({ initialSwapType: 'NONE' })}
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
                R$ {formatCurrencyBR(monthTotals.totalAmount)}
              </div>
              <div className="kpi-subtitle">
                {monthTotals.totalSessions} sessões faturadas em {monthTotals.totalHours} horas atendidas
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
                {monthTotals.totalSwaps > 0 ? ` • ${monthTotals.totalSwaps} ${monthTotals.totalSwaps === 1 ? 'troca registrada' : 'trocas registradas'}` : ''}
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
                R$ {monthTotals.totalSessions > 0 ? formatCurrencyBR(monthTotals.totalAmount / monthTotals.totalSessions) : '0,00'}
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
                      Selecione um paciente para inspecionar seus atendimentos ou veja todos separados por paciente abaixo
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
                    <option value="all">
                      📋 Todos os Pacientes (Separado por Paciente) — {monthTotals.totalSessions} sessões (R$ {formatCurrencyBR(monthTotals.totalAmount)})
                    </option>
                    {groupedByPatient.map((g) => (
                      <option key={g.patientId} value={g.patientId}>
                        {g.patientName} — {g.billedSessionsCount} {g.billedSessionsCount === 1 ? 'sessão' : 'sessões'} (R$ {formatCurrencyBR(g.totalAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {groupedByPatient.length > 0 && (
                <div className="patient-quick-pills">
                  <button
                    type="button"
                    className={`patient-pill-btn ${selectedPatientId === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedPatientId('all')}
                    title="Exibir consolidado de todos os atendimentos do mês"
                  >
                    <Layers size={14} />
                    <span className="pill-name">Todos os Pacientes</span>
                    <span className="pill-count">{monthTotals.totalSessions}</span>
                  </button>

                  {groupedByPatient.map((g) => (
                    <button
                      key={g.patientId}
                      type="button"
                      className={`patient-pill-btn ${g.patientId === selectedPatientId ? 'active' : ''}`}
                      onClick={() => setSelectedPatientId(g.patientId)}
                      title={`Visualizar apenas atendimentos de ${g.patientName}`}
                    >
                      <span className="pill-name">{g.patientName}</span>
                      <span className="pill-count">{g.billedSessionsCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Card de Atendimentos: Visão Consolidada Geral (Todos) ou Individual */}
          {groupedByPatient.length === 0 ? (
            <div className="table-card">
              <div className="empty-state-box">
                <Calendar size={48} color="var(--text-muted)" />
                <h4>Nenhum atendimento com check-in realizado neste mês</h4>
                <p>
                  O fechamento mensal considera exclusivamente atendimentos em que o check-in foi efetuado.
                  Faça o check-in dos atendimentos na <strong>Agenda</strong>, clique em <strong>"Incluir Atendimento"</strong> ou em <strong>"Registrar Troca"</strong>.
                </p>
              </div>
            </div>
          ) : selectedPatientId === 'all' ? (
            /* --- VISÃO GERAL CONSOLIDADA (TODOS OS PACIENTES) --- */
            <div className="patient-financial-card">
              {/* Header Consolidado Geral */}
              <div className="patient-card-header">
                <div className="patient-info-block">
                  <div className="consolidated-badge-icon">
                    <Layers size={22} />
                  </div>
                  <div>
                    <h3>Demonstrativo Geral Consolidado (Separado por Paciente)</h3>
                    <p>
                      Competência: <strong>{MONTH_NAMES[selectedMonth - 1]}/{selectedYear}</strong> • {monthTotals.totalPatients} pacientes • {monthTotals.totalSessions} sessões ({monthTotals.totalHours}h)
                      {monthTotals.totalSwaps > 0 ? ` • ${monthTotals.totalSwaps} ${monthTotals.totalSwaps === 1 ? 'troca de escala' : 'trocas de escala'}` : ''}
                    </p>
                  </div>
                </div>

                {/* Ações Globais de Exportação */}
                <div className="patient-actions-block">
                  <button
                    type="button"
                    className="btn-export pdf-consolidated"
                    onClick={handleExportConsolidatedPDF}
                    title="Gerar PDF Geral Consolidado já separado por paciente e com trocas de escala"
                  >
                    <Printer size={15} />
                    Gerar PDF Geral
                  </button>

                  <button
                    type="button"
                    className="btn-export excel-consolidated"
                    onClick={handleExportConsolidatedXLSX}
                    title="Baixar planilha Excel (.xls) já separada por paciente e com trocas de escala"
                  >
                    <FileSpreadsheet size={15} />
                    Exportar Excel Geral
                  </button>
                </div>
              </div>

              {/* Resumo por Paciente em Cards Rápidos */}
              <div className="consolidated-patients-summary">
                {groupedByPatient.map((g) => (
                  <div
                    key={g.patientId}
                    className="consolidated-patient-pill-card"
                    onClick={() => setSelectedPatientId(g.patientId)}
                    title={`Clique para inspecionar individualmente os atendimentos de ${g.patientName}`}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-headline)' }}>
                        {g.patientName}
                      </strong>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {g.billedSessionsCount} {g.billedSessionsCount === 1 ? 'sessão' : 'sessões'} • {(g.totalDurationMinutes / 60).toFixed(1)}h
                        {g.swapsCount > 0 ? ` • 🔄 ${g.swapsCount} ${g.swapsCount === 1 ? 'troca' : 'trocas'}` : ''}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)' }}>
                        R$ {formatCurrencyBR(g.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barra de Modo de Exibição: Separado por Paciente (Padrão) vs Ordem Cronológica */}
              <div className="consolidated-view-mode-bar">
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Organização do Detalhamento:</strong>{' '}
                  {consolidatedViewMode === 'by_patient'
                    ? 'Agrupado por paciente para facilitar a conferência na escala (também usado no PDF e Excel).'
                    : 'Todos os pacientes misturados dia a dia em ordem cronológica.'}
                </div>
                <div className="view-mode-toggle-group">
                  <button
                    type="button"
                    className={`view-mode-btn ${consolidatedViewMode === 'by_patient' ? 'active' : ''}`}
                    onClick={() => setConsolidatedViewMode('by_patient')}
                  >
                    <Users size={14} />
                    Separado por Paciente
                  </button>
                  <button
                    type="button"
                    className={`view-mode-btn ${consolidatedViewMode === 'chronological' ? 'active' : ''}`}
                    onClick={() => setConsolidatedViewMode('chronological')}
                  >
                    <Calendar size={14} />
                    Ordem Cronológica
                  </button>
                </div>
              </div>

              {consolidatedViewMode === 'by_patient' ? (
                /* --- DETALHAMENTO SEPARADO POR PACIENTE (PADRÃO!) --- */
                <div className="grouped-patients-stack">
                  {groupedByPatient.map((g, pIdx) => {
                    let billedRowCounter = 0;
                    return (
                      <div key={g.patientId} className="grouped-patient-block">
                        <div className="grouped-patient-block-header">
                          <div className="grouped-patient-title-wrap">
                            <span className="grouped-patient-index">{pIdx + 1}</span>
                            <div>
                              <strong style={{ fontSize: '0.98rem', color: 'var(--text-headline)', display: 'block' }}>
                                {g.patientName}
                              </strong>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {g.patientAddress} • {g.billedSessionsCount}{' '}
                                {g.billedSessionsCount === 1 ? 'sessão faturada' : 'sessões faturadas'} (
                                {(g.totalDurationMinutes / 60).toFixed(1)}h)
                              </span>
                            </div>
                          </div>

                          <div className="grouped-patient-meta">
                            <button
                              type="button"
                              className="btn-action-sm swap"
                              onClick={() =>
                                openAddSessionModal({ patientId: g.patientId, initialSwapType: 'COVERED' })
                              }
                              title={`Registrar troca de escala para ${g.patientName}`}
                            >
                              <RefreshCw size={13} />
                              Registrar Troca
                            </button>
                            <button
                              type="button"
                              className="btn-action-sm"
                              onClick={() =>
                                openAddSessionModal({ patientId: g.patientId, initialSwapType: 'NONE' })
                              }
                              title={`Incluir atendimento avulso para ${g.patientName}`}
                            >
                              <Plus size={13} />
                              Atendimento
                            </button>
                            <span className="grouped-patient-subtotal-chip">
                              Subtotal: R$ {formatCurrencyBR(g.totalAmount)}
                            </span>
                          </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                          <table className="financial-table">
                            <thead>
                              <tr>
                                <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                                <th>Data & Horário</th>
                                <th>Tipo de Dia</th>
                                <th>Duração</th>
                                <th>Custo Horário</th>
                                <th>Valor Sessão</th>
                                <th>Troca de Escala ("Quem Fez") & Ocorrências</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.sessions.map((sess) => {
                                const isCeded = Boolean(sess.isInformationalSwap || sess.swapType === 'CEDED');
                                if (!isCeded) billedRowCounter += 1;
                                const dateObj = new Date(`${sess.dateStr}T${sess.timeStr}:00`);
                                const dayCat = classifyDate(dateObj);
                                const swapLabel = formatSwapBadgeText(sess);

                                return (
                                  <tr key={sess.id} className={isCeded ? 'ceded-swap-row' : ''}>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                                      {isCeded ? '↪' : billedRowCounter}
                                    </td>
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
                                        {dayCat === 'WEEKEND'
                                          ? 'Fim de Semana'
                                          : dayCat === 'HOLIDAY'
                                          ? 'Feriado'
                                          : 'Dia Útil'}
                                      </span>
                                    </td>

                                    <td>
                                      {isCeded ? (
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                                      ) : (
                                        <>
                                          <span style={{ fontWeight: 600 }}>{sess.durationMinutes} min</span>
                                          <span
                                            style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                                          >
                                            ({(sess.durationMinutes / 60).toFixed(1)}h)
                                          </span>
                                        </>
                                      )}
                                    </td>

                                    <td>
                                      {isCeded ? (
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                                      ) : (
                                        <strong style={{ color: 'var(--text-headline)' }}>
                                          R$ {formatCurrencyBR(sess.hourlyRate)}/h
                                        </strong>
                                      )}
                                    </td>

                                    <td>
                                      {isCeded ? (
                                        <span className="swap-badge ceded">R$ 0,00 (Troca)</span>
                                      ) : (
                                        <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                                          R$ {formatCurrencyBR(sess.totalAmount)}
                                        </strong>
                                      )}
                                    </td>

                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                        {swapLabel && (
                                          <span className={`swap-badge ${isCeded ? 'ceded' : 'covered'}`}>
                                            {swapLabel}
                                          </span>
                                        )}
                                        {!isCeded && (
                                          <span className="rule-tag default">
                                            {sess.ruleApplied}
                                          </span>
                                        )}
                                        {sess.notes && (
                                          <span className="session-note-tag" title={sess.notes}>
                                            Obs: {sess.notes}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td style={{ textAlign: 'right' }}>
                                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                        <button
                                          type="button"
                                          className="btn-action-sm swap"
                                          onClick={() => openEditSessionModal(sess, true)}
                                          title="Informar ou editar troca de escala neste atendimento"
                                        >
                                          <RefreshCw size={13} />
                                          Troca
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-action-sm"
                                          onClick={() => openEditSessionModal(sess, false)}
                                          title="Corrigir valores, data ou ocorrência deste atendimento"
                                        >
                                          <Edit2 size={13} />
                                          Corrigir
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-action-sm danger"
                                          onClick={() => handleDeleteSession(sess.id)}
                                          title="Excluir este registro do fechamento"
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

                        <div className="grouped-patient-block-footer">
                          <span style={{ color: 'var(--text-muted)' }}>
                            Conferência de <strong>{g.patientName}</strong>: {g.billedSessionsCount}{' '}
                            {g.billedSessionsCount === 1 ? 'sessão realizada' : 'sessões realizadas'} •{' '}
                            {(g.totalDurationMinutes / 60).toFixed(1)} horas
                            {g.cededCount > 0 ? ` • ${g.cededCount} plantão cedido em troca` : ''}
                          </span>
                          <strong style={{ color: 'var(--primary)', fontSize: '0.96rem' }}>
                            Subtotal {g.patientName}: R$ {formatCurrencyBR(g.totalAmount)}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* --- MODO OPCIONAL: TABELA CRONOLÓGICA DIA A DIA --- */
                <div style={{ overflowX: 'auto' }}>
                  <table className="financial-table">
                    <thead>
                      <tr>
                        <th>Data & Horário</th>
                        <th>Paciente</th>
                        <th>Endereço / Local</th>
                        <th>Tipo de Dia</th>
                        <th>Duração</th>
                        <th>Custo Horário</th>
                        <th>Valor Total</th>
                        <th>Troca de Escala & Ocorrências</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementSessions.map((sess) => {
                        const isCeded = Boolean(sess.isInformationalSwap || sess.swapType === 'CEDED');
                        const dateObj = new Date(`${sess.dateStr}T${sess.timeStr}:00`);
                        const dayCat = classifyDate(dateObj);
                        const swapLabel = formatSwapBadgeText(sess);

                        return (
                          <tr key={sess.id} className={isCeded ? 'ceded-swap-row' : ''}>
                            <td>
                              <strong>
                                {new Date(sess.dateStr + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </strong>
                              <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {sess.timeStr}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="patient-link-btn"
                                onClick={() => setSelectedPatientId(sess.patientId)}
                                title="Filtrar demonstrativo deste paciente"
                              >
                                <strong>{sess.patientName}</strong>
                              </button>
                            </td>

                            <td>
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {sess.patientAddress}
                              </span>
                            </td>

                            <td>
                              <span className={`daytype-badge ${dayCat.toLowerCase()}`}>
                                {dayCat === 'WEEKEND' ? 'Fim de Semana' : dayCat === 'HOLIDAY' ? 'Feriado' : 'Dia Útil'}
                              </span>
                            </td>

                            <td>
                              {isCeded ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                              ) : (
                                <>
                                  <span style={{ fontWeight: 600 }}>{sess.durationMinutes} min</span>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    ({(sess.durationMinutes / 60).toFixed(1)}h)
                                  </span>
                                </>
                              )}
                            </td>

                            <td>
                              {isCeded ? (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                              ) : (
                                <strong style={{ color: 'var(--text-headline)' }}>
                                  R$ {formatCurrencyBR(sess.hourlyRate)}/h
                                </strong>
                              )}
                            </td>

                            <td>
                              {isCeded ? (
                                <span className="swap-badge ceded">R$ 0,00 (Troca)</span>
                              ) : (
                                <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                                  R$ {formatCurrencyBR(sess.totalAmount)}
                                </strong>
                              )}
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                {swapLabel && (
                                  <span className={`swap-badge ${isCeded ? 'ceded' : 'covered'}`}>
                                    {swapLabel}
                                  </span>
                                )}
                                {!isCeded && (
                                  <span className="rule-tag default">
                                    {sess.ruleApplied}
                                  </span>
                                )}
                                {sess.notes && (
                                  <span className="session-note-tag" title={sess.notes}>
                                    Obs: {sess.notes}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn-action-sm swap"
                                  onClick={() => openEditSessionModal(sess, true)}
                                  title="Informar ou editar troca de escala"
                                >
                                  <RefreshCw size={13} />
                                  Troca
                                </button>
                                <button
                                  type="button"
                                  className="btn-action-sm"
                                  onClick={() => openEditSessionModal(sess, false)}
                                  title="Corrigir valores ou ocorrência deste atendimento"
                                >
                                  <Edit2 size={13} />
                                  Corrigir
                                </button>
                                <button
                                  type="button"
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
              )}

              {/* Subtotalizador Geral Consolidado */}
              <div className="patient-subtotal-bar consolidated">
                <div className="patient-subtotal-stats">
                  <span>
                    Total Geral de Sessões Faturadas: <strong>{monthTotals.totalSessions}</strong>
                  </span>
                  <span>
                    Pacientes Atendidos: <strong>{monthTotals.totalPatients}</strong>
                  </span>
                  <span>
                    Carga Horária Total: <strong>{monthTotals.totalHours} horas</strong>
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>
                    Total Geral a Receber no Mês:
                  </span>
                  <div className="patient-subtotal-total" style={{ fontSize: '1.35rem' }}>
                    R$ {formatCurrencyBR(monthTotals.totalAmount)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* --- VISÃO DO PACIENTE INDIVIDUAL SELECIONADO --- */
            (() => {
              const group = groupedByPatient.find((g) => g.patientId === selectedPatientId) || groupedByPatient[0];
              if (!group) return null;
              let billedRowCounter = 0;

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

                    {/* Ações de Troca e Exportação para o Paciente */}
                    <div className="patient-actions-block">
                      <button
                        type="button"
                        className="btn-action-sm swap"
                        onClick={() => openAddSessionModal({ patientId: group.patientId, initialSwapType: 'COVERED' })}
                        title={`Registrar troca de escala para ${group.patientName}`}
                      >
                        <RefreshCw size={14} />
                        Registrar Troca
                      </button>

                      <button
                        type="button"
                        className="btn-export pdf"
                        onClick={() => handleExportPDF(group)}
                        title="Gerar e imprimir demonstrativo formal em PDF para enviar ao paciente/responsável"
                      >
                        <Printer size={15} />
                        Gerar PDF p/ Paciente
                      </button>

                      <button
                        type="button"
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
                          <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                          <th>Data & Horário</th>
                          <th>Tipo de Dia</th>
                          <th>Duração</th>
                          <th>Custo Horário (R$/h)</th>
                          <th>Valor Total da Sessão</th>
                          <th>Troca de Escala & Observações</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.sessions.map((sess) => {
                          const isCeded = Boolean(sess.isInformationalSwap || sess.swapType === 'CEDED');
                          if (!isCeded) billedRowCounter += 1;
                          const dateObj = new Date(`${sess.dateStr}T${sess.timeStr}:00`);
                          const dayCat = classifyDate(dateObj);
                          const swapLabel = formatSwapBadgeText(sess);

                          return (
                            <tr key={sess.id} className={isCeded ? 'ceded-swap-row' : ''}>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                                {isCeded ? '↪' : billedRowCounter}
                              </td>
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
                                {isCeded ? (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                                ) : (
                                  <>
                                    <span style={{ fontWeight: 600 }}>{sess.durationMinutes} min</span>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      ({(sess.durationMinutes / 60).toFixed(1)}h)
                                    </span>
                                  </>
                                )}
                              </td>

                              <td>
                                {isCeded ? (
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                                ) : (
                                  <strong style={{ color: 'var(--text-headline)' }}>
                                    R$ {formatCurrencyBR(sess.hourlyRate)}/h
                                  </strong>
                                )}
                              </td>

                              <td>
                                {isCeded ? (
                                  <span className="swap-badge ceded">R$ 0,00 (Troca)</span>
                                ) : (
                                  <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>
                                    R$ {formatCurrencyBR(sess.totalAmount)}
                                  </strong>
                                )}
                              </td>

                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                                  {swapLabel && (
                                    <span className={`swap-badge ${isCeded ? 'ceded' : 'covered'}`}>
                                      {swapLabel}
                                    </span>
                                  )}
                                  {!isCeded && (
                                    <span className="rule-tag default">
                                      {sess.ruleApplied}
                                    </span>
                                  )}
                                  {sess.notes && (
                                    <span className="session-note-tag" title={sess.notes}>
                                      Obs: {sess.notes}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="btn-action-sm swap"
                                    onClick={() => openEditSessionModal(sess, true)}
                                    title="Informar ou editar troca de escala"
                                  >
                                    <RefreshCw size={13} />
                                    Troca
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-action-sm"
                                    onClick={() => openEditSessionModal(sess, false)}
                                    title="Corrigir valores ou duração deste atendimento"
                                  >
                                    <Edit2 size={13} />
                                    Corrigir
                                  </button>
                                  <button
                                    type="button"
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
                        Total de Sessões Realizadas: <strong>{group.billedSessionsCount}</strong>
                      </span>
                      <span>
                        Horas Realizadas: <strong>{(group.totalDurationMinutes / 60).toFixed(1)} horas</strong>
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', textAlign: 'right' }}>
                        Subtotal a Receber de {(group.patientName || 'Paciente').split(' ')[0]}:
                      </span>
                      <div className="patient-subtotal-total">
                        R$ {formatCurrencyBR(group.totalAmount)}
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
                          R$ {formatCurrencyBR(r.hourlyRate)}/h
                        </strong>
                      </td>
                      <td>
                        <strong>
                          R$ {formatCurrencyBR(r.fixedPrice || r.hourlyRate)}
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

      {/* MODAL 1: CORRIGIR VALORES / REGISTRAR TROCA EM ATENDIMENTO EXISTENTE */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingSession._focusSwap ? (
                  <RefreshCw size={18} color="var(--warning)" />
                ) : (
                  <Edit2 size={18} color="var(--primary)" />
                )}
                {editingSession._focusSwap ? 'Registrar Troca de Escala' : 'Corrigir Atendimento'} — {editingSession.patientName}
              </h3>
              <button
                type="button"
                className="btn-action-sm"
                onClick={() => setEditingSession(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSession}>
              <div className="modal-body">
                {/* SELETOR ESTRUTURADO DE TROCA DE ESCALA ("QUEM FEZ O QUÊ") */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800 }}>
                    Situação na Escala ("Quem realizou este atendimento?")
                  </label>
                  <div className="swap-type-grid">
                    <button
                      type="button"
                      className={`swap-type-card ${(!editingSession.swapType || editingSession.swapType === 'NONE') ? 'active normal' : ''}`}
                      onClick={() => {
                        const restoredRate = editingSession._backupHourlyRate || 150;
                        const dur = parseNumericInput(editingSession.durationMinutes, 60);
                        const restoredTot =
                          editingSession.swapType === 'CEDED'
                            ? Math.round(((dur * restoredRate) / 60) * 100) / 100
                            : editingSession.totalAmount;
                        setEditingSession({
                          ...editingSession,
                          swapType: 'NONE',
                          hourlyRate: editingSession.swapType === 'CEDED' ? restoredRate : editingSession.hourlyRate,
                          totalAmount: restoredTot
                        });
                      }}
                    >
                      <span className="swap-type-card-title">✓ Escala Normal</span>
                      <span className="swap-type-card-desc">Era meu plantão e eu mesma atendi</span>
                    </button>

                    <button
                      type="button"
                      className={`swap-type-card ${editingSession.swapType === 'COVERED' ? 'active covered' : ''}`}
                      onClick={() => {
                        const restoredRate = editingSession._backupHourlyRate || 150;
                        const dur = parseNumericInput(editingSession.durationMinutes, 60);
                        const restoredTot =
                          editingSession.swapType === 'CEDED'
                            ? Math.round(((dur * restoredRate) / 60) * 100) / 100
                            : editingSession.totalAmount;
                        setEditingSession({
                          ...editingSession,
                          swapType: 'COVERED',
                          hourlyRate: editingSession.swapType === 'CEDED' ? restoredRate : editingSession.hourlyRate,
                          totalAmount: restoredTot
                        });
                      }}
                    >
                      <span className="swap-type-card-title">🔄 Cobri / Assumi Troca</span>
                      <span className="swap-type-card-desc">Eu atendi no lugar de colega (faturado p/ mim)</span>
                    </button>

                    <button
                      type="button"
                      className={`swap-type-card ${editingSession.swapType === 'CEDED' ? 'active ceded' : ''}`}
                      onClick={() => {
                        const currentRate = parseNumericInput(editingSession.hourlyRate, 0);
                        const currentTot = parseNumericInput(editingSession.totalAmount, 0);
                        setEditingSession({
                          ...editingSession,
                          swapType: 'CEDED',
                          _backupHourlyRate: currentRate > 0 ? currentRate : editingSession._backupHourlyRate,
                          _backupTotalAmount: currentTot > 0 ? currentTot : editingSession._backupTotalAmount,
                          hourlyRate: 0,
                          totalAmount: 0
                        });
                      }}
                    >
                      <span className="swap-type-card-title">↪ Passei Plantão</span>
                      <span className="swap-type-card-desc">Colega fez meu dia (R$ 0 — só p/ conferência)</span>
                    </button>
                  </div>
                </div>

                {editingSession.swapType && editingSession.swapType !== 'NONE' && (
                  <div className={`swap-details-panel ${editingSession.swapType === 'CEDED' ? 'ceded' : ''}`}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        {editingSession.swapType === 'COVERED'
                          ? 'No lugar de qual profissional você atendeu? *'
                          : 'Qual profissional realizou este atendimento no seu lugar? *'}
                      </label>
                      <select
                        className="form-input"
                        value={editingSession.swapPartnerSelect || ''}
                        onChange={(e) =>
                          setEditingSession({ ...editingSession, swapPartnerSelect: e.target.value })
                        }
                        required
                      >
                        <option value="">Selecione o(a) profissional da equipe...</option>
                        {colleagueOptions.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                        <option value="__custom__">Outro profissional (digitar nome)...</option>
                      </select>
                    </div>

                    {editingSession.swapPartnerSelect === '__custom__' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome do(a) Profissional *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editingSession.swapPartnerCustom || ''}
                          onChange={(e) =>
                            setEditingSession({ ...editingSession, swapPartnerCustom: e.target.value })
                          }
                          placeholder="Ex: Roberta, Sabrina, Patrícia..."
                          required
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Detalhe da Permuta / Data Trocada (Opcional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingSession.swapReason || ''}
                        onChange={(e) =>
                          setEditingSession({ ...editingSession, swapReason: e.target.value })
                        }
                        placeholder={
                          editingSession.swapType === 'COVERED'
                            ? 'Ex: Troquei pelo meu dia 15/10, Cobertura extra...'
                            : 'Ex: Ela fez este dia e eu fiz o dia 22/10 dela...'
                        }
                      />
                    </div>

                    {editingSession.swapType === 'CEDED' && (
                      <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
                        ℹ️ Como outra profissional realizou este atendimento, ele ficará com R$ 0,00 e não somará nas suas sessões pagas — aparecendo apenas para conferência da escala.
                      </div>
                    )}
                  </div>
                )}

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

                {editingSession.swapType !== 'CEDED' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Duração (minutos)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-input"
                        value={editingSession.durationMinutes}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setEditingSession({ ...editingSession, durationMinutes: '' });
                            return;
                          }
                          const dur = parseNumericInput(raw, 0);
                          const rate = parseNumericInput(editingSession.hourlyRate, 0);
                          const tot = dur > 0 ? Math.round(((dur * rate) / 60) * 100) / 100 : editingSession.totalAmount;
                          setEditingSession({
                            ...editingSession,
                            durationMinutes: raw,
                            totalAmount: tot,
                            isManualValueOverride: true
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Custo Horário (R$/h)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        value={editingSession.hourlyRate}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setEditingSession({ ...editingSession, hourlyRate: '' });
                            return;
                          }
                          const rate = parseNumericInput(raw, 0);
                          const dur = parseNumericInput(editingSession.durationMinutes, 60);
                          const tot = Math.round(((dur * rate) / 60) * 100) / 100;
                          setEditingSession({
                            ...editingSession,
                            hourlyRate: raw,
                            totalAmount: tot,
                            isManualValueOverride: true
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Valor Total da Sessão (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        style={{ fontWeight: 800, color: 'var(--primary)' }}
                        value={editingSession.totalAmount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setEditingSession({ ...editingSession, totalAmount: '' });
                            return;
                          }
                          const tot = parseNumericInput(raw, 0);
                          const dur = parseNumericInput(editingSession.durationMinutes, 60);
                          const rate =
                            dur > 0 ? Math.round(((tot * 60) / dur) * 100) / 100 : editingSession.hourlyRate;
                          setEditingSession({
                            ...editingSession,
                            totalAmount: raw,
                            hourlyRate: rate,
                            isManualValueOverride: true
                          });
                        }}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Observações Gerais (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingSession.notes || ''}
                    onChange={(e) => setEditingSession({ ...editingSession, notes: e.target.value })}
                    placeholder="Ex: Atendimento em dupla, sessão prolongada..."
                  />
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
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INCLUIR ATENDIMENTO AVULSO OU REGISTRAR TROCA DE ESCALA */}
      {isAddSessionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddSessionModalOpen(false)}>
          <div className="modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {newSessionSwapType !== 'NONE' ? (
                  <RefreshCw size={18} color="var(--warning)" />
                ) : (
                  <Plus size={18} color="var(--primary)" />
                )}
                {newSessionSwapType !== 'NONE'
                  ? 'Registrar Troca / Cobertura de Escala'
                  : 'Incluir Atendimento no Fechamento Mensal'}
              </h3>
              <button
                type="button"
                className="btn-action-sm"
                onClick={() => setIsAddSessionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSession}>
              <div className="modal-body">
                {/* SELETOR DE TIPO DE REGISTRO / TROCA */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800 }}>
                    Tipo de Registro na Escala *
                  </label>
                  <div className="swap-type-grid">
                    <button
                      type="button"
                      className={`swap-type-card ${newSessionSwapType === 'NONE' ? 'active normal' : ''}`}
                      onClick={() => {
                        setNewSessionSwapType('NONE');
                        if (newSessionPatientId && Number(newSessionHourlyRate) === 0) {
                          const suggested = getSuggestedPatientPricing(
                            newSessionPatientId,
                            newSessionDate,
                            newSessionDuration
                          );
                          setNewSessionHourlyRate(suggested.hourlyRate);
                          setNewSessionTotal(suggested.totalAmount);
                        }
                      }}
                    >
                      <span className="swap-type-card-title">✓ Escala Normal</span>
                      <span className="swap-type-card-desc">Atendimento meu previsto na escala</span>
                    </button>

                    <button
                      type="button"
                      className={`swap-type-card ${newSessionSwapType === 'COVERED' ? 'active covered' : ''}`}
                      onClick={() => {
                        setNewSessionSwapType('COVERED');
                        if (newSessionPatientId && Number(newSessionHourlyRate) === 0) {
                          const suggested = getSuggestedPatientPricing(
                            newSessionPatientId,
                            newSessionDate,
                            newSessionDuration
                          );
                          setNewSessionHourlyRate(suggested.hourlyRate);
                          setNewSessionTotal(suggested.totalAmount);
                        } else if (!newSessionPatientId && Number(newSessionHourlyRate) === 0) {
                          setNewSessionHourlyRate(150);
                          setNewSessionTotal(150);
                        }
                      }}
                    >
                      <span className="swap-type-card-title">🔄 Cobri / Assumi Troca</span>
                      <span className="swap-type-card-desc">Eu atendi no lugar de colega (faturado p/ mim)</span>
                    </button>

                    <button
                      type="button"
                      className={`swap-type-card ${newSessionSwapType === 'CEDED' ? 'active ceded' : ''}`}
                      onClick={() => {
                        setNewSessionSwapType('CEDED');
                        setNewSessionHourlyRate(0);
                        setNewSessionTotal(0);
                      }}
                    >
                      <span className="swap-type-card-title">↪ Passei Plantão</span>
                      <span className="swap-type-card-desc">Colega atendeu meu dia (R$ 0 — só p/ escala)</span>
                    </button>
                  </div>
                </div>

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
                      if (id && newSessionSwapType !== 'CEDED') {
                        const suggested = getSuggestedPatientPricing(id, newSessionDate, newSessionDuration);
                        setNewSessionDuration(suggested.durationMinutes);
                        setNewSessionHourlyRate(suggested.hourlyRate);
                        setNewSessionTotal(suggested.totalAmount);
                      }
                    }}
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

                {newSessionSwapType !== 'NONE' && (
                  <div className={`swap-details-panel ${newSessionSwapType === 'CEDED' ? 'ceded' : ''}`}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        {newSessionSwapType === 'COVERED'
                          ? 'No lugar de qual profissional você atendeu? *'
                          : 'Qual profissional realizou este atendimento no seu lugar? *'}
                      </label>
                      <select
                        className="form-input"
                        value={newSessionSwapPartnerSelect}
                        onChange={(e) => setNewSessionSwapPartnerSelect(e.target.value)}
                        required
                      >
                        <option value="">Selecione o(a) profissional da equipe...</option>
                        {colleagueOptions.map((col) => (
                          <option key={col.id} value={col.name}>
                            {col.name}
                          </option>
                        ))}
                        <option value="__custom__">Outro profissional (digitar nome)...</option>
                      </select>
                    </div>

                    {newSessionSwapPartnerSelect === '__custom__' && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nome do(a) Profissional *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={newSessionSwapPartnerCustom}
                          onChange={(e) => setNewSessionSwapPartnerCustom(e.target.value)}
                          placeholder="Ex: Roberta, Sabrina, Patrícia..."
                          required
                        />
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Detalhe da Troca / Data Permutada (Opcional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newSessionSwapReason}
                        onChange={(e) => setNewSessionSwapReason(e.target.value)}
                        placeholder={
                          newSessionSwapType === 'COVERED'
                            ? 'Ex: Troquei pelo meu dia 15/10, Cobertura de plantão...'
                            : 'Ex: Ela cobriu meu dia 15/10 e eu fiz o dia 22/10 dela...'
                        }
                      />
                    </div>

                    {newSessionSwapType === 'CEDED' && (
                      <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
                        ℹ️ Este registro terá valor R$ 0,00 e não somará nas suas sessões pagas — aparecerá no bloco do paciente apenas para a gestora conferir na escala quem realizou o atendimento.
                      </div>
                    )}
                  </div>
                )}

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

                {newSessionSwapType !== 'CEDED' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Duração (minutos)</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-input"
                        value={newSessionDuration}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setNewSessionDuration(raw);
                          if (raw !== '') {
                            const dur = parseNumericInput(raw, 60);
                            const rate = parseNumericInput(newSessionHourlyRate, 0);
                            setNewSessionTotal(Math.round(((dur * rate) / 60) * 100) / 100);
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Custo Horário (R$/h)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        value={newSessionHourlyRate}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setNewSessionHourlyRate(raw);
                          if (raw !== '') {
                            const rate = parseNumericInput(raw, 0);
                            const dur = parseNumericInput(newSessionDuration, 60);
                            setNewSessionTotal(Math.round(((dur * rate) / 60) * 100) / 100);
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Valor Total (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        style={{ fontWeight: 800, color: 'var(--primary)' }}
                        value={newSessionTotal}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setNewSessionTotal(raw);
                          if (raw !== '') {
                            const tot = parseNumericInput(raw, 0);
                            const dur = parseNumericInput(newSessionDuration, 60);
                            if (dur > 0) {
                              setNewSessionHourlyRate(Math.round(((tot * 60) / dur) * 100) / 100);
                            }
                          }
                        }}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Observações Gerais (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSessionNotes}
                    onChange={(e) => setNewSessionNotes(e.target.value)}
                    placeholder="Ex: Atendimento em dupla com Patrícia, sessão estendida..."
                  />
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
                  {newSessionSwapType === 'CEDED'
                    ? 'Registrar Plantão Cedido'
                    : newSessionSwapType === 'COVERED'
                    ? 'Incluir Atendimento com Troca'
                    : 'Incluir Atendimento'}
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
                      min="0"
                      step="any"
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
