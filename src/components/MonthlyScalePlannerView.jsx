// src/components/MonthlyScalePlannerView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  TrendingUp,
  Users,
  ShieldCheck,
  Save,
  Info,
  CalendarCheck,
  Plus,
  Trash2,
  UserPlus,
  X,
  Stethoscope,
  Sliders,
  Ban,
  Lock,
  Printer,
  FileDown,
  FileText,
  Calendar as CalendarIcon
} from 'lucide-react';
import { MonthlyScaleGenerator } from '../services/monthly-scale-generator';
import './MonthlyScalePlannerView.css';

import { ALL_PRESET_LOCATIONS, resolveAddressCoordinates } from '../services/geocodingService';

// Chave para persistência da escala mensal no localStorage para não perder ao trocar de tela
export const SCALE_STORAGE_KEY = 'omnihome_monthly_scale_state_v4';

export const getInitialScaleSavedData = () => {
  try {
    const raw = localStorage.getItem(SCALE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler escala salva:', e);
  }
  return null;
};

// Polos regionais e metropolitanos em todo o Brasil para coordenadas geodésicas automáticas
const SP_PRESET_LOCATIONS = ALL_PRESET_LOCATIONS;

export const CLINICAL_SPECIALTY_OPTIONS = [
  'Fisioterapia Motora',
  'Fisioterapia Respiratória',
  'Terapia Ocupacional',
  'Fonoaudiologia'
];

const THERAPY_OPTIONS = CLINICAL_SPECIALTY_OPTIONS;

const WEEKDAY_NAMES = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira'
};

const WEEKDAY_SHORT = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom' };

export default function MonthlyScalePlannerView({
  patients = [],
  doctors = [],
  onCommitScaleToAppointments,
  onRegisterDoctorWithoutAccount,
  onNavigateToPatientsView
}) {
  const [selectedMonth, setSelectedMonth] = useState(() => getInitialScaleSavedData()?.selectedMonth || '2026-10');
  const [activeTab, setActiveTab] = useState('demands'); // Inicia diretamente na aba de configuração de demandas e horários
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('all');
  const [committedSuccess, setCommittedSuccess] = useState(false);
  const [saveExplicitSuccess, setSaveExplicitSuccess] = useState(false);

  // Estados para Modal de Exportação da Escala em PDF
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [pdfTargetType, setPdfTargetType] = useState('all'); // 'all' | 'patient' | 'professional'
  const [pdfSelectedPatientId, setPdfSelectedPatientId] = useState('');
  const [pdfSelectedDoctorId, setPdfSelectedDoctorId] = useState('');

  // Modal para buscar e adicionar pacientes já cadastrados na base do sistema
  const [isAddPatientFromBaseModalOpen, setIsAddPatientFromBaseModalOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');

  // Modal de Fisioterapeutas: Buscar com Conta vs. Cadastrar Sem Conta
  const [isTherapistManagementModalOpen, setIsTherapistManagementModalOpen] = useState(false);
  const [therapistModalTab, setTherapistModalTab] = useState('with-account'); // 'with-account' | 'without-account'

  // Modal para editar dados básicos do paciente (nome e bairro)
  const [editPatientModalState, setEditPatientModalState] = useState({
    isOpen: false,
    patientId: null,
    patientName: '',
    neighborhood: 'Cerqueira César (Alameda Santos)'
  });

  // Modal para adicionar bloco de indisponibilidade (profissional ou paciente)
  const [addBlockModalState, setAddBlockModalState] = useState({
    isOpen: false,
    targetType: 'professional', // 'professional' | 'patient'
    targetId: null,
    targetName: '',
    blockType: 'weekly', // 'weekly' | 'date' | 'range'
    dayOfWeek: 2,
    dateStr: '2026-10-14',
    endDateStr: '2026-10-16',
    startTime: '09:00',
    endTime: '10:30',
    reason: 'Paciente particular externo'
  });

  // Atendimentos Fixados / Travados na Grade
  const [fixedAppointments, setFixedAppointments] = useState(() => getInitialScaleSavedData()?.fixedAppointments || []);

  // Modal para cadastrar atendimento fixo
  const [fixedAppointmentModalState, setFixedAppointmentModalState] = useState({
    isOpen: false,
    patientId: '',
    professionalId: '',
    therapyType: 'Fisioterapia Motora',
    recurrenceType: 'weekly', // 'weekly' | 'date'
    dayOfWeek: 2,
    dateStr: '',
    time: '09:00',
    durationMinutes: 45,
    notes: 'Horário fixado prioritário'
  });

  // Form State: Novo Profissional Sem Conta (com suporte a até 3 especialidades e mapa de base)
  const [newTherapistForm, setNewTherapistForm] = useState({
    professionalName: '',
    specialties: ['Fisioterapia Motora'],
    baseAddress: 'São Paulo - SP',
    baseCoordinates: { latitude: -23.585, longitude: -46.638 },
    isGeocoding: false,
    weekdayWindows: {
      1: { enabled: true, startTime: '08:00', endTime: '18:00' },
      2: { enabled: true, startTime: '08:00', endTime: '18:00' },
      3: { enabled: true, startTime: '08:00', endTime: '18:00' },
      4: { enabled: true, startTime: '08:00', endTime: '18:00' },
      5: { enabled: true, startTime: '08:00', endTime: '18:00' }
    },
    assignedPatientIds: []
  });

  // 1. Estado Dinâmico: Pacientes com DEMANDAS TERAPÊUTICAS do cadastro e BLOQUEIOS DE HORÁRIO
  const [patientsWithDemands, setPatientsWithDemands] = useState(() => getInitialScaleSavedData()?.patientsWithDemands || []);

  // 2. Estado Dinâmico: Profissionais com JANELAS DE HORÁRIO INDIVIDUAIS POR DIA E BLOQUEIOS
  const [professionalAvailabilities, setProfessionalAvailabilities] = useState(() => getInitialScaleSavedData()?.professionalAvailabilities || []);

  // 3. Vínculos de Care Team (Restrição de Ouro)
  const [careTeams, setCareTeams] = useState(() => getInitialScaleSavedData()?.careTeams || []);

  // Sincroniza pacientes cadastrados com demandas caso o planejador esteja vazio
  useEffect(() => {
    if (patientsWithDemands.length === 0 && patients && patients.length > 0) {
      const initialPatients = patients.map((pat) => {
        const coords = (pat.latitude && pat.longitude)
          ? { latitude: pat.latitude, longitude: pat.longitude }
          : (SP_PRESET_LOCATIONS[pat.address] || SP_PRESET_LOCATIONS['Cerqueira César (Alameda Santos)'] || { latitude: -23.585, longitude: -46.638 });

        const patDemands = pat.demands && pat.demands.length > 0
          ? pat.demands
          : [
              {
                id: `dem-${pat.id}-1`,
                therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
                sessionsPerWeek: 2,
                durationMinutes: 45,
                preferredShift: 'morning'
              }
            ];

        return {
          patientId: pat.id,
          patientName: pat.name,
          neighborhood: pat.address || 'São Paulo - SP',
          address: pat.address || 'São Paulo - SP',
          location: coords,
          demands: patDemands,
          unavailabilityBlocks: pat.unavailabilityBlocks || []
        };
      });

      const initialCareTeams = patients.map((pat) => ({
        patientId: pat.id,
        professionalIds: pat.careTeamProfessionalIds ||
          pat.careTeamMembers?.map((m) => m.professionalId || m) ||
          doctors.map((d) => d.id)
      }));

      setPatientsWithDemands(initialPatients);
      setCareTeams(initialCareTeams);
    }
  }, [patients]);

  // Sincroniza profissionais para compor a disponibilidade na escala inicial
  useEffect(() => {
    if (professionalAvailabilities.length === 0 && doctors && doctors.length > 0) {
      const initialProfs = doctors.map((doc) => {
        const coords = (doc.baseCoordinates?.latitude && doc.baseCoordinates?.longitude)
          ? doc.baseCoordinates
          : (SP_PRESET_LOCATIONS[doc.baseAddress] || SP_PRESET_LOCATIONS['Bela Vista (Av. Paulista)'] || { latitude: -23.585, longitude: -46.638 });

        return {
          professionalId: doc.id,
          professionalName: doc.name,
          specialty: doc.specialty || doc.profession || 'Fisioterapia Domiciliar',
          baseLocation: coords,
          hasAccount: doc.hasAccount !== false,
          weekdayWindows: doc.weekdayWindows || {
            1: { enabled: true, startTime: '08:00', endTime: '18:00' },
            2: { enabled: true, startTime: '08:00', endTime: '18:00' },
            3: { enabled: true, startTime: '08:00', endTime: '18:00' },
            4: { enabled: true, startTime: '08:00', endTime: '18:00' },
            5: { enabled: true, startTime: '08:00', endTime: '18:00' }
          }
        };
      });

      setProfessionalAvailabilities(initialProfs);
    }
  }, [doctors]);

  // Transforma os pacientes e suas demandas na lista plana consumida pelo motor
  const flatDemands = useMemo(() => {
    return patientsWithDemands.flatMap((p) =>
      p.demands.map((d) => ({
        id: d.id,
        patientId: p.patientId,
        patientName: p.patientName,
        therapyType: d.therapyType,
        sessionsPerWeek: d.sessionsPerWeek,
        durationMinutes: d.durationMinutes,
        preferredShift: d.preferredShift,
        availableWindows: d.availableWindows,
        location: p.location,
        address: p.address,
        unavailabilityBlocks: p.unavailabilityBlocks || []
      }))
    );
  }, [patientsWithDemands]);

  // Estado da escala gerada
  const [scaleResult, setScaleResult] = useState(() => {
    try {
      const saved = getInitialScaleSavedData();
      if (saved?.scaleResult && saved.scaleResult.plannedSessions && saved.scaleResult.plannedSessions.length > 0) {
        return saved.scaleResult;
      }
      const generator = new MonthlyScaleGenerator(28, 12);
      return generator.generateMonthlyScale({
        year: 2026,
        month: 10,
        demands: flatDemands,
        availabilities: professionalAvailabilities,
        careTeams,
        fixedAppointments
      });
    } catch (err) {
      console.warn('Erro ao inicializar escala mensal:', err);
      return null;
    }
  });

  // Salva no localStorage para não perder a escala ao sair da tela (executado com segurança após declarações)
  useEffect(() => {
    if (patientsWithDemands.length > 0 || professionalAvailabilities.length > 0 || scaleResult) {
      try {
        let resultToSave = scaleResult;
        // Blindagem contra perda de dados: se scaleResult for nulo ou vazio, preservar o resultado já salvo previamente
        if (!resultToSave || !resultToSave.plannedSessions || resultToSave.plannedSessions.length === 0) {
          const prevSaved = getInitialScaleSavedData();
          if (prevSaved?.scaleResult?.plannedSessions && prevSaved.scaleResult.plannedSessions.length > 0) {
            resultToSave = prevSaved.scaleResult;
          }
        }

        localStorage.setItem(
          SCALE_STORAGE_KEY,
          JSON.stringify({
            selectedMonth,
            patientsWithDemands,
            professionalAvailabilities,
            careTeams,
            fixedAppointments,
            scaleResult: resultToSave,
            savedAt: new Date().toISOString()
          })
        );
      } catch (err) {
        console.warn('Erro ao salvar escala no localStorage:', err);
      }
    }
  }, [selectedMonth, patientsWithDemands, professionalAvailabilities, careTeams, fixedAppointments, scaleResult]);

  // Executa o cálculo da escala mensal
  const runGeneration = (
    currentPatients = patientsWithDemands,
    currentAvails = professionalAvailabilities,
    currentCareTeams = careTeams,
    currentFixed = fixedAppointments
  ) => {
    setIsGenerating(true);
    setCommittedSuccess(false);

    const demandsToRun = currentPatients.flatMap((p) =>
      p.demands.map((d) => ({
        id: d.id,
        patientId: p.patientId,
        patientName: p.patientName,
        therapyType: d.therapyType,
        sessionsPerWeek: d.sessionsPerWeek,
        durationMinutes: d.durationMinutes,
        preferredShift: d.preferredShift,
        availableWindows: d.availableWindows,
        location: p.location,
        address: p.address,
        unavailabilityBlocks: p.unavailabilityBlocks || []
      }))
    );

    setTimeout(() => {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const generator = new MonthlyScaleGenerator(28, 12);
      const result = generator.generateMonthlyScale({
        year,
        month,
        demands: demandsToRun,
        availabilities: currentAvails,
        careTeams: currentCareTeams,
        fixedAppointments: currentFixed
      });

      setScaleResult(result);
      setIsGenerating(false);
    }, 300);
  };

  // ----------------------------------------------------
  // GESTÃO DE HORÁRIOS DOS PROFISSIONAIS
  // ----------------------------------------------------
  // Alternar se o profissional atende naquele dia da semana
  const handleToggleDayEnabled = (profId, dayNum) => {
    const updated = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === profId) {
        const currentWin = prof.weekdayWindows?.[dayNum] || { enabled: false, startTime: '08:00', endTime: '18:00' };
        return {
          ...prof,
          weekdayWindows: {
            ...prof.weekdayWindows,
            [dayNum]: {
              ...currentWin,
              enabled: !currentWin.enabled
            }
          }
        };
      }
      return prof;
    });

    setProfessionalAvailabilities(updated);
    runGeneration(patientsWithDemands, updated, careTeams);
  };

  // Atualizar horário de início ou fim do profissional em um dia da semana
  const handleUpdateDayTime = (profId, dayNum, field, value) => {
    const updated = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === profId) {
        const currentWin = prof.weekdayWindows?.[dayNum] || { enabled: true, startTime: '08:00', endTime: '18:00' };
        return {
          ...prof,
          weekdayWindows: {
            ...prof.weekdayWindows,
            [dayNum]: {
              ...currentWin,
              [field]: value
            }
          }
        };
      }
      return prof;
    });

    setProfessionalAvailabilities(updated);
    runGeneration(patientsWithDemands, updated, careTeams);
  };

  // Aplicar preset rápido de horário (ex: 08:00 às 13:00)
  const handleApplyTimePreset = (profId, dayNum, startTime, endTime) => {
    const updated = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === profId) {
        const currentWin = prof.weekdayWindows?.[dayNum] || { enabled: true, startTime: '08:00', endTime: '18:00' };
        return {
          ...prof,
          weekdayWindows: {
            ...prof.weekdayWindows,
            [dayNum]: {
              ...currentWin,
              enabled: true,
              startTime,
              endTime
            }
          }
        };
      }
      return prof;
    });

    setProfessionalAvailabilities(updated);
    runGeneration(patientsWithDemands, updated, careTeams);
  };

  // ----------------------------------------------------
  // GESTÃO DE DEMANDAS DOS PACIENTES (ATÉ 3 POR PACIENTE)
  // ----------------------------------------------------
  // Alterar especialidade terapêutica de uma demanda existente
  const handleUpdateTherapyType = (patientId, demandId, newType) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          demands: pat.demands.map((d) => (d.id === demandId ? { ...d, therapyType: newType } : d))
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Salvar edição de dados básicos do paciente (nome e bairro)
  const handleSaveEditPatient = (e) => {
    e.preventDefault();
    const { patientId, patientName, neighborhood } = editPatientModalState;
    if (!patientId || !patientName.trim()) return;

    const coords = SP_PRESET_LOCATIONS[neighborhood] || SP_PRESET_LOCATIONS['Cerqueira César (Alameda Santos)'];

    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          patientName: patientName.trim(),
          neighborhood,
          address: neighborhood,
          location: coords
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    setEditPatientModalState({ isOpen: false, patientId: null, patientName: '', neighborhood: '' });
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Alterar frequência semanal de uma terapia específica do paciente
  const handleUpdateWeeklySessions = (patientId, demandId, delta) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          demands: pat.demands.map((d) => {
            if (d.id === demandId) {
              const next = Math.max(1, Math.min(6, d.sessionsPerWeek + delta));
              return { ...d, sessionsPerWeek: next };
            }
            return d;
          })
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Alterar turno de uma terapia específica
  const handleUpdateShift = (patientId, demandId, shift) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          demands: pat.demands.map((d) => (d.id === demandId ? { ...d, preferredShift: shift } : d))
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Remover uma demanda específica de um paciente
  const handleRemoveSingleDemand = (patientId, demandId) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          demands: pat.demands.filter((d) => d.id !== demandId)
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // ----------------------------------------------------
  // GESTÃO DE BLOQUEIOS DE INDISPONIBILIDADE
  // ----------------------------------------------------
  const handleAddTherapistBlock = (profId, block) => {
    const updated = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === profId) {
        const blocks = prof.unavailabilityBlocks || [];
        return {
          ...prof,
          unavailabilityBlocks: [...blocks, block]
        };
      }
      return prof;
    });
    setProfessionalAvailabilities(updated);
    runGeneration(patientsWithDemands, updated, careTeams);
  };

  const handleRemoveTherapistBlock = (profId, blockId) => {
    const updated = professionalAvailabilities.map((prof) => {
      if (prof.professionalId === profId) {
        return {
          ...prof,
          unavailabilityBlocks: (prof.unavailabilityBlocks || []).filter((b) => b.id !== blockId)
        };
      }
      return prof;
    });
    setProfessionalAvailabilities(updated);
    runGeneration(patientsWithDemands, updated, careTeams);
  };

  const handleAddPatientBlock = (patientId, block) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        const blocks = pat.unavailabilityBlocks || [];
        return {
          ...pat,
          unavailabilityBlocks: [...blocks, block]
        };
      }
      return pat;
    });
    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  const handleRemovePatientBlock = (patientId, blockId) => {
    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        return {
          ...pat,
          unavailabilityBlocks: (pat.unavailabilityBlocks || []).filter((b) => b.id !== blockId)
        };
      }
      return pat;
    });
    setPatientsWithDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  const handleSaveBlock = (e) => {
    e.preventDefault();
    const { targetType, targetId, blockType, dayOfWeek, dateStr, endDateStr, startTime, endTime, reason } = addBlockModalState;
    if (!targetId) return;

    const newBlock = {
      id: `blk-${Date.now()}`,
      startTime,
      endTime,
      reason: reason.trim() || (targetType === 'professional' ? 'Paciente particular' : 'Compromisso pessoal')
    };

    if (blockType === 'weekly') {
      newBlock.dayOfWeek = Number(dayOfWeek);
    } else if (blockType === 'date') {
      newBlock.dateStr = dateStr;
    } else if (blockType === 'range') {
      newBlock.dateStr = dateStr;
      newBlock.endDateStr = endDateStr;
    }

    if (targetType === 'professional') {
      handleAddTherapistBlock(targetId, newBlock);
    } else {
      handleAddPatientBlock(targetId, newBlock);
    }

    setAddBlockModalState({ ...addBlockModalState, isOpen: false });
  };

  const handleAddFixedAppointment = (e) => {
    e.preventDefault();
    const { patientId, professionalId, therapyType, recurrenceType, dayOfWeek, dateStr, time, durationMinutes, notes } = fixedAppointmentModalState;
    const pat = patientsWithDemands.find((p) => p.patientId === patientId);
    const prof = professionalAvailabilities.find((p) => p.professionalId === professionalId);

    const newFix = {
      id: `fix-${Date.now()}`,
      patientId,
      patientName: pat?.patientName || 'Paciente',
      professionalId,
      professionalName: prof?.professionalName || 'Profissional',
      therapyType,
      recurrenceType,
      dayOfWeek: recurrenceType === 'weekly' ? Number(dayOfWeek) : undefined,
      dateStr: recurrenceType === 'date' ? dateStr : undefined,
      time,
      durationMinutes: Number(durationMinutes) || 45,
      notes: notes.trim() || 'Atendimento fixo pré-estabelecido'
    };

    const nextFixed = [...fixedAppointments, newFix];
    setFixedAppointments(nextFixed);
    setFixedAppointmentModalState({ ...fixedAppointmentModalState, isOpen: false });
    runGeneration(patientsWithDemands, professionalAvailabilities, careTeams, nextFixed);
  };

  const handleRemoveFixedAppointment = (fixId) => {
    const nextFixed = fixedAppointments.filter((f) => f.id !== fixId);
    setFixedAppointments(nextFixed);
    runGeneration(patientsWithDemands, professionalAvailabilities, careTeams, nextFixed);
  };

  const formatBlockLabel = (block) => {
    if (block.dateStr && block.endDateStr && block.dateStr !== block.endDateStr) {
      const parts1 = block.dateStr.split('-');
      const parts2 = block.endDateStr.split('-');
      return `${parts1[2]}/${parts1[1]} a ${parts2[2]}/${parts2[1]}`;
    }
    if (block.dateStr) {
      const parts = block.dateStr.split('-');
      return `${parts[2]}/${parts[1]}`;
    }
    return WEEKDAY_SHORT[block.dayOfWeek] || 'Dia';
  };

  const getBlockChipClass = (block, baseClass) => {
    if (block.dateStr && block.endDateStr && block.dateStr !== block.endDateStr) {
      return `${baseClass} chip-range`;
    }
    if (block.dateStr) {
      return `${baseClass} chip-date`;
    }
    return baseClass;
  };

  // Adicionar uma nova demanda (até 3) a um paciente existente
  const handleAddDemandToPatient = (e) => {
    e.preventDefault();
    const { patientId, therapyType, sessionsPerWeek, durationMinutes, preferredShift } = addDemandModalState;
    if (!patientId) return;

    const newDemandItem = {
      id: `dem-${patientId}-${Date.now()}`,
      therapyType,
      sessionsPerWeek: Number(sessionsPerWeek),
      durationMinutes: Number(durationMinutes),
      preferredShift
    };

    const updated = patientsWithDemands.map((pat) => {
      if (pat.patientId === patientId) {
        if (pat.demands.length >= 3) {
          alert('Cada paciente pode ter no máximo 3 demandas terapêuticas ativas.');
          return pat;
        }
        return {
          ...pat,
          demands: [...pat.demands, newDemandItem]
        };
      }
      return pat;
    });

    setPatientsWithDemands(updated);
    setAddDemandModalState({ ...addDemandModalState, isOpen: false });
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Alternar vínculo de Care Team
  const handleToggleCareTeamMember = (patientId, profId) => {
    const updated = careTeams.map((ct) => {
      if (ct.patientId === patientId) {
        const hasProf = ct.professionalIds.includes(profId);
        const nextProfs = hasProf
          ? ct.professionalIds.filter((id) => id !== profId)
          : [...ct.professionalIds, profId];
        return { ...ct, professionalIds: nextProfs };
      }
      return ct;
    });

    setCareTeams(updated);
    runGeneration(patientsWithDemands, professionalAvailabilities, updated);
  };

  // Remover Paciente Apenas da Escala Mensal (sem excluir o cadastro)
  const handleRemovePatientFromScale = (patientId) => {
    const nextPatients = patientsWithDemands.filter((p) => p.patientId !== patientId);
    const nextCareTeams = careTeams.filter((ct) => ct.patientId !== patientId);
    setPatientsWithDemands(nextPatients);
    setCareTeams(nextCareTeams);
    runGeneration(nextPatients, professionalAvailabilities, nextCareTeams);
  };

  // Adicionar Paciente Já Cadastrado na Base à Escala Mensal
  const handleAddPatientFromBase = (patient) => {
    if (patientsWithDemands.some((p) => p.patientId === patient.id)) return;

    // As demandas terapêuticas vêm diretamente do cadastro do paciente!
    const patientDemands = patient.demands && patient.demands.length > 0
      ? patient.demands
      : [
          {
            id: `dem-${patient.id}-1`,
            therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
            sessionsPerWeek: 2,
            durationMinutes: 45,
            preferredShift: 'morning'
          }
        ];

    const coords = (patient.latitude && patient.longitude)
      ? { latitude: patient.latitude, longitude: patient.longitude }
      : (SP_PRESET_LOCATIONS[patient.address] || SP_PRESET_LOCATIONS['Cerqueira César (Alameda Santos)'] || { latitude: -23.585, longitude: -46.638 });

    const newPatientItem = {
      patientId: patient.id,
      patientName: patient.name,
      neighborhood: patient.address || 'São Paulo - SP',
      address: patient.address || 'São Paulo - SP',
      location: coords,
      demands: patientDemands,
      unavailabilityBlocks: patient.unavailabilityBlocks || []
    };

    // Care team do paciente
    const patientCareTeamIds = patient.careTeamProfessionalIds ||
      patient.careTeamMembers?.map((m) => m.professionalId || m) ||
      professionalAvailabilities.map((p) => p.professionalId);

    const nextPatients = [...patientsWithDemands, newPatientItem];
    const nextCareTeams = [
      ...careTeams.filter((ct) => ct.patientId !== patient.id),
      { patientId: patient.id, professionalIds: patientCareTeamIds }
    ];

    setPatientsWithDemands(nextPatients);
    setCareTeams(nextCareTeams);
    setIsAddPatientFromBaseModalOpen(false);

    runGeneration(nextPatients, professionalAvailabilities, nextCareTeams);
  };

  // Adicionar Fisioterapeuta que já possui conta no site para compor a escala
  const handleAddDoctorWithAccountToScale = (doc) => {
    if (professionalAvailabilities.some((p) => p.professionalId === doc.id)) return;

    const baseCoords = (doc.baseCoordinates?.latitude && doc.baseCoordinates?.longitude)
      ? doc.baseCoordinates
      : (SP_PRESET_LOCATIONS[doc.baseAddress] || SP_PRESET_LOCATIONS['Bela Vista (Av. Paulista)'] || { latitude: -23.585, longitude: -46.638 });

    const newProf = {
      professionalId: doc.id,
      professionalName: doc.name,
      specialty: doc.specialty || doc.profession || 'Fisioterapia Domiciliar',
      baseLocation: baseCoords,
      hasAccount: true,
      weekdayWindows: doc.weekdayWindows || {
        1: { enabled: true, startTime: '08:00', endTime: '18:00' },
        2: { enabled: true, startTime: '08:00', endTime: '18:00' },
        3: { enabled: true, startTime: '08:00', endTime: '18:00' },
        4: { enabled: true, startTime: '08:00', endTime: '18:00' },
        5: { enabled: true, startTime: '08:00', endTime: '18:00' }
      }
    };

    const nextProfs = [...professionalAvailabilities, newProf];
    setProfessionalAvailabilities(nextProfs);
    setIsTherapistManagementModalOpen(false);

    runGeneration(patientsWithDemands, nextProfs, careTeams);
  };

  // Alternar especialidade no formulário de novo fisioterapeuta sem conta (até 3)
  const handleToggleNewTherapistSpecialty = (spec) => {
    setNewTherapistForm((prev) => {
      const current = prev.specialties || [];
      if (current.includes(spec)) {
        if (current.length === 1) return prev; // Manter pelo menos 1
        return { ...prev, specialties: current.filter((s) => s !== spec) };
      } else {
        if (current.length >= 3) return prev; // Máximo de 3 especialidades
        return { ...prev, specialties: [...current, spec] };
      }
    });
  };

  // Geocodificar endereço do novo fisioterapeuta sem conta
  const handleGeocodeNewTherapistAddress = async () => {
    const addr = newTherapistForm.baseAddress;
    if (!addr || addr.trim().length < 3) return;
    setNewTherapistForm((prev) => ({ ...prev, isGeocoding: true }));
    try {
      const res = await resolveAddressCoordinates(addr);
      if (res && res.latitude && res.longitude) {
        setNewTherapistForm((prev) => ({
          ...prev,
          baseCoordinates: { latitude: res.latitude, longitude: res.longitude },
          isGeocoding: false
        }));
      } else {
        setNewTherapistForm((prev) => ({ ...prev, isGeocoding: false }));
      }
    } catch {
      setNewTherapistForm((prev) => ({ ...prev, isGeocoding: false }));
    }
  };

  // Criar Novo Fisioterapeuta SEM CONTA para compor a escala
  const handleCreateTherapistWithoutAccount = (e) => {
    e.preventDefault();
    if (!newTherapistForm.professionalName.trim()) return;

    const newDocId = `doc-sem-conta-${Date.now()}`;
    const baseCoords = newTherapistForm.baseCoordinates || { latitude: -23.585, longitude: -46.638 };
    const specList = newTherapistForm.specialties && newTherapistForm.specialties.length > 0
      ? newTherapistForm.specialties
      : ['Fisioterapia Motora'];

    const newProf = {
      id: newDocId,
      professionalId: newDocId,
      name: newTherapistForm.professionalName.trim(),
      professionalName: newTherapistForm.professionalName.trim(),
      specialty: specList.join(', '),
      specialties: specList,
      profession: specList.some((s) => s.includes('Fono'))
        ? 'Fonoaudiologia'
        : specList.some((s) => s.includes('Terapia Ocupacional'))
        ? 'Terapia Ocupacional'
        : 'Fisioterapia',
      baseAddress: newTherapistForm.baseAddress || 'São Paulo - SP',
      baseCoordinates: baseCoords,
      baseLocation: baseCoords,
      weekdayWindows: newTherapistForm.weekdayWindows,
      hasAccount: false
    };

    // Atualiza care teams selecionados para incluir o novo profissional
    const nextCareTeams = careTeams.map((ct) => {
      if (newTherapistForm.assignedPatientIds.includes(ct.patientId)) {
        return {
          ...ct,
          professionalIds: [...new Set([...ct.professionalIds, newDocId])]
        };
      }
      return ct;
    });

    const nextProfs = [...professionalAvailabilities, newProf];
    setProfessionalAvailabilities(nextProfs);
    setCareTeams(nextCareTeams);
    setIsTherapistManagementModalOpen(false);

    // Persiste globalmente na lista geral de doctors para aparecer no Care Team do cadastro do paciente
    if (onRegisterDoctorWithoutAccount) {
      onRegisterDoctorWithoutAccount(newProf);
    }

    setNewTherapistForm({
      professionalName: '',
      specialties: ['Fisioterapia Motora'],
      baseAddress: 'São Paulo - SP',
      baseCoordinates: { latitude: -23.585, longitude: -46.638 },
      isGeocoding: false,
      weekdayWindows: {
        1: { enabled: true, startTime: '08:00', endTime: '18:00' },
        2: { enabled: true, startTime: '08:00', endTime: '18:00' },
        3: { enabled: true, startTime: '08:00', endTime: '18:00' },
        4: { enabled: true, startTime: '08:00', endTime: '18:00' },
        5: { enabled: true, startTime: '08:00', endTime: '18:00' }
      },
      assignedPatientIds: []
    });

    runGeneration(patientsWithDemands, nextProfs, nextCareTeams);
  };

  // Salvar explicitamente a escala e seus parâmetros no localStorage E sincronizar com a Agenda e Rota do Dia
  const handleSaveScaleExplicitly = () => {
    try {
      localStorage.setItem(
        SCALE_STORAGE_KEY,
        JSON.stringify({
          selectedMonth,
          patientsWithDemands,
          professionalAvailabilities,
          careTeams,
          fixedAppointments,
          scaleResult,
          savedAt: new Date().toISOString()
        })
      );

      // Sincroniza imediatamente com a agenda e rota do dia se houver sessões planejadas
      if (scaleResult && scaleResult.plannedSessions && scaleResult.plannedSessions.length > 0 && onCommitScaleToAppointments) {
        const appointmentsToSave = scaleResult.plannedSessions.map((s) => ({
          id: `apt-plan-${s.id}`,
          patientId: s.patientId,
          doctorId: s.professionalId,
          date: s.date,
          time: s.time,
          status: 'waiting',
          type: 'home',
          notes: `Plano Terapêutico: ${s.therapyType} (${s.transitKmFromPrevious.toFixed(1)} km da parada anterior)`,
          address: s.address,
          accessNotes: 'Sessão gerada pelo motor de escala mensal automatizada.',
          transitTime: `${s.transitTimeMinutes} min de trânsito estimado`,
          transitTimeMinutes: s.transitTimeMinutes,
          transitKmFromPrevious: s.transitKmFromPrevious,
          durationMinutes: s.durationMinutes || 45,
          therapyType: s.therapyType
        }));
        onCommitScaleToAppointments(appointmentsToSave, scaleResult);
      }

      setSaveExplicitSuccess(true);
      setTimeout(() => setSaveExplicitSuccess(false), 4000);
    } catch (err) {
      alert('Erro ao salvar escala localmente: ' + err.message);
    }
  };

  // Grava as sessões geradas no estado de agendamentos principal
  const handleCommitScale = () => {
    if (!scaleResult || scaleResult.plannedSessions.length === 0) return;

    // Salva explicitamente no localStorage antes de publicar
    handleSaveScaleExplicitly();

    if (onCommitScaleToAppointments) {
      const appointmentsToSave = scaleResult.plannedSessions.map((s) => ({
        id: `apt-plan-${s.id}`,
        patientId: s.patientId,
        doctorId: s.professionalId,
        date: s.date,
        time: s.time,
        status: 'waiting',
        type: 'home',
        notes: `Plano Terapêutico: ${s.therapyType} (${s.transitKmFromPrevious.toFixed(1)} km da parada anterior)`,
        address: s.address,
        accessNotes: 'Sessão gerada pelo motor de escala mensal automatizada.',
        transitTime: `${s.transitTimeMinutes} min de trânsito estimado`,
        transitTimeMinutes: s.transitTimeMinutes,
        transitKmFromPrevious: s.transitKmFromPrevious,
        durationMinutes: s.durationMinutes || 45,
        therapyType: s.therapyType
      }));

      onCommitScaleToAppointments(appointmentsToSave, scaleResult);
      setCommittedSuccess(true);
      setTimeout(() => setCommittedSuccess(false), 4000);
    }
  };

  // ----------------------------------------------------
  // GERAÇÃO DO CALENDÁRIO MENSAL EM FORMATO PDF
  // (Cada linha uma semana começando na Segunda e terminando no Domingo)
  // ----------------------------------------------------
  const calendarMonthData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthTitle = `${monthNames[month - 1]} de ${year}`;

    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Começa na Segunda-feira (1):
    // 0 = Domingo -> offset 6
    // 1 = Segunda -> offset 0
    // 2 = Terça   -> offset 1
    // 3 = Quarta  -> offset 2
    // 4 = Quinta  -> offset 3
    // 5 = Sexta   -> offset 4
    // 6 = Sábado  -> offset 5
    const startOffset = (firstDay.getDay() + 6) % 7;

    const weeks = [];
    let currentWeek = [];

    // Células vazias antes do dia 1
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push({ dayNumber: null, dateStr: null, isCurrentMonth: false });
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push({ dayNumber: day, dateStr, isCurrentMonth: true });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Completa a última semana até 7 dias (Domingo)
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ dayNumber: null, dateStr: null, isCurrentMonth: false });
      }
      weeks.push(currentWeek);
    }

    return { year, month, monthTitle, weeks };
  }, [selectedMonth]);

  // Sessões filtradas para o relatório PDF
  const pdfSessions = useMemo(() => {
    if (!scaleResult || !scaleResult.plannedSessions) return [];
    return scaleResult.plannedSessions.filter((s) => {
      if (pdfTargetType === 'patient') {
        return pdfSelectedPatientId ? s.patientId === pdfSelectedPatientId : true;
      }
      if (pdfTargetType === 'professional') {
        return pdfSelectedDoctorId ? s.professionalId === pdfSelectedDoctorId : true;
      }
      return true;
    });
  }, [scaleResult, pdfTargetType, pdfSelectedPatientId, pdfSelectedDoctorId]);

  const handleOpenPdfExport = () => {
    // Inicializa seleção padrão se não selecionado
    if (!pdfSelectedPatientId && patientsWithDemands.length > 0) {
      setPdfSelectedPatientId(patientsWithDemands[0].patientId);
    }
    if (!pdfSelectedDoctorId && professionalAvailabilities.length > 0) {
      setPdfSelectedDoctorId(professionalAvailabilities[0].professionalId);
    }
    setIsPdfExportModalOpen(true);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // Sessões filtradas para exibição no calendário
  const filteredSessions = useMemo(() => {
    if (!scaleResult) return [];
    return scaleResult.plannedSessions.filter((s) => {
      const matchDoc = selectedDoctorFilter === 'all' || s.professionalId === selectedDoctorFilter;
      const matchPat = selectedPatientFilter === 'all' || s.patientId === selectedPatientFilter;
      return matchDoc && matchPat;
    });
  }, [scaleResult, selectedDoctorFilter, selectedPatientFilter]);

  // Agrupamento por data para o calendário
  const sessionsByDate = useMemo(() => {
    const map = new Map();
    filteredSessions.forEach((s) => {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date).push(s);
    });
    return map;
  }, [filteredSessions]);

  const scaleDates = useMemo(() => {
    if (!scaleResult) return [];
    const dates = Array.from(new Set(scaleResult.plannedSessions.map((s) => s.date)));
    dates.sort();
    return dates;
  }, [scaleResult]);

  return (
    <div className="planner-container">
      {/* Header Principal */}
      <div className="planner-header">
        <div className="planner-title-group">
          <h1>
            <CalendarCheck size={26} color="#2563eb" />
            Planejador de Escala Mensal & Alocação de Equipe
          </h1>
          <p>
            Cruzamento automatizado: horários reais de jornada diária dos profissionais x até 3 demandas por paciente x travas de Care Team.
          </p>
        </div>

        <div className="planner-controls">
          <select
            className="select-month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              runGeneration();
            }}
          >
            <option value="2026-10">Outubro / 2026</option>
            <option value="2026-11">Novembro / 2026</option>
            <option value="2026-12">Dezembro / 2026</option>
            <option value="2027-01">Janeiro / 2027</option>
          </select>

          <button
            className="btn-generate-scale"
            onClick={() => runGeneration()}
            disabled={isGenerating}
          >
            <Sparkles size={18} />
            {isGenerating ? 'Calculando Escala...' : '⚡ Recalcular Escala Mensal'}
          </button>

          {/* Botão de Salvar Escala (Persistência Garantida) */}
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem', fontWeight: 700 }}
            onClick={handleSaveScaleExplicitly}
            title="Salva a escala e todos os parâmetros no navegador e envia diretamente para a Agenda e Rota do Dia"
          >
            <Save size={18} color="var(--primary)" />
            {saveExplicitSuccess ? '✓ Escala Salva & Sincronizada!' : '💾 Salvar Escala'}
          </button>

          {/* Botão de Exportar Escala em Formato PDF (Calendário Mensal) */}
          <button
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem', fontWeight: 700, background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
            onClick={handleOpenPdfExport}
            title="Exporta a escala do paciente ou profissional em formato de calendário mensal (PDF limpo e estético)"
          >
            <Printer size={18} color="#059669" />
            <span>📄 Exportar Escala em PDF</span>
          </button>

          {scaleResult && scaleResult.plannedSessions.length > 0 && (
            <button
              className="btn-commit-scale"
              onClick={handleCommitScale}
              title="Publica todas as sessões domiciliares na Agenda Oficial com tempos de deslocamento"
            >
              <CalendarDays size={18} />
              {committedSuccess ? 'Publicada na Agenda!' : '📅 Enviar para a Agenda'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso ao Salvar Explicitamente */}
      {saveExplicitSuccess && (
        <div style={{
          background: 'var(--primary-subtle)',
          border: '1px solid var(--primary-border)',
          color: 'var(--primary)',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} color="var(--primary)" />
          Escala mensal salva com sucesso e sincronizada com a Agenda e Rota do Dia! Você pode navegar pelo sistema ou sair da tela sem perder nenhuma alteração.
        </div>
      )}

      {/* Alerta de Sucesso ao Publicar */}
      {committedSuccess && (
        <div style={{
          background: 'var(--success-subtle)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} color="var(--success)" />
          Escala de {scaleResult?.monthLabel} gravada com sucesso! As sessões já estão disponíveis na aba "Agenda & Deslocamento".
        </div>
      )}

      {/* KPI Cards do Mês */}
      {scaleResult && scaleResult.summary && (
        <div className="planner-kpis">
          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-blue">
              <TrendingUp size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Taxa de Cobertura Global</div>
              <div className="kpi-value">{scaleResult.summary.globalCoveragePercent ?? 0}%</div>
              <div className="kpi-subtext">
                {scaleResult.summary.totalAllocatedSessions ?? 0} de {scaleResult.summary.totalDemandedSessions ?? 0} sessões atendidas
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-green">
              <CalendarDays size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Sessões Domiciliares Alocadas</div>
              <div className="kpi-value">{scaleResult.plannedSessions?.length ?? 0}</div>
              <div className="kpi-subtext">Distribuídas ao longo das semanas úteis</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-amber">
              <MapPin size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Deslocamento Urbano em Rota</div>
              <div className="kpi-value">{scaleResult.summary.totalEstimatedTransitKm ?? 0} km</div>
              <div className="kpi-subtext">~{scaleResult.summary.totalEstimatedTransitHours ?? 0}h de trânsito otimizado</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-purple">
              <ShieldCheck size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Regra de Ouro (Care Team)</div>
              <div className="kpi-value">100% Estrito</div>
              <div className="kpi-subtext">0% de alocações fora da equipe</div>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Direcionamento Operacional */}
      <div className={`planner-operational-banner ${activeTab === 'demands' ? 'tab-demands' : 'tab-calendar'}`}>
        <div className="planner-banner-content">
          <div className="planner-banner-badge">
            {activeTab === 'demands' ? '⚙️ ETAPA 1 (CONFIGURAÇÃO)' : '📅 ETAPA 2 (RESULTADO)'}
          </div>
          <div>
            <div className="planner-banner-title">
              {activeTab === 'demands'
                ? 'Definição de Horários dos Terapeutas & Demandas dos Pacientes'
                : 'Grade de Escala Mensal Gerada pelo Motor de Roteirização Urbana'}
            </div>
            <div className="planner-banner-desc">
              {activeTab === 'demands'
                ? 'Indique o horário de início e fim da jornada diária dos terapeutas (sem limite artificial de atendimentos) e até 3 demandas por paciente abaixo.'
                : 'Acompanhe as sessões agendadas dia a dia, horários exatos e tempos de trânsito calculados.'}
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary planner-banner-action-btn"
          onClick={() => setActiveTab(activeTab === 'demands' ? 'calendar' : 'demands')}
        >
          {activeTab === 'demands' ? 'Ver Grade Mensal Gerada ➡️' : '⬅️ Ajustar Horários & Demandas'}
        </button>
      </div>

      {/* Navegação de Abas do Módulo */}
      <div className="planner-tabs">
        <button
          className={`planner-tab-btn ${activeTab === 'demands' ? 'active' : ''}`}
          onClick={() => setActiveTab('demands')}
        >
          <Sliders size={18} />
          ⚙️ 1. Horários & Demandas (Entrada)
          <span className="tab-badge" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            {patientsWithDemands.length} pacientes | {professionalAvailabilities.length} terapeutas
          </span>
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarDays size={18} />
          📅 2. Grade Mensal de Sessões (Resultado)
          {scaleResult && (
            <span className="tab-badge">{scaleResult.plannedSessions.length}</span>
          )}
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => setActiveTab('coverage')}
        >
          <TrendingUp size={18} />
          📊 3. Metas Terapêuticas & Cobertura
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'bottlenecks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bottlenecks')}
        >
          <AlertTriangle size={18} />
          ⚠️ 4. Gargalos & Ações do Gestor
          {scaleResult?.bottlenecks?.length > 0 && (
            <span className="tab-badge badge-amber">{scaleResult.bottlenecks.length}</span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba 1: Calendário / Grade Mensal */}
      {activeTab === 'calendar' && (
        <div className="tab-content">
          <div className="calendar-view-header">
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-headline)' }}>
                Grade Distribuída: {scaleResult?.monthLabel}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Sessões sequenciais com tempos de trânsito e rotas calculadas.
              </p>
            </div>

            <div className="calendar-filters">
              <select
                className="filter-select"
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              >
                <option value="all">Todos os Profissionais</option>
                {professionalAvailabilities.map((p) => (
                  <option key={p.professionalId} value={p.professionalId}>
                    {p.professionalName} ({p.specialty.split(' ')[0]})
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={selectedPatientFilter}
                onChange={(e) => setSelectedPatientFilter(e.target.value)}
              >
                <option value="all">Todos os Pacientes</option>
                {patientsWithDemands.map((p) => (
                  <option key={p.patientId} value={p.patientId}>
                    {p.patientName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {scaleDates.length === 0 ? (
            <div className="empty-planner-state">
              <div className="empty-planner-icon">
                <CalendarDays size={32} />
              </div>
              <p>Nenhuma sessão alocada para os filtros selecionados.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {scaleDates.map((dateStr) => {
                const sessions = sessionsByDate.get(dateStr) || [];
                if (sessions.length === 0) return null;

                const dateObj = new Date(dateStr + 'T12:00:00Z');
                const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                const dayFormatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                return (
                  <div key={dateStr} style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'var(--bg-card)'
                  }}>
                    <div style={{
                      background: 'var(--bg-surface-hover)',
                      padding: '0.65rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--text-headline)',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        📅 {dayName}, {dayFormatted}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {sessions.length} atendimento(s) planejado(s)
                      </span>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.75rem',
                      padding: '0.85rem'
                    }}>
                      {sessions.map((session) => (
                        <div key={session.id} className="session-card therapy-fisio">
                          <div className="session-time">
                            <Clock size={14} color="var(--primary)" />
                            {session.time} ({session.durationMinutes} min)
                            {session.isFixed && (
                              <span style={{
                                marginLeft: '0.45rem',
                                background: 'var(--primary-subtle)',
                                color: 'var(--primary)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Lock size={10} />
                                Fixado
                              </span>
                            )}
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Semana {session.weekNumber}
                            </span>
                          </div>
                          <div className="session-patient">
                            {session.patientName}
                          </div>
                          <div className="session-therapist">
                            🧑‍⚕️ {session.professionalName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            🏥 {session.therapyType}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            📍 {session.address}
                          </div>
                          {session.transitKmFromPrevious > 0 && (
                            <div className="session-transit">
                              🚗 {session.transitKmFromPrevious.toFixed(1)} km (~{session.transitTimeMinutes} min) da parada anterior
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Metas Terapêuticas & Cobertura */}
      {activeTab === 'coverage' && (
        <div className="tab-content">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-headline)' }}>
              Taxa de Atendimento das Metas Terapêuticas
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Acompanhamento de conformidade entre a prescrição semanal e o volume de sessões alocadas no mês.
            </p>
          </div>

          <table className="coverage-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Terapia Prescrita</th>
                <th>Meta Semanal</th>
                <th>Demanda Mensal</th>
                <th>Sessões Alocadas</th>
                <th>% Cobertura</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scaleResult?.coverageReports.map((report, idx) => {
                const fillClass =
                  report.coveragePercent >= 100
                    ? 'progress-fill-green'
                    : report.coveragePercent >= 60
                    ? 'progress-fill-amber'
                    : 'progress-fill-red';

                return (
                  <tr key={`${report.patientId}-${idx}`}>
                    <td style={{ fontWeight: 600 }}>{report.patientName}</td>
                    <td>{report.therapyType}</td>
                    <td>{report.weeklyTarget}x / semana</td>
                    <td>{report.demandedMonthlySessions} sessões</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {report.allocatedMonthlySessions} sessões
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, minWidth: '40px' }}>
                          {report.coveragePercent}%
                        </span>
                        <div className="progress-bar-container">
                          <div
                            className={`progress-bar-fill ${fillClass}`}
                            style={{ width: `${Math.min(report.coveragePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {report.status === 'FULL_COVERAGE' && (
                        <span style={{
                          background: 'var(--success-subtle)',
                          color: 'var(--success)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          100% Atendido
                        </span>
                      )}
                      {report.status === 'PARTIAL_COVERAGE' && (
                        <span style={{
                          background: 'var(--warning-subtle)',
                          color: 'var(--warning)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          Parcial
                        </span>
                      )}
                      {report.status === 'CRITICAL_DEFICIT' && (
                        <span style={{
                          background: 'var(--danger-subtle)',
                          color: 'var(--danger)',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          Déficit Crítico
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Conteúdo da Aba 3: Gargalos & Ações do Gestor */}
      {activeTab === 'bottlenecks' && (
        <div className="tab-content">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: 'var(--text-headline)' }}>
              Diagnóstico de Gargalos & Otimizações do Gestor
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Demandas que não puderam ser 100% preenchidas por restrição de equipe ou capacidade de agenda.
            </p>
          </div>

          {(!scaleResult?.bottlenecks || scaleResult.bottlenecks.length === 0) ? (
            <div style={{
              background: 'var(--success-subtle)',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'var(--success)'
            }}>
              <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-headline)' }}>Escala Sem Gargalos!</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-body)' }}>
                Todas as metas terapêuticas do mês foram 100% alocadas dentro das janelas de horário e Care Team.
              </p>
            </div>
          ) : (
            <div>
              {scaleResult.bottlenecks.map((b, idx) => (
                <div
                  key={idx}
                  className={`bottleneck-card ${b.reason === 'NO_CARE_TEAM_SPECIALIST' ? 'critical' : ''}`}
                >
                  <div className="bottleneck-title">
                    <AlertTriangle size={18} />
                    {b.patientName} — Déficit de {b.missingSessions} sessão(ões) na Semana {b.weekNumber} ({b.therapyType})
                  </div>
                  <div className="bottleneck-desc">
                    {b.reason === 'NO_CARE_TEAM_SPECIALIST' && (
                      <strong>Motivo: Nenhum profissional com especialidade em {b.therapyType} está cadastrado na Equipe de Cuidado autorizada deste paciente.</strong>
                    )}
                    {b.reason === 'PROFESSIONAL_CAPACITY_EXCEEDED' && (
                      <span>Motivo: As janelas de horário de trabalho dos terapeutas autorizados não comportam mais atendimentos nos dias/turnos solicitados.</span>
                    )}
                  </div>
                  <div className="bottleneck-solution">
                    <Info size={16} />
                    <strong>Ação Recomendada:</strong> {b.suggestedAction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 4: GERENCIAR HORÁRIOS DOS TERAPEUTAS & DEMANDAS DOS PACIENTES */}
      {activeTab === 'demands' && (
        <div className="tab-content">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: 'var(--text-headline)' }}>
                Parâmetros Reais: Janelas de Horário Diárias & Múltiplas Terapias
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Profissionais com horário de início e fim variável por dia (sem limite artificial de atendimentos) e pacientes com até 3 demandas terapêuticas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => setIsAddPatientFromBaseModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Users size={16} />
                Adicionar Paciente da Base à Escala
              </button>

              <button
                className="btn-primary"
                onClick={() => {
                  setTherapistModalTab('with-account');
                  setIsTherapistManagementModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  background: 'var(--success)'
                }}
              >
                <UserPlus size={16} />
                Fisioterapeutas & Terapeutas na Escala
              </button>
            </div>
          </div>

          {/* Seção 1: Profissionais de Saúde com Janelas de Horário por Dia da Semana */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontWeight: 700,
              color: 'var(--text-headline)',
              fontSize: '1rem'
            }}>
              <Stethoscope size={20} color="var(--success)" />
              Equipe de Profissionais — Janelas de Horário Diárias ({professionalAvailabilities.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {professionalAvailabilities.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-light)',
                  borderRadius: '12px',
                  padding: '2.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Stethoscope size={36} color="var(--success)" />
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Nenhum fisioterapeuta configurado para a escala</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
                    Busque profissionais que já possuem conta no site ou crie novos fisioterapeutas sem conta para compor a grade mensal.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', fontSize: '0.82rem', background: 'var(--success)' }}
                    onClick={() => {
                      setTherapistModalTab('with-account');
                      setIsTherapistManagementModalOpen(true);
                    }}
                  >
                    <UserPlus size={15} /> Adicionar Fisioterapeuta na Escala
                  </button>
                </div>
              ) : (
                professionalAvailabilities.map((prof) => (
                <div key={prof.professionalId} style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  background: 'var(--bg-card)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-headline)', fontSize: '1rem' }}>
                        {prof.professionalName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600, marginTop: '0.2rem' }}>
                        🩺 {prof.specialty}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        📍 Base de Partida: {prof.baseLocation.latitude.toFixed(4)}, {prof.baseLocation.longitude.toFixed(4)}
                      </div>
                    </div>

                    <button
                      className="btn-danger-icon"
                      title="Remover Profissional"
                      onClick={() => handleDeleteProfessional(prof.professionalId)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Janelas de Horário Diárias (Segunda a Sexta) */}
                  <div style={{ fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-headline)', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Horário de Jornada por Dia da Semana:</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>Capacidade: O que couber na janela</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[1, 2, 3, 4, 5].map((dayNum) => {
                        const win = prof.weekdayWindows?.[dayNum] || { enabled: false, startTime: '08:00', endTime: '18:00' };
                        return (
                          <div key={dayNum} className={`time-window-row ${!win.enabled ? 'disabled' : ''}`}>
                            <label className="day-check-label">
                              <input
                                type="checkbox"
                                checked={win.enabled}
                                onChange={() => handleToggleDayEnabled(prof.professionalId, dayNum)}
                              />
                              {WEEKDAY_SHORT[dayNum]}
                            </label>

                            {win.enabled ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <div className="time-range-inputs">
                                  <span>das</span>
                                  <input
                                    type="time"
                                    className="time-input-compact"
                                    value={win.startTime}
                                    onChange={(e) => handleUpdateDayTime(prof.professionalId, dayNum, 'startTime', e.target.value)}
                                  />
                                  <span>às</span>
                                  <input
                                    type="time"
                                    className="time-input-compact"
                                    value={win.endTime}
                                    onChange={(e) => handleUpdateDayTime(prof.professionalId, dayNum, 'endTime', e.target.value)}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '0.2rem' }}>
                                  <button
                                    type="button"
                                    className="preset-btn"
                                    title="08:00 às 13:00"
                                    onClick={() => handleApplyTimePreset(prof.professionalId, dayNum, '08:00', '13:00')}
                                  >
                                    08h-13h
                                  </button>
                                  <button
                                    type="button"
                                    className="preset-btn"
                                    title="13:00 às 18:00"
                                    onClick={() => handleApplyTimePreset(prof.professionalId, dayNum, '13:00', '18:00')}
                                  >
                                    13h-18h
                                  </button>
                                  <button
                                    type="button"
                                    className="preset-btn"
                                    title="08:00 às 18:00"
                                    onClick={() => handleApplyTimePreset(prof.professionalId, dayNum, '08:00', '18:00')}
                                  >
                                    08h-18h
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Indisponível (Outros compromissos/pacientes externos)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seção de Bloqueios de Indisponibilidade do Terapeuta */}
                  <div className="unavailability-section">
                    <div className="unavailability-header">
                      <span className="unavailability-title">
                        <Ban size={13} color="#d97706" />
                        Bloqueios de Horário / Indisponibilidades ({prof.unavailabilityBlocks?.length || 0})
                      </span>
                      <button
                        type="button"
                        className="btn-add-block"
                        onClick={() => setAddBlockModalState({
                          isOpen: true,
                          targetType: 'professional',
                          targetId: prof.professionalId,
                          targetName: prof.professionalName,
                          dayOfWeek: 2,
                          startTime: '09:00',
                          endTime: '10:30',
                          reason: 'Paciente particular externo'
                        })}
                      >
                        Bloquear Horário
                      </button>
                    </div>

                    {(!prof.unavailabilityBlocks || prof.unavailabilityBlocks.length === 0) ? (
                      <div className="unavailability-empty">
                        Nenhum bloqueio cadastrado (disponibilidade livre na jornada).
                      </div>
                    ) : (
                      <div className="unavailability-list">
                        {prof.unavailabilityBlocks.map((b) => (
                          <div key={b.id} className={getBlockChipClass(b, 'unavailability-chip')}>
                            <span className="unavailability-day">{formatBlockLabel(b)}</span>
                            <span className="unavailability-time">{b.startTime} - {b.endTime}</span>
                            {b.reason && <span className="unavailability-reason">({b.reason})</span>}
                            <button
                              type="button"
                              className="btn-remove-block"
                              title="Remover bloqueio"
                              onClick={() => handleRemoveTherapistBlock(prof.professionalId, b.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* Seção 2: Atendimentos Fixados / Travados na Grade */}
          <div className="fixed-appointments-section">
            <div className="fixed-appointments-header">
              <div>
                <div className="fixed-appointments-title">
                  <Lock size={18} color="#4338ca" />
                  Atendimentos Fixados / Travados na Grade ({fixedAppointments.length})
                </div>
                <p className="fixed-appointments-desc">
                  Atendimentos prioritários pré-estabelecidos (ex: terças-feiras às 09:00 com terapeuta fixado). O motor aloca esses horários primeiro, reserva a agenda e deduz da meta semanal do paciente.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-fixed"
                onClick={() => setFixedAppointmentModalState({
                  isOpen: true,
                  patientId: patientsWithDemands[0]?.patientId || '',
                  professionalId: professionalAvailabilities[0]?.professionalId || '',
                  therapyType: patientsWithDemands[0]?.demands[0]?.therapyType || 'Fisioterapia Cardiorrespiratória & Motora',
                  recurrenceType: 'weekly',
                  dayOfWeek: 2,
                  dateStr: '',
                  time: '09:00',
                  durationMinutes: 45,
                  notes: 'Atendimento fixo pré-estabelecido'
                })}
              >
                <Plus size={15} />
                Fixar Atendimento
              </button>
            </div>

            {fixedAppointments.length === 0 ? (
              <div className="fixed-empty-state">
                Nenhum atendimento fixado cadastrado. Todos os atendimentos serão roteirizados de forma dinâmica pelo motor.
              </div>
            ) : (
              <div className="fixed-appointments-grid">
                {fixedAppointments.map((fix) => (
                  <div key={fix.id} className="fixed-appointment-card">
                    <div className="fixed-card-header">
                      <span className="fixed-time-badge">
                        <Lock size={12} />
                        {fix.recurrenceType === 'date'
                          ? `Data: ${fix.dateStr.split('-')[2]}/${fix.dateStr.split('-')[1]} às ${fix.time}`
                          : `Toda ${WEEKDAY_SHORT[fix.dayOfWeek]} às ${fix.time}`} ({fix.durationMinutes} min)
                      </span>
                      <button
                        type="button"
                        className="fixed-card-delete"
                        title="Desfixar / Remover Atendimento"
                        onClick={() => handleRemoveFixedAppointment(fix.id)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="fixed-card-patient">
                      👤 {fix.patientName}
                    </div>
                    <div className="fixed-card-therapist">
                      🧑‍⚕️ {fix.professionalName}
                    </div>
                    <div className="fixed-card-therapy">
                      🏥 {fix.therapyType}
                    </div>
                    {fix.notes && (
                      <div className="fixed-card-notes">
                        📌 {fix.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 3: Pacientes com ATÉ 3 DEMANDAS TERAPÊUTICAS CADA */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontWeight: 700,
              color: 'var(--text-headline)',
              fontSize: '1rem'
            }}>
              <Users size={20} color="var(--primary)" />
              Pacientes & Demandas Terapêuticas (Até 3 por Paciente) ({patientsWithDemands.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {patientsWithDemands.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  background: 'var(--bg-card)',
                  border: '1px dashed var(--border-light)',
                  borderRadius: '12px',
                  padding: '2.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Users size={36} color="var(--primary)" />
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Nenhum paciente adicionado à escala deste mês</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
                    Adicione pacientes já cadastrados na clínica para compor a grade mensal com suas demandas terapêuticas e rotas domiciliares.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
                    onClick={() => setIsAddPatientFromBaseModalOpen(true)}
                  >
                    <Users size={15} /> Adicionar Paciente da Base à Escala
                  </button>
                </div>
              ) : (
                patientsWithDemands.map((patient) => {
                const patientCareTeam = careTeams.find((ct) => ct.patientId === patient.patientId) || { professionalIds: [] };

                return (
                  <div key={patient.patientId} style={{
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: 'var(--bg-card)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-headline)', fontSize: '1rem' }}>
                            {patient.patientName}
                          </span>
                          <span className="demand-counter-badge">
                            {patient.demands.length} {patient.demands.length === 1 ? 'Terapia' : 'Terapias'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          📍 {patient.address}
                        </div>
                      </div>

                      <button
                        className="btn-danger-icon"
                        title="Remover da Escala Deste Mês"
                        onClick={() => handleRemovePatientFromScale(patient.patientId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Lista das demandas cadastradas deste paciente (Exibição apenas) */}
                    <div className="patient-demands-container">
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>📋 Demandas Terapêuticas do Cadastro ({patient.demands.length}):</span>
                        {onNavigateToPatientsView && (
                          <button
                            type="button"
                            onClick={onNavigateToPatientsView}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            Editar no Cadastro ↗
                          </button>
                        )}
                      </div>

                      {patient.demands.map((demand, idx) => (
                        <div key={demand.id || idx} className="single-demand-card" style={{ background: 'var(--bg-surface-hover)' }}>
                          <div className="single-demand-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                              <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.75rem' }}>
                                #{idx + 1}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-headline)' }}>
                                {demand.therapyType}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              background: 'var(--primary-subtle)',
                              color: 'var(--primary)'
                            }}>
                              {demand.sessionsPerWeek}x / semana
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            color: 'var(--text-body)',
                            marginTop: '0.35rem'
                          }}>
                            <span>Frequência: <strong>{demand.sessionsPerWeek}x / semana</strong></span>
                            <span>Duração: <strong>{demand.durationMinutes || 45} min</strong></span>
                          </div>

                          {demand.availableWindows && (
                            <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {Object.entries(demand.availableWindows)
                                .filter(([_, win]) => win.enabled)
                                .map(([dNum, win]) => (
                                  <span
                                    key={dNum}
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'var(--primary-subtle)',
                                      color: 'var(--primary)',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    <Clock size={10} />
                                    {WEEKDAY_SHORT[dNum]}: {win.startTime}-{win.endTime}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}

                      <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        marginTop: '0.15rem'
                      }}>
                        💡 Demandas configuradas no cadastro do paciente.
                      </div>
                    </div>

                    {/* Vínculo de Care Team Interativo */}
                    <div style={{
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '0.65rem',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-headline)', marginBottom: '0.4rem' }}>
                        Equipe Autorizada (Care Team) — Clique para alternar:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {professionalAvailabilities.map((prof) => {
                          const isMember = patientCareTeam.professionalIds.includes(prof.professionalId);
                          return (
                            <button
                              key={prof.professionalId}
                              className={`careteam-select-pill ${isMember ? 'active' : ''}`}
                              onClick={() => handleToggleCareTeamMember(patient.patientId, prof.professionalId)}
                              title={isMember ? 'Remover do Care Team' : 'Adicionar ao Care Team'}
                            >
                              {isMember ? <CheckCircle2 size={12} color="#2563eb" /> : <Plus size={12} />}
                              {prof.professionalName.split(' ')[0]} {prof.professionalName.split(' ')[1] || ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Seção de Bloqueios de Indisponibilidade do Paciente */}
                    <div className="unavailability-section">
                      <div className="unavailability-header">
                        <span className="unavailability-title title-patient">
                          <Ban size={13} color="#ea580c" />
                          Bloqueios de Horário do Paciente ({patient.unavailabilityBlocks?.length || 0})
                        </span>
                        <button
                          type="button"
                          className="btn-add-block"
                          onClick={() => setAddBlockModalState({
                            isOpen: true,
                            targetType: 'patient',
                            targetId: patient.patientId,
                            targetName: patient.patientName,
                            dayOfWeek: 3,
                            startTime: '10:00',
                            endTime: '12:00',
                            reason: 'Consulta médica externa'
                          })}
                        >
                          Bloquear Horário
                        </button>
                      </div>

                      {(!patient.unavailabilityBlocks || patient.unavailabilityBlocks.length === 0) ? (
                        <div className="unavailability-empty">
                          Nenhum bloqueio cadastrado (disponível para terapias).
                        </div>
                      ) : (
                        <div className="unavailability-list">
                          {patient.unavailabilityBlocks.map((b) => (
                            <div key={b.id} className={getBlockChipClass(b, 'unavailability-chip chip-patient')}>
                              <span className="unavailability-day">{formatBlockLabel(b)}</span>
                              <span className="unavailability-time">{b.startTime} - {b.endTime}</span>
                              {b.reason && <span className="unavailability-reason">({b.reason})</span>}
                              <button
                                type="button"
                                className="btn-remove-block"
                                title="Remover bloqueio"
                                onClick={() => handleRemovePatientBlock(patient.patientId, b.id)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Adicionar Paciente Cadastrado na Base à Escala Mensal */}
      {isAddPatientFromBaseModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsAddPatientFromBaseModalOpen(false)}>
          <div className="planner-modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Users size={20} color="#2563eb" />
                Adicionar Paciente da Base à Escala Mensal
              </h3>
              <button className="modal-close-btn" onClick={() => setIsAddPatientFromBaseModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{
                background: 'var(--primary-subtle)',
                border: '1px solid var(--primary-border)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--text-headline)',
                marginBottom: '1rem'
              }}>
                💡 O planejador utiliza os pacientes já cadastrados na tela de <strong>Pacientes</strong> e importa automaticamente as demandas terapêuticas definidas no perfil de cada um.
              </div>

              <div className="form-group">
                <label>Buscar Paciente Cadastrado:</label>
                <input
                  type="text"
                  className="planner-input"
                  placeholder="Filtrar por nome, CPF ou endereço..."
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                {patients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem' }}>
                      Nenhum paciente cadastrado no sistema ainda.
                    </p>
                    {onNavigateToPatientsView && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setIsAddPatientFromBaseModalOpen(false);
                          onNavigateToPatientsView();
                        }}
                      >
                        Ir para Cadastro de Pacientes ➡️
                      </button>
                    )}
                  </div>
                ) : (
                  patients
                    .filter((p) => {
                      const term = patientSearchTerm.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(term) ||
                        (p.cpf && p.cpf.includes(term)) ||
                        (p.address && p.address.toLowerCase().includes(term))
                      );
                    })
                    .map((pat) => {
                      const isAlreadyInScale = patientsWithDemands.some((p) => p.patientId === pat.id);
                      const patDemands = pat.demands && pat.demands.length > 0 ? pat.demands : [];

                      return (
                        <div
                          key={pat.id}
                          style={{
                            border: `1px solid ${isAlreadyInScale ? 'var(--border-light)' : 'var(--primary-border)'}`,
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            background: isAlreadyInScale ? 'var(--bg-surface-hover)' : 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-headline)' }}>
                              {pat.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              📍 {pat.address || 'Endereço em rota domiciliar'}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: 'var(--primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                              {patDemands.length > 0 ? (
                                `🩺 ${patDemands.map((d) => `${d.therapyType} (${d.sessionsPerWeek}x/sem)`).join(' • ')}`
                              ) : (
                                '⚠️ Sem demandas cadastradas (será aplicada demanda padrão)'
                              )}
                            </div>
                          </div>

                          {isAlreadyInScale ? (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              background: 'var(--success-subtle)',
                              color: 'var(--success)'
                            }}>
                              ✓ Na Escala
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
                              onClick={() => handleAddPatientFromBase(pat)}
                            >
                              + Incluir na Escala
                            </button>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAddPatientFromBaseModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Fisioterapeutas & Terapeutas na Escala (Com Conta ou Sem Conta) */}
      {isTherapistManagementModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsTherapistManagementModalOpen(false)}>
          <div className="planner-modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserPlus size={20} color="#059669" />
                Fisioterapeutas & Terapeutas na Escala
              </h3>
              <button className="modal-close-btn" onClick={() => setIsTherapistManagementModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Abas do Modal */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', padding: '0 1.25rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'none',
                  fontWeight: therapistModalTab === 'with-account' ? 700 : 500,
                  color: therapistModalTab === 'with-account' ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: therapistModalTab === 'with-account' ? '2px solid var(--primary)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => setTherapistModalTab('with-account')}
              >
                Buscar Profissionais com Conta no Site ({doctors.filter((d) => d.hasAccount !== false).length})
              </button>
              <button
                type="button"
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: 'none',
                  fontWeight: therapistModalTab === 'without-account' ? 700 : 500,
                  color: therapistModalTab === 'without-account' ? 'var(--success)' : 'var(--text-muted)',
                  borderBottom: therapistModalTab === 'without-account' ? '2px solid var(--success)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => setTherapistModalTab('without-account')}
              >
                + Cadastrar Fisioterapeuta Sem Conta
              </button>
            </div>

            {/* ABA 1: Profissionais com Conta */}
            {therapistModalTab === 'with-account' && (
              <div className="modal-body">
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Selecione fisioterapeutas e profissionais que já criaram conta ou estão cadastrados na clínica para compor a grade da escala:
                </p>

                <div style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {doctors.filter((d) => d.hasAccount !== false).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Nenhum profissional com conta registrado no site ainda. Crie um fisioterapeuta sem conta na aba ao lado ou registre na tela de login.
                    </div>
                  ) : (
                    doctors
                      .filter((d) => d.hasAccount !== false)
                      .map((doc) => {
                        const isAlreadyInScale = professionalAvailabilities.some((p) => p.professionalId === doc.id);

                        return (
                          <div
                            key={doc.id}
                            style={{
                              border: `1px solid ${isAlreadyInScale ? 'var(--border-light)' : 'var(--primary-border)'}`,
                              borderRadius: '8px',
                              padding: '0.75rem 1rem',
                              background: isAlreadyInScale ? 'var(--bg-surface-hover)' : 'var(--bg-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-headline)' }}>
                                {doc.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.15rem' }}>
                                🩺 {doc.specialty || doc.profession || 'Fisioterapia'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                📍 Base: {doc.baseAddress || 'São Paulo - SP'}
                              </div>
                            </div>

                            {isAlreadyInScale ? (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '12px',
                                background: 'var(--success-subtle)',
                                color: 'var(--success)'
                              }}>
                                ✓ Na Escala
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap' }}
                                onClick={() => handleAddDoctorWithAccountToScale(doc)}
                              >
                                + Incluir na Escala
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>

                <div className="modal-footer" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsTherapistManagementModalOpen(false)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* ABA 2: Cadastrar Fisioterapeuta Sem Conta */}
            {therapistModalTab === 'without-account' && (
              <form onSubmit={handleCreateTherapistWithoutAccount}>
                <div className="modal-body">
                  <div style={{
                    background: 'rgba(5, 150, 105, 0.08)',
                    border: '1px solid rgba(5, 150, 105, 0.25)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-headline)',
                    marginBottom: '1rem'
                  }}>
                    ✨ <strong>Fisioterapeuta Sem Conta:</strong> Cadastre um profissional para atuar na grade de escala sem necessidade de criar usuário ou login no site. Ele também ficará disponível para seleção no Care Team do cadastro de pacientes.
                  </div>

                  <div className="form-group">
                    <label>Nome Completo do Fisioterapeuta / Terapeuta *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Lucas Mendes"
                      className="planner-input"
                      value={newTherapistForm.professionalName}
                      onChange={(e) => setNewTherapistForm({ ...newTherapistForm, professionalName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Especialidades de Atuação (Selecione de 1 até 3): *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem', marginTop: '0.25rem' }}>
                      {CLINICAL_SPECIALTY_OPTIONS.map((opt) => {
                        const isChecked = (newTherapistForm.specialties || []).includes(opt);
                        return (
                          <label
                            key={opt}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                              background: isChecked ? 'var(--primary-subtle)' : 'var(--bg-card)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: isChecked ? 600 : 400,
                              color: isChecked ? 'var(--primary)' : 'var(--text-body)'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleNewTherapistSpecialty(opt)}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ponto Base de Partida (Endereço ou CEP da Base de Saída)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input
                        type="text"
                        className="planner-input"
                        placeholder="Ex: Av. Paulista, 1500 ou CEP 01310-100..."
                        value={newTherapistForm.baseAddress}
                        onChange={(e) => setNewTherapistForm({ ...newTherapistForm, baseAddress: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleGeocodeNewTherapistAddress();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={handleGeocodeNewTherapistAddress}
                        disabled={newTherapistForm.isGeocoding}
                      >
                        {newTherapistForm.isGeocoding ? 'Buscando...' : '🔍 Localizar no Mapa'}
                      </button>
                    </div>

                    {/* Mini-mapa OpenStreetMap com key reativa */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        marginTop: '0.5rem'
                      }}
                    >
                      <iframe
                        key={`${newTherapistForm.baseCoordinates.latitude.toFixed(5)}-${newTherapistForm.baseCoordinates.longitude.toFixed(5)}`}
                        title="Mapa Ponto de Partida Terapeuta"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${newTherapistForm.baseCoordinates.longitude - 0.008}%2C${newTherapistForm.baseCoordinates.latitude - 0.006}%2C${newTherapistForm.baseCoordinates.longitude + 0.008}%2C${newTherapistForm.baseCoordinates.latitude + 0.006}&layer=mapnik&marker=${newTherapistForm.baseCoordinates.latitude}%2C${newTherapistForm.baseCoordinates.longitude}`}
                      />
                    </div>
                  </div>

                  {/* Janela de Horário Diária (Segunda a Sexta) */}
                  <div className="form-group">
                    <label>Jornada Diária por Dia da Semana (Horário de Início e Fim):</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[1, 2, 3, 4, 5].map((dayNum) => {
                        const win = newTherapistForm.weekdayWindows[dayNum];
                        return (
                          <div key={dayNum} className={`time-window-row ${!win.enabled ? 'disabled' : ''}`}>
                            <label className="day-check-label">
                              <input
                                type="checkbox"
                                checked={win.enabled}
                                onChange={() => {
                                  setNewTherapistForm({
                                    ...newTherapistForm,
                                    weekdayWindows: {
                                      ...newTherapistForm.weekdayWindows,
                                      [dayNum]: { ...win, enabled: !win.enabled }
                                    }
                                  });
                                }}
                              />
                              {WEEKDAY_NAMES[dayNum]}
                            </label>

                            {win.enabled ? (
                              <div className="time-range-inputs">
                                <span>das</span>
                                <input
                                  type="time"
                                  className="time-input-compact"
                                  value={win.startTime}
                                  onChange={(e) => {
                                    setNewTherapistForm({
                                      ...newTherapistForm,
                                      weekdayWindows: {
                                        ...newTherapistForm.weekdayWindows,
                                        [dayNum]: { ...win, startTime: e.target.value }
                                      }
                                    });
                                  }}
                                />
                                <span>às</span>
                                <input
                                  type="time"
                                  className="time-input-compact"
                                  value={win.endTime}
                                  onChange={(e) => {
                                    setNewTherapistForm({
                                      ...newTherapistForm,
                                      weekdayWindows: {
                                        ...newTherapistForm.weekdayWindows,
                                        [dayNum]: { ...win, endTime: e.target.value }
                                      }
                                    });
                                  }}
                                />
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Folga / Outros pacientes externos
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Vincular Imediatamente aos Pacientes no Care Team:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {patientsWithDemands.map((pat) => {
                        const isSelected = newTherapistForm.assignedPatientIds.includes(pat.patientId);
                        return (
                          <label
                            key={pat.patientId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const nextIds = e.target.checked
                                  ? [...newTherapistForm.assignedPatientIds, pat.patientId]
                                  : newTherapistForm.assignedPatientIds.filter((id) => id !== pat.patientId);
                                setNewTherapistForm({ ...newTherapistForm, assignedPatientIds: nextIds });
                              }}
                            />
                            {pat.patientName} ({pat.demands.map((d) => d.therapyType).join(', ')})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsTherapistManagementModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: '#059669', fontWeight: 700 }}
                  >
                    Salvar Fisioterapeuta Sem Conta & Recalcular
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Editar Dados Básicos do Paciente (Nome e Bairro/Região) */}
      {editPatientModalState.isOpen && (
        <div className="planner-modal-backdrop" onClick={() => setEditPatientModalState({ ...editPatientModalState, isOpen: false })}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Users size={20} color="#2563eb" />
                Editar Dados do Paciente
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setEditPatientModalState({ ...editPatientModalState, isOpen: false })}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditPatient}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Paciente *</label>
                  <input
                    type="text"
                    required
                    className="planner-input"
                    value={editPatientModalState.patientName}
                    onChange={(e) => setEditPatientModalState({ ...editPatientModalState, patientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Região / Bairro do Domicílio *</label>
                  <select
                    className="planner-select"
                    value={editPatientModalState.neighborhood}
                    onChange={(e) => setEditPatientModalState({ ...editPatientModalState, neighborhood: e.target.value })}
                  >
                    {Object.keys(SP_PRESET_LOCATIONS).map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <small style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    A rota será recalculada automaticamente para este bairro.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditPatientModalState({ ...editPatientModalState, isOpen: false })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Alterações & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Adicionar Bloco de Indisponibilidade / Bloqueio de Horário */}
      {addBlockModalState.isOpen && (
        <div className="planner-modal-backdrop" onClick={() => setAddBlockModalState({ ...addBlockModalState, isOpen: false })}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Ban size={20} color="#d97706" />
                Bloquear Horário — {addBlockModalState.targetName}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setAddBlockModalState({ ...addBlockModalState, isOpen: false })}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBlock}>
              <div className="modal-body">
                <div style={{ fontSize: '0.82rem', color: 'var(--warning)', marginBottom: '0.75rem', background: 'var(--warning-subtle)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--warning-border)' }}>
                  {addBlockModalState.targetType === 'professional'
                    ? `Durante este intervalo, o profissional ${addBlockModalState.targetName} não poderá receber atendimentos da clínica (ex: compromissos pessoais, pacientes particulares externos).`
                    : `Durante este intervalo, nenhuma sessão domiciliar será agendada para ${addBlockModalState.targetName} (ex: consultas médicas externas, exames laboratoriais, diálise).`}
                </div>

                <div className="form-group">
                  <label>Tipo de Bloqueio *</label>
                  <select
                    className="planner-select"
                    value={addBlockModalState.blockType}
                    onChange={(e) => setAddBlockModalState({ ...addBlockModalState, blockType: e.target.value })}
                  >
                    <option value="weekly">Recorrente Semanal (Toda semana em um dia fixo)</option>
                    <option value="date">Dia Específico do Mês (Data pontual)</option>
                    <option value="range">Intervalo de Datas (Data/Hora Início até Data/Hora Fim)</option>
                  </select>
                </div>

                {addBlockModalState.blockType === 'weekly' && (
                  <div className="form-group">
                    <label>Dia da Semana *</label>
                    <select
                      className="planner-select"
                      value={addBlockModalState.dayOfWeek}
                      onChange={(e) => setAddBlockModalState({ ...addBlockModalState, dayOfWeek: Number(e.target.value) })}
                    >
                      <option value={1}>Segunda-feira</option>
                      <option value={2}>Terça-feira</option>
                      <option value={3}>Quarta-feira</option>
                      <option value={4}>Quinta-feira</option>
                      <option value={5}>Sexta-feira</option>
                    </select>
                  </div>
                )}

                {addBlockModalState.blockType === 'date' && (
                  <div className="form-group">
                    <label>Data do Bloqueio *</label>
                    <input
                      type="date"
                      required
                      className="planner-input"
                      value={addBlockModalState.dateStr}
                      onChange={(e) => setAddBlockModalState({ ...addBlockModalState, dateStr: e.target.value })}
                    />
                  </div>
                )}

                {addBlockModalState.blockType === 'range' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Data Inicial *</label>
                      <input
                        type="date"
                        required
                        className="planner-input"
                        value={addBlockModalState.dateStr}
                        onChange={(e) => setAddBlockModalState({ ...addBlockModalState, dateStr: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Data Final *</label>
                      <input
                        type="date"
                        required
                        className="planner-input"
                        value={addBlockModalState.endDateStr}
                        onChange={(e) => setAddBlockModalState({ ...addBlockModalState, endDateStr: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Horário de Início *</label>
                    <input
                      type="time"
                      required
                      className="planner-input"
                      value={addBlockModalState.startTime}
                      onChange={(e) => setAddBlockModalState({ ...addBlockModalState, startTime: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Horário de Término *</label>
                    <input
                      type="time"
                      required
                      className="planner-input"
                      value={addBlockModalState.endTime}
                      onChange={(e) => setAddBlockModalState({ ...addBlockModalState, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Motivo do Bloqueio *</label>
                  <input
                    type="text"
                    required
                    placeholder={addBlockModalState.targetType === 'professional' ? 'Ex: Paciente particular externo' : 'Ex: Consulta médica externa'}
                    className="planner-input"
                    value={addBlockModalState.reason}
                    onChange={(e) => setAddBlockModalState({ ...addBlockModalState, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddBlockModalState({ ...addBlockModalState, isOpen: false })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--warning)' }}>
                  Confirmar Bloqueio & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Fixar Atendimento na Grade (Prioridade Máxima) */}
      {fixedAppointmentModalState.isOpen && (
        <div className="planner-modal-backdrop" onClick={() => setFixedAppointmentModalState({ ...fixedAppointmentModalState, isOpen: false })}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Lock size={20} color="#4f46e5" />
                Fixar Atendimento Prioritário na Grade
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setFixedAppointmentModalState({ ...fixedAppointmentModalState, isOpen: false })}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddFixedAppointment}>
              <div className="modal-body">
                <div style={{ fontSize: '0.82rem', color: 'var(--info)', marginBottom: '0.75rem', background: 'var(--info-subtle)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--info-border)' }}>
                  Atendimentos fixados são alocados em 1º lugar com horário travado. Eles reservam a agenda do profissional e do paciente e deduzem automaticamente da meta semanal solicitada.
                </div>

                <div className="form-group">
                  <label>Paciente *</label>
                  <select
                    className="planner-select"
                    value={fixedAppointmentModalState.patientId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const pat = patientsWithDemands.find((p) => p.patientId === pid);
                      setFixedAppointmentModalState({
                        ...fixedAppointmentModalState,
                        patientId: pid,
                        therapyType: pat?.demands[0]?.therapyType || fixedAppointmentModalState.therapyType
                      });
                    }}
                  >
                    {patientsWithDemands.length === 0 ? (
                      <option value="">Nenhum paciente cadastrado</option>
                    ) : (
                      patientsWithDemands.map((p) => (
                        <option key={p.patientId} value={p.patientId}>{p.patientName}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Profissional de Saúde *</label>
                  <select
                    className="planner-select"
                    value={fixedAppointmentModalState.professionalId}
                    onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, professionalId: e.target.value })}
                  >
                    {professionalAvailabilities.length === 0 ? (
                      <option value="">Nenhum profissional cadastrado</option>
                    ) : (
                      professionalAvailabilities.map((prof) => (
                        <option key={prof.professionalId} value={prof.professionalId}>
                          {prof.professionalName} ({prof.specialty})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Especialidade Terapêutica *</label>
                  <select
                    className="planner-select"
                    value={fixedAppointmentModalState.therapyType}
                    onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, therapyType: e.target.value })}
                  >
                    {(patientsWithDemands.find((p) => p.patientId === fixedAppointmentModalState.patientId)?.demands || []).map((d) => (
                      <option key={d.id} value={d.therapyType}>{d.therapyType} ({d.sessionsPerWeek}x/sem)</option>
                    ))}
                    <option value="Fisioterapia Cardiorrespiratória & Motora">Fisioterapia Cardiorrespiratória & Motora</option>
                    <option value="Fonoaudiologia Domiciliar">Fonoaudiologia Domiciliar</option>
                    <option value="Enfermagem Estomaterapeuta & Curativos Complexos">Enfermagem Estomaterapeuta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de Recorrência *</label>
                  <select
                    className="planner-select"
                    value={fixedAppointmentModalState.recurrenceType}
                    onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, recurrenceType: e.target.value })}
                  >
                    <option value="weekly">Semanal Recorrente (ex: Toda Terça-feira)</option>
                    <option value="date">Data Específica Única (ex: 14/10/2026)</option>
                  </select>
                </div>

                {fixedAppointmentModalState.recurrenceType === 'weekly' ? (
                  <div className="form-group">
                    <label>Dia da Semana Fixo *</label>
                    <select
                      className="planner-select"
                      value={fixedAppointmentModalState.dayOfWeek}
                      onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, dayOfWeek: Number(e.target.value) })}
                    >
                      <option value={1}>Segunda-feira</option>
                      <option value={2}>Terça-feira</option>
                      <option value={3}>Quarta-feira</option>
                      <option value={4}>Quinta-feira</option>
                      <option value={5}>Sexta-feira</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Data Específica *</label>
                    <input
                      type="date"
                      required
                      className="planner-input"
                      value={fixedAppointmentModalState.dateStr}
                      onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, dateStr: e.target.value })}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Horário Fixo de Início *</label>
                    <input
                      type="time"
                      required
                      className="planner-input"
                      value={fixedAppointmentModalState.time}
                      onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Duração (minutos) *</label>
                    <input
                      type="number"
                      required
                      min={15}
                      max={180}
                      step={5}
                      className="planner-input"
                      value={fixedAppointmentModalState.durationMinutes}
                      onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, durationMinutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Observações / Justificativa</label>
                  <input
                    type="text"
                    placeholder="Ex: Horário fixado em contrato com a família"
                    className="planner-input"
                    value={fixedAppointmentModalState.notes}
                    onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFixedAppointmentModalState({ ...fixedAppointmentModalState, isOpen: false })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'var(--primary)' }}>
                  Fixar Atendimento & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL DE EXPORTAÇÃO DA ESCALA EM FORMATO PDF (CALENDÁRIO MENSAL)           */}
      {/* -------------------------------------------------------------------------- */}
      {isPdfExportModalOpen && (
        <div className="modal-backdrop no-print" onClick={() => setIsPdfExportModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '1050px', width: '95vw', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Printer size={22} color="var(--primary)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-headline)' }}>
                    Exportar Escala em PDF — Calendário Mensal
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Visualização em formato de calendário semanal (Segunda a Domingo), limpa e pronta para impressão ou exportação em PDF.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsPdfExportModalOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
              {/* Barra de Filtros e Ação */}
              <div style={{
                background: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-headline)' }}>Filtrar Escala:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pdfTargetType"
                        value="all"
                        checked={pdfTargetType === 'all'}
                        onChange={() => setPdfTargetType('all')}
                      />
                      Geral (Equipe)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pdfTargetType"
                        value="patient"
                        checked={pdfTargetType === 'patient'}
                        onChange={() => setPdfTargetType('patient')}
                      />
                      Por Paciente
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pdfTargetType"
                        value="professional"
                        checked={pdfTargetType === 'professional'}
                        onChange={() => setPdfTargetType('professional')}
                      />
                      Por Profissional
                    </label>
                  </div>

                  {pdfTargetType === 'patient' && (
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', minWidth: '220px' }}
                      value={pdfSelectedPatientId}
                      onChange={(e) => setPdfSelectedPatientId(e.target.value)}
                    >
                      {patientsWithDemands.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          👤 Paciente: {p.patientName}
                        </option>
                      ))}
                    </select>
                  )}

                  {pdfTargetType === 'professional' && (
                    <select
                      className="form-select"
                      style={{ fontSize: '0.82rem', minWidth: '220px' }}
                      value={pdfSelectedDoctorId}
                      onChange={(e) => setPdfSelectedDoctorId(e.target.value)}
                    >
                      {professionalAvailabilities.map((doc) => (
                        <option key={doc.professionalId} value={doc.professionalId}>
                          🧑‍⚕️ Terapeuta: {doc.professionalName} ({doc.specialty})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePrintPdf}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', fontWeight: 700 }}
                >
                  <Printer size={16} />
                  Imprimir / Salvar em PDF
                </button>
              </div>

              {/* PRÉVIA DO CALENDÁRIO MENSAL NA TELA */}
              <div style={{
                background: '#ffffff',
                color: '#1e293b',
                padding: '1.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
              }}>
                {/* Cabeçalho do Documento */}
                <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      PROJETO SAÚDE • GESTÃO INTEGRADA DE REABILITAÇÃO DOMICILIAR
                    </span>
                    <h2 style={{ margin: '0.2rem 0', fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>
                      ESCALA MENSAL DE ATENDIMENTO — {calendarMonthData.monthTitle.toUpperCase()}
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                      {pdfTargetType === 'patient' && (
                        <span>
                          Paciente: <strong>{patientsWithDemands.find((p) => p.patientId === pdfSelectedPatientId)?.patientName || 'Todos os Pacientes'}</strong>
                          {' '}• Endereço: {patientsWithDemands.find((p) => p.patientId === pdfSelectedPatientId)?.address || 'Não especificado'}
                        </span>
                      )}
                      {pdfTargetType === 'professional' && (
                        <span>
                          Profissional: <strong>{professionalAvailabilities.find((p) => p.professionalId === pdfSelectedDoctorId)?.professionalName || 'Toda a Equipe'}</strong>
                          {' '}• Especialidade: {professionalAvailabilities.find((p) => p.professionalId === pdfSelectedDoctorId)?.specialty}
                        </span>
                      )}
                      {pdfTargetType === 'all' && (
                        <span>Escala Geral Multidisciplinar da Equipe • Todas as Especialidades</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>Total de Sessões no Mês: <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>{pdfSessions.length}</strong></div>
                    <div>Carga Estimada: <strong>~{Math.round((pdfSessions.length * 45) / 60)}h</strong> de reabilitação</div>
                  </div>
                </div>

                {/* Grade do Calendário Mensal: 7 colunas (Segunda a Domingo), cada linha uma semana */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  {/* Cabeçalho dos 7 dias da semana começando na Segunda */}
                  {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((dayName, idx) => (
                    <div
                      key={dayName}
                      style={{
                        background: idx < 5 ? '#0284c7' : '#0369a1',
                        color: '#ffffff',
                        padding: '0.45rem 0.25rem',
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}
                    >
                      {dayName}
                    </div>
                  ))}

                  {/* Semanas em Linhas */}
                  {calendarMonthData.weeks.map((week, wIdx) => (
                    <React.Fragment key={wIdx}>
                      {week.map((cell, cIdx) => {
                        const sessionsInCell = cell.dateStr ? pdfSessions.filter((s) => s.date === cell.dateStr) : [];
                        const isWeekend = cIdx >= 5;

                        return (
                          <div
                            key={cIdx}
                            style={{
                              background: cell.isCurrentMonth ? (isWeekend ? '#f8fafc' : '#ffffff') : '#f1f5f9',
                              minHeight: '105px',
                              padding: '0.35rem',
                              display: 'flex',
                              flexDirection: 'column',
                              borderRight: cIdx < 6 ? '1px solid #e2e8f0' : 'none',
                              borderBottom: wIdx < calendarMonthData.weeks.length - 1 ? '1px solid #e2e8f0' : 'none'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '0.25rem'
                            }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: cell.isCurrentMonth ? '#0f172a' : '#94a3b8',
                                background: cell.isCurrentMonth && sessionsInCell.length > 0 ? '#e0f2fe' : 'transparent',
                                borderRadius: '4px',
                                padding: '1px 5px'
                              }}>
                                {cell.dayNumber || ''}
                              </span>
                              {sessionsInCell.length > 0 && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0284c7' }}>
                                  {sessionsInCell.length} {sessionsInCell.length === 1 ? 'sessão' : 'sessões'}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
                              {sessionsInCell.map((sess) => (
                                <div
                                  key={sess.id}
                                  style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '4px',
                                    padding: '3px 5px',
                                    fontSize: '0.68rem',
                                    lineHeight: 1.25,
                                    color: '#166534'
                                  }}
                                >
                                  <div style={{ fontWeight: 800, color: '#0f766e', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>⏰ {sess.time}</span>
                                    <span>({sess.durationMinutes || 45}m)</span>
                                  </div>
                                  <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {pdfTargetType === 'patient' ? `🧑‍⚕️ ${sess.professionalName}` : `👤 ${sess.patientName}`}
                                  </div>
                                  <div style={{ fontSize: '0.62rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    🏥 {sess.therapyType}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>

                {/* Rodapé do Relatório */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                  <span>Emitido pelo Sistema OmniHome • Projeto Saúde</span>
                  <span>Data de Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', padding: '0.75rem 1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPdfExportModalOpen(false)}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrintPdf}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <Printer size={16} />
                Imprimir / Salvar em PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* ÁREA DE IMPRESSÃO DEDICADA (@media print / .print-only)                    */}
      {/* -------------------------------------------------------------------------- */}
      <div className="print-only" style={{ padding: '20px', fontFamily: 'Inter, system-ui, sans-serif', color: '#000000', background: '#ffffff' }}>
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              PROJETO SAÚDE • GESTÃO INTEGRADA DE REABILITAÇÃO DOMICILIAR
            </div>
            <h1 style={{ margin: '3px 0', fontSize: '18px', color: '#0f172a', fontWeight: 800 }}>
              ESCALA MENSAL DE ATENDIMENTO — {calendarMonthData.monthTitle.toUpperCase()}
            </h1>
            <div style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
              {pdfTargetType === 'patient' && (
                <span>
                  Paciente: <strong>{patientsWithDemands.find((p) => p.patientId === pdfSelectedPatientId)?.patientName || 'Todos os Pacientes'}</strong>
                  {' '}• Endereço: {patientsWithDemands.find((p) => p.patientId === pdfSelectedPatientId)?.address}
                </span>
              )}
              {pdfTargetType === 'professional' && (
                <span>
                  Profissional: <strong>{professionalAvailabilities.find((p) => p.professionalId === pdfSelectedDoctorId)?.professionalName || 'Toda a Equipe'}</strong>
                  {' '}• Especialidade: {professionalAvailabilities.find((p) => p.professionalId === pdfSelectedDoctorId)?.specialty}
                </span>
              )}
              {pdfTargetType === 'all' && (
                <span>Escala Geral Multidisciplinar da Equipe • Todas as Especialidades</span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', color: '#475569' }}>
            <div>Total de Sessões no Mês: <strong style={{ color: '#0284c7', fontSize: '13px' }}>{pdfSessions.length}</strong></div>
            <div>Carga Estimada: <strong>~{Math.round((pdfSessions.length * 45) / 60)}h</strong> de reabilitação</div>
          </div>
        </div>

        {/* Grade 7 Colunas para Impressão */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#94a3b8', border: '1px solid #64748b' }}>
          {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((dayName) => (
            <div
              key={dayName}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                padding: '5px 2px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}
            >
              {dayName}
            </div>
          ))}

          {calendarMonthData.weeks.map((week, wIdx) => (
            <React.Fragment key={wIdx}>
              {week.map((cell, cIdx) => {
                const sessionsInCell = cell.dateStr ? pdfSessions.filter((s) => s.date === cell.dateStr) : [];
                return (
                  <div
                    key={cIdx}
                    style={{
                      background: cell.isCurrentMonth ? '#ffffff' : '#f1f5f9',
                      minHeight: '90px',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 800, color: cell.isCurrentMonth ? '#000000' : '#94a3b8', marginBottom: '2px' }}>
                      {cell.dayNumber || ''}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      {sessionsInCell.map((sess) => (
                        <div
                          key={sess.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #94a3b8',
                            borderRadius: '2px',
                            padding: '2px 4px',
                            fontSize: '9px',
                            lineHeight: 1.2
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>⏰ {sess.time} ({sess.durationMinutes || 45}m)</div>
                          <div style={{ fontWeight: 700 }}>
                            {pdfTargetType === 'patient' ? `🧑‍⚕️ ${sess.professionalName}` : `👤 ${sess.patientName}`}
                          </div>
                          <div style={{ fontSize: '8px', color: '#475569' }}>
                            🏥 {sess.therapyType}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: '15px', paddingTop: '8px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#475569' }}>
          <span>Projeto Saúde • Sistema de Gestão Clínica</span>
          <span>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR').slice(0, 5)}</span>
        </div>
      </div>
    </div>
  );
}
