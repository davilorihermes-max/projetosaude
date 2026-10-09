// src/components/MonthlyScalePlannerView.jsx
import React, { useState, useMemo } from 'react';
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
  ChevronRight,
  Filter,
  Save,
  Info,
  CalendarCheck,
  Plus,
  Trash2,
  UserPlus,
  UserCheck,
  X,
  Stethoscope,
  Activity,
  Layers,
  ArrowRight,
  Sliders,
  Ban,
  Lock
} from 'lucide-react';
import { MonthlyScaleGenerator } from '../services/monthly-scale-generator';
import './MonthlyScalePlannerView.css';

// Bairros padrão de São Paulo para facilitar coordenadas geodésicas automáticas
const SP_PRESET_LOCATIONS = {
  'Cerqueira César (Alameda Santos)': { latitude: -23.563099, longitude: -46.654271 },
  'Pinheiros (Rua Fradique Coutinho)': { latitude: -23.567300, longitude: -46.693400 },
  'Moema (Av. Moema)': { latitude: -23.602200, longitude: -46.662100 },
  'Bela Vista (Av. Paulista)': { latitude: -23.561684, longitude: -46.655981 },
  'Vila Mariana (Rua Vergueiro)': { latitude: -23.578100, longitude: -46.640200 },
  'Perdizes (Rua Cardoso de Almeida)': { latitude: -23.538500, longitude: -46.669800 },
  'Santana (Rua Voluntários da Pátria)': { latitude: -23.502100, longitude: -46.627800 },
  'Morumbi (Av. Giovanni Gronchi)': { latitude: -23.618400, longitude: -46.728900 },
  'Tatuapé (Rua Tuiuti)': { latitude: -23.538000, longitude: -46.578000 }
};

const THERAPY_OPTIONS = [
  'Fisioterapia Cardiorrespiratória & Motora',
  'Fisioterapia Motora & Neuroreabilitação',
  'Fonoaudiologia Domiciliar',
  'Enfermagem Estomaterapeuta & Curativos',
  'Terapia Ocupacional Domiciliar'
];

const WEEKDAY_NAMES = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira'
};

const WEEKDAY_SHORT = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex' };

export default function MonthlyScalePlannerView({
  patients = [],
  doctors = [],
  onCommitScaleToAppointments
}) {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [activeTab, setActiveTab] = useState('demands'); // Inicia diretamente na aba de configuração de demandas e horários
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('all');
  const [committedSuccess, setCommittedSuccess] = useState(false);

  // Modais de Criação
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isNewTherapistModalOpen, setIsNewTherapistModalOpen] = useState(false);

  // Modal para editar dados básicos do paciente (nome e bairro)
  const [editPatientModalState, setEditPatientModalState] = useState({
    isOpen: false,
    patientId: null,
    patientName: '',
    neighborhood: 'Cerqueira César (Alameda Santos)'
  });

  // Modal para adicionar nova demanda a um paciente existente
  const [addDemandModalState, setAddDemandModalState] = useState({
    isOpen: false,
    patientId: null,
    patientName: '',
    therapyType: 'Fonoaudiologia Domiciliar',
    sessionsPerWeek: 2,
    durationMinutes: 45,
    preferredShift: 'any'
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
  const [fixedAppointments, setFixedAppointments] = useState([
    {
      id: 'fix-1',
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      professionalId: 'doc-3',
      professionalName: 'Dr. Rafael Fontes',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      recurrenceType: 'weekly', // 'weekly' | 'date'
      dayOfWeek: 2, // Terça-feira
      dateStr: '',
      time: '09:00',
      durationMinutes: 45,
      notes: 'Horário fixo semanal acordado em contrato'
    }
  ]);

  // Modal para cadastrar atendimento fixo
  const [fixedAppointmentModalState, setFixedAppointmentModalState] = useState({
    isOpen: false,
    patientId: 'pat-1',
    professionalId: 'doc-3',
    therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
    recurrenceType: 'weekly', // 'weekly' | 'date'
    dayOfWeek: 2,
    dateStr: '2026-10-14',
    time: '09:00',
    durationMinutes: 45,
    notes: 'Horário fixado prioritário'
  });

  // Form State: Novo Paciente
  const [newPatientForm, setNewPatientForm] = useState({
    patientName: '',
    neighborhood: 'Cerqueira César (Alameda Santos)',
    initialTherapy: 'Fisioterapia Cardiorrespiratória & Motora',
    sessionsPerWeek: 2,
    durationMinutes: 45,
    preferredShift: 'morning'
  });

  // Form State: Novo Profissional (com janelas de horário)
  const [newTherapistForm, setNewTherapistForm] = useState({
    professionalName: '',
    specialty: 'Fisioterapia Cardiorrespiratória & Motora',
    neighborhood: 'Bela Vista (Av. Paulista)',
    weekdayWindows: {
      1: { enabled: true, startTime: '08:00', endTime: '13:00' },
      2: { enabled: true, startTime: '08:00', endTime: '18:00' },
      3: { enabled: true, startTime: '08:00', endTime: '13:00' },
      4: { enabled: true, startTime: '08:00', endTime: '18:00' },
      5: { enabled: false, startTime: '08:00', endTime: '12:00' }
    },
    assignedPatientIds: []
  });

  // 1. Estado Dinâmico: Pacientes com ATÉ 3 DEMANDAS TERAPÊUTICAS cada e BLOQUEIOS DE HORÁRIO
  const [patientsWithDemands, setPatientsWithDemands] = useState([
    {
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      neighborhood: 'Cerqueira César (Alameda Santos)',
      address: 'Alameda Santos, 1000 - Cerqueira César',
      location: { latitude: -23.563099, longitude: -46.654271 },
      unavailabilityBlocks: [
        { id: 'blk-pat-1', dayOfWeek: 3, startTime: '10:00', endTime: '12:00', reason: 'Consulta Médica Externa' }
      ],
      demands: [
        {
          id: 'dem-pat-1-1',
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'morning'
        },
        {
          id: 'dem-pat-1-2',
          therapyType: 'Fisioterapia Motora & Neuroreabilitação',
          sessionsPerWeek: 1,
          durationMinutes: 45,
          preferredShift: 'afternoon'
        }
      ]
    },
    {
      patientId: 'pat-2',
      patientName: 'Roberto Carlos Peixoto',
      neighborhood: 'Pinheiros (Rua Fradique Coutinho)',
      address: 'Rua Fradique Coutinho, 500 - Pinheiros',
      location: { latitude: -23.567300, longitude: -46.693400 },
      unavailabilityBlocks: [
        { id: 'blk-pat-2', dayOfWeek: 5, startTime: '14:30', endTime: '17:00', reason: 'Fisiatria / Exames' }
      ],
      demands: [
        {
          id: 'dem-pat-2-1',
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'morning'
        }
      ]
    },
    {
      patientId: 'pat-3',
      patientName: 'Juliana Mendes Prado',
      neighborhood: 'Moema (Av. Moema)',
      address: 'Av. Moema, 350 - Moema',
      location: { latitude: -23.602200, longitude: -46.662100 },
      demands: [
        {
          id: 'dem-pat-3-1',
          therapyType: 'Fonoaudiologia Domiciliar',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'afternoon'
        }
      ]
    },
    {
      patientId: 'pat-4',
      patientName: 'Gabriel Santos Oliveira',
      neighborhood: 'Cerqueira César (Alameda Santos)',
      address: 'Rua Bela Cintra, 1400 - Cerqueira César',
      location: { latitude: -23.558000, longitude: -46.662000 },
      demands: [
        {
          id: 'dem-pat-4-1',
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 3,
          durationMinutes: 45,
          preferredShift: 'afternoon'
        }
      ]
    },
    {
      patientId: 'pat-5',
      patientName: 'Helena Vasconcelos',
      neighborhood: 'Pinheiros (Rua Fradique Coutinho)',
      address: 'Rua Oscar Freire, 1800 - Pinheiros',
      location: { latitude: -23.559000, longitude: -46.678000 },
      demands: [
        {
          id: 'dem-pat-5-1',
          therapyType: 'Enfermagem Estomaterapeuta & Curativos',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'any'
        }
      ]
    }
  ]);

  // 2. Estado Dinâmico: Profissionais com JANELAS DE HORÁRIO INDIVIDUAIS POR DIA E BLOQUEIOS
  // Sem limites arbitrários de sessões - apenas caber na janela de início e fim da jornada
  const [professionalAvailabilities, setProfessionalAvailabilities] = useState([
    {
      professionalId: 'doc-3',
      professionalName: 'Dr. Rafael Fontes',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      baseLocation: { latitude: -23.585000, longitude: -46.638000 },
      unavailabilityBlocks: [
        { id: 'blk-doc-1', dayOfWeek: 2, startTime: '09:00', endTime: '10:30', reason: 'Paciente particular externo' }
      ],
      weekdayWindows: {
        1: { enabled: true, startTime: '08:00', endTime: '14:00' },
        2: { enabled: true, startTime: '08:00', endTime: '18:30' },
        3: { enabled: true, startTime: '08:00', endTime: '14:00' },
        4: { enabled: true, startTime: '08:00', endTime: '18:30' },
        5: { enabled: true, startTime: '08:00', endTime: '15:00' }
      }
    },
    {
      professionalId: 'doc-4',
      professionalName: 'Dra. Camila Nogueira',
      specialty: 'Enfermagem Estomaterapeuta & Curativos Complexos',
      baseLocation: { latitude: -23.565000, longitude: -46.657000 },
      unavailabilityBlocks: [
        { id: 'blk-doc-2', dayOfWeek: 5, startTime: '14:30', endTime: '17:00', reason: 'Plantão hospitalar / Reunião' }
      ],
      weekdayWindows: {
        1: { enabled: false, startTime: '08:00', endTime: '12:00' },
        2: { enabled: true, startTime: '08:00', endTime: '18:00' },
        3: { enabled: false, startTime: '08:00', endTime: '12:00' },
        4: { enabled: true, startTime: '08:00', endTime: '18:00' },
        5: { enabled: false, startTime: '08:00', endTime: '12:00' }
      }
    },
    {
      professionalId: 'doc-1',
      professionalName: 'Dr. Lucas Silveira',
      specialty: 'Medicina de Família & Atenção Domiciliar (EMAD)',
      baseLocation: { latitude: -23.561684, longitude: -46.655981 },
      weekdayWindows: {
        1: { enabled: true, startTime: '08:00', endTime: '13:00' },
        2: { enabled: false, startTime: '08:00', endTime: '12:00' },
        3: { enabled: true, startTime: '08:00', endTime: '13:00' },
        4: { enabled: false, startTime: '08:00', endTime: '12:00' },
        5: { enabled: true, startTime: '08:00', endTime: '13:00' }
      }
    }
  ]);

  // 3. Vínculos de Care Team (Restrição de Ouro)
  const [careTeams, setCareTeams] = useState([
    { patientId: 'pat-1', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-2', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-3', professionalIds: ['doc-1'] }, // Juliana sem fono no Care Team -> gera bottleneck
    { patientId: 'pat-4', professionalIds: ['doc-3'] },
    { patientId: 'pat-5', professionalIds: ['doc-4'] }
  ]);

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
        location: p.location,
        address: p.address,
        unavailabilityBlocks: p.unavailabilityBlocks || []
      }))
    );
  }, [patientsWithDemands]);

  // Estado da escala gerada
  const [scaleResult, setScaleResult] = useState(() => {
    const generator = new MonthlyScaleGenerator(28, 12);
    return generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: flatDemands,
      availabilities: professionalAvailabilities,
      careTeams,
      fixedAppointments
    });
  });

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

  // Remover Paciente Inteiro
  const handleDeletePatient = (patientId) => {
    if (window.confirm('Deseja remover este paciente e todas as suas demandas terapêuticas?')) {
      const nextPatients = patientsWithDemands.filter((p) => p.patientId !== patientId);
      const nextCareTeams = careTeams.filter((ct) => ct.patientId !== patientId);
      setPatientsWithDemands(nextPatients);
      setCareTeams(nextCareTeams);
      runGeneration(nextPatients, professionalAvailabilities, nextCareTeams);
    }
  };

  // Remover Profissional
  const handleDeleteProfessional = (profId) => {
    if (window.confirm('Deseja remover este profissional?')) {
      const nextProfs = professionalAvailabilities.filter((p) => p.professionalId !== profId);
      const nextCareTeams = careTeams.map((ct) => ({
        ...ct,
        professionalIds: ct.professionalIds.filter((id) => id !== profId)
      }));
      setProfessionalAvailabilities(nextProfs);
      setCareTeams(nextCareTeams);
      runGeneration(patientsWithDemands, nextProfs, nextCareTeams);
    }
  };

  // Cadastrar Novo Paciente (com 1ª demanda)
  const handleCreateNewPatient = (e) => {
    e.preventDefault();
    if (!newPatientForm.patientName.trim()) return;

    const newId = `pat-${Date.now()}`;
    const coords = SP_PRESET_LOCATIONS[newPatientForm.neighborhood] || SP_PRESET_LOCATIONS['Cerqueira César (Alameda Santos)'];

    const newPatient = {
      patientId: newId,
      patientName: newPatientForm.patientName.trim(),
      neighborhood: newPatientForm.neighborhood,
      address: newPatientForm.neighborhood,
      location: coords,
      demands: [
        {
          id: `dem-${newId}-1`,
          therapyType: newPatientForm.initialTherapy,
          sessionsPerWeek: Number(newPatientForm.sessionsPerWeek),
          durationMinutes: Number(newPatientForm.durationMinutes),
          preferredShift: newPatientForm.preferredShift
        }
      ]
    };

    // Auto-vincula profissionais que tenham especialidade compatível no Care Team
    const autoDocIds = professionalAvailabilities
      .filter((p) => p.specialty.toLowerCase().includes(newPatientForm.initialTherapy.toLowerCase().split(' ')[0]))
      .map((p) => p.professionalId);

    const nextPatients = [...patientsWithDemands, newPatient];
    const nextCareTeams = [...careTeams, { patientId: newId, professionalIds: autoDocIds }];

    setPatientsWithDemands(nextPatients);
    setCareTeams(nextCareTeams);
    setIsNewPatientModalOpen(false);

    setNewPatientForm({
      patientName: '',
      neighborhood: 'Cerqueira César (Alameda Santos)',
      initialTherapy: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning'
    });

    runGeneration(nextPatients, professionalAvailabilities, nextCareTeams);
  };

  // Cadastrar Novo Fisioterapeuta com janelas de horário
  const handleCreateNewTherapist = (e) => {
    e.preventDefault();
    if (!newTherapistForm.professionalName.trim()) return;

    const newDocId = `doc-${Date.now()}`;
    const baseCoords = SP_PRESET_LOCATIONS[newTherapistForm.neighborhood] || SP_PRESET_LOCATIONS['Bela Vista (Av. Paulista)'];

    const newProf = {
      professionalId: newDocId,
      professionalName: newTherapistForm.professionalName.trim(),
      specialty: newTherapistForm.specialty,
      baseLocation: baseCoords,
      weekdayWindows: newTherapistForm.weekdayWindows
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
    setIsNewTherapistModalOpen(false);

    runGeneration(patientsWithDemands, nextProfs, nextCareTeams);
  };

  // Grava as sessões geradas no estado de agendamentos principal
  const handleCommitScale = () => {
    if (!scaleResult || scaleResult.plannedSessions.length === 0) return;

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
        transitTime: `${s.transitTimeMinutes} min de trânsito estimado`
      }));

      onCommitScaleToAppointments(appointmentsToSave);
      setCommittedSuccess(true);
    }
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
            Planejador de Escala Mensal & Alocação Inteligente
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

          {scaleResult && scaleResult.plannedSessions.length > 0 && (
            <button
              className="btn-commit-scale"
              onClick={handleCommitScale}
            >
              <Save size={18} />
              {committedSuccess ? 'Escala Publicada na Agenda!' : 'Publicar na Agenda Oficial'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Sucesso ao Publicar */}
      {committedSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} color="#059669" />
          Escala de {scaleResult?.monthLabel} gravada com sucesso! As sessões já estão disponíveis na aba "Agenda & Deslocamento".
        </div>
      )}

      {/* KPI Cards do Mês */}
      {scaleResult && (
        <div className="planner-kpis">
          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-blue">
              <TrendingUp size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Taxa de Cobertura Global</div>
              <div className="kpi-value">{scaleResult.summary.globalCoveragePercent}%</div>
              <div className="kpi-subtext">
                {scaleResult.summary.totalAllocatedSessions} de {scaleResult.summary.totalDemandedSessions} sessões atendidas
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-green">
              <CalendarDays size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Sessões Domiciliares Alocadas</div>
              <div className="kpi-value">{scaleResult.plannedSessions.length}</div>
              <div className="kpi-subtext">Distribuídas ao longo das semanas úteis</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-box kpi-icon-amber">
              <MapPin size={22} />
            </div>
            <div className="kpi-data">
              <div className="kpi-label">Deslocamento Urbano em Rota</div>
              <div className="kpi-value">{scaleResult.summary.totalEstimatedTransitKm} km</div>
              <div className="kpi-subtext">~{scaleResult.summary.totalEstimatedTransitHours}h de trânsito otimizado</div>
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
      <div style={{
        background: activeTab === 'demands' ? '#eff6ff' : '#f8fafc',
        border: activeTab === 'demands' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: activeTab === 'demands' ? '#2563eb' : '#059669',
            color: '#fff',
            borderRadius: '8px',
            padding: '4px 8px',
            fontWeight: 800,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            {activeTab === 'demands' ? '⚙️ ETAPA 1 (CONFIGURAÇÃO)' : '📅 ETAPA 2 (RESULTADO)'}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
              {activeTab === 'demands'
                ? 'Definição de Horários dos Terapeutas & Demandas dos Pacientes'
                : 'Grade de Escala Mensal Gerada pelo Motor de Roteirização Urbana'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {activeTab === 'demands'
                ? 'Indique o horário de início e fim da jornada diária dos terapeutas (sem limite artificial de atendimentos) e até 3 demandas por paciente abaixo.'
                : 'Acompanhe as sessões agendadas dia a dia, horários exatos e tempos de trânsito em rota geodésica urbana.'}
            </div>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
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
          <span className="tab-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
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
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
                Grade Distribuída: {scaleResult?.monthLabel}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Sessões sequenciais com rota geodésica e tempos de trânsito calculados.
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
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#ffffff'
                  }}>
                    <div style={{
                      background: '#f8fafc',
                      padding: '0.65rem 1rem',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: '#334155',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        📅 {dayName}, {dayFormatted}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
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
                            <Clock size={14} color="#2563eb" />
                            {session.time} ({session.durationMinutes} min)
                            {session.isFixed && (
                              <span style={{
                                marginLeft: '0.45rem',
                                background: '#e0e7ff',
                                color: '#3730a3',
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
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>
                              Semana {session.weekNumber}
                            </span>
                          </div>
                          <div className="session-patient">
                            {session.patientName}
                          </div>
                          <div className="session-therapist">
                            🧑‍⚕️ {session.professionalName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                            🏥 {session.therapyType}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
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
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
              Taxa de Atendimento das Metas Terapêuticas
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
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
                    <td style={{ fontWeight: 700, color: '#2563eb' }}>
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
                          background: '#ecfdf5',
                          color: '#065f46',
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
                          background: '#fffbeb',
                          color: '#92400e',
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
                          background: '#fef2f2',
                          color: '#991b1b',
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
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
              Diagnóstico de Gargalos & Otimizações do Gestor
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Demandas que não puderam ser 100% preenchidas por restrição de equipe ou capacidade de agenda.
            </p>
          </div>

          {(!scaleResult?.bottlenecks || scaleResult.bottlenecks.length === 0) ? (
            <div style={{
              background: '#ecfdf5',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#065f46'
            }}>
              <CheckCircle2 size={40} color="#059669" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: '0 0 0.25rem 0' }}>Escala Sem Gargalos!</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
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
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: '#1e293b' }}>
                Parâmetros Reais: Janelas de Horário Diárias & Múltiplas Terapias
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Profissionais com horário de início e fim variável por dia (sem limite artificial de atendimentos) e pacientes com até 3 demandas terapêuticas.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => setIsNewPatientModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                + Novo Paciente
              </button>

              <button
                className="btn-primary"
                onClick={() => setIsNewTherapistModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  background: '#059669'
                }}
              >
                <UserPlus size={16} />
                + Novo Fisioterapeuta / Terapeuta
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
              color: '#1e293b',
              fontSize: '1rem'
            }}>
              <Stethoscope size={20} color="#059669" />
              Equipe de Profissionais — Janelas de Horário Diárias ({professionalAvailabilities.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {professionalAvailabilities.map((prof) => (
                <div key={prof.professionalId} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  background: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        {prof.professionalName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
                        🩺 {prof.specialty}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
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
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Horário de Jornada por Dia da Semana:</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400 }}>Capacidade: O que couber na janela</span>
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
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
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
                        + Bloquear Horário
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
              ))}
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
                  Atendimentos prioritários pré-estabelecidos (ex: terças-feiras Rafael atende Mariana às 09:00). O motor aloca esses horários primeiro, reserva a agenda e deduz da meta semanal do paciente.
                </p>
              </div>

              <button
                type="button"
                className="btn-add-fixed"
                onClick={() => setFixedAppointmentModalState({
                  isOpen: true,
                  patientId: patientsWithDemands[0]?.patientId || 'pat-1',
                  professionalId: professionalAvailabilities[0]?.professionalId || 'doc-3',
                  therapyType: patientsWithDemands[0]?.demands[0]?.therapyType || 'Fisioterapia Cardiorrespiratória & Motora',
                  recurrenceType: 'weekly',
                  dayOfWeek: 2,
                  dateStr: '2026-10-14',
                  time: '09:00',
                  durationMinutes: 45,
                  notes: 'Atendimento fixo pré-estabelecido'
                })}
              >
                <Plus size={15} />
                + Fixar Atendimento
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
              color: '#1e293b',
              fontSize: '1rem'
            }}>
              <Users size={20} color="#2563eb" />
              Pacientes & Demandas Terapêuticas (Até 3 por Paciente) ({patientsWithDemands.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
              {patientsWithDemands.map((patient) => {
                const patientCareTeam = careTeams.find((ct) => ct.patientId === patient.patientId) || { professionalIds: [] };

                return (
                  <div key={patient.patientId} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                            {patient.patientName}
                          </span>
                          <span className="demand-counter-badge">
                            {patient.demands.length}/3 Terapias
                          </span>
                          <button
                            type="button"
                            className="btn-edit-patient-inline"
                            title="Editar Nome e Bairro do Paciente"
                            onClick={() => setEditPatientModalState({
                              isOpen: true,
                              patientId: patient.patientId,
                              patientName: patient.patientName,
                              neighborhood: patient.neighborhood || 'Cerqueira César (Alameda Santos)'
                            })}
                          >
                            ✏️ Editar Paciente
                          </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📍 {patient.address}
                        </div>
                      </div>

                      <button
                        className="btn-danger-icon"
                        title="Remover Paciente"
                        onClick={() => handleDeletePatient(patient.patientId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Lista das até 3 demandas deste paciente */}
                    <div className="patient-demands-container">
                      {patient.demands.map((demand, idx) => (
                        <div key={demand.id || idx} className="single-demand-card">
                          <div className="single-demand-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                              <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.75rem' }}>
                                #{idx + 1}
                              </span>
                              <select
                                className="therapy-select-compact"
                                value={demand.therapyType}
                                onChange={(e) => handleUpdateTherapyType(patient.patientId, demand.id, e.target.value)}
                              >
                                {THERAPY_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            {patient.demands.length > 1 && (
                              <button
                                className="btn-danger-icon"
                                title="Remover esta terapia"
                                onClick={() => handleRemoveSingleDemand(patient.patientId, demand.id)}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8rem'
                          }}>
                            <span style={{ color: '#475569' }}>Frequência semanal:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button
                                className="stepper-btn"
                                disabled={demand.sessionsPerWeek <= 1}
                                onClick={() => handleUpdateWeeklySessions(patient.patientId, demand.id, -1)}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 700, minWidth: '22px', textAlign: 'center' }}>
                                {demand.sessionsPerWeek}x
                              </span>
                              <button
                                className="stepper-btn"
                                disabled={demand.sessionsPerWeek >= 6}
                                onClick={() => handleUpdateWeeklySessions(patient.patientId, demand.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.78rem'
                          }}>
                            <span style={{ color: '#475569' }}>Turno preferencial:</span>
                            <div className="chips-row">
                              {['morning', 'afternoon', 'any'].map((sh) => (
                                <button
                                  key={sh}
                                  className={`chip-btn ${demand.preferredShift === sh ? 'active' : ''}`}
                                  onClick={() => handleUpdateShift(patient.patientId, demand.id, sh)}
                                  style={{ padding: '2px 7px', fontSize: '0.72rem' }}
                                >
                                  {sh === 'morning' ? 'Manhã' : sh === 'afternoon' ? 'Tarde' : 'Qualquer'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Botão para adicionar mais uma terapia se tiver menos de 3 */}
                      {patient.demands.length < 3 && (
                        <button
                          className="btn-add-demand-inline"
                          onClick={() => setAddDemandModalState({
                            isOpen: true,
                            patientId: patient.patientId,
                            patientName: patient.patientName,
                            therapyType: 'Fonoaudiologia Domiciliar',
                            sessionsPerWeek: 2,
                            durationMinutes: 45,
                            preferredShift: 'any'
                          })}
                        >
                          <Plus size={14} />
                          + Adicionar Nova Demanda Terapêutica ({patient.demands.length}/3)
                        </button>
                      )}
                    </div>

                    {/* Vínculo de Care Team Interativo */}
                    <div style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.65rem',
                      fontSize: '0.78rem'
                    }}>
                      <div style={{ fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
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
                          + Bloquear Horário
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
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Cadastrar Novo Paciente */}
      {isNewPatientModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsNewPatientModalOpen(false)}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserPlus size={20} color="#2563eb" />
                Cadastrar Novo Paciente
              </h3>
              <button className="modal-close-btn" onClick={() => setIsNewPatientModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewPatient}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome Completo do Paciente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="planner-input"
                    value={newPatientForm.patientName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, patientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Região / Endereço Domiciliar em SP *</label>
                  <select
                    className="planner-select"
                    value={newPatientForm.neighborhood}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, neighborhood: e.target.value })}
                  >
                    {Object.keys(SP_PRESET_LOCATIONS).map((neigh) => (
                      <option key={neigh} value={neigh}>{neigh}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a8a', marginBottom: '0.5rem' }}>
                    1ª Demanda Terapêutica Inicial (poderá adicionar até 3):
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Especialidade Terapêutica *</label>
                    <select
                      className="planner-select"
                      value={newPatientForm.initialTherapy}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, initialTherapy: e.target.value })}
                    >
                      {THERAPY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label>Sessões / Semana</label>
                      <select
                        className="planner-select"
                        value={newPatientForm.sessionsPerWeek}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, sessionsPerWeek: Number(e.target.value) })}
                      >
                        <option value={1}>1x / semana</option>
                        <option value={2}>2x / semana</option>
                        <option value={3}>3x / semana</option>
                        <option value={4}>4x / semana</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Turno Preferencial</label>
                      <select
                        className="planner-select"
                        value={newPatientForm.preferredShift}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, preferredShift: e.target.value })}
                      >
                        <option value="morning">Manhã</option>
                        <option value="afternoon">Tarde</option>
                        <option value="any">Qualquer</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewPatientModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Salvar Paciente & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Demanda Adicional a Paciente Existente (Até 3) */}
      {addDemandModalState.isOpen && (
        <div className="planner-modal-backdrop" onClick={() => setAddDemandModalState({ ...addDemandModalState, isOpen: false })}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} color="#2563eb" />
                Nova Demanda Terapêutica — {addDemandModalState.patientName}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => setAddDemandModalState({ ...addDemandModalState, isOpen: false })}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddDemandToPatient}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Especialidade Terapêutica *</label>
                  <select
                    className="planner-select"
                    value={addDemandModalState.therapyType}
                    onChange={(e) => setAddDemandModalState({ ...addDemandModalState, therapyType: e.target.value })}
                  >
                    {THERAPY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Sessões / Semana *</label>
                    <select
                      className="planner-select"
                      value={addDemandModalState.sessionsPerWeek}
                      onChange={(e) => setAddDemandModalState({ ...addDemandModalState, sessionsPerWeek: Number(e.target.value) })}
                    >
                      <option value={1}>1x por semana</option>
                      <option value={2}>2x por semana</option>
                      <option value={3}>3x por semana</option>
                      <option value={4}>4x por semana</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Turno Preferencial</label>
                    <select
                      className="planner-select"
                      value={addDemandModalState.preferredShift}
                      onChange={(e) => setAddDemandModalState({ ...addDemandModalState, preferredShift: e.target.value })}
                    >
                      <option value="morning">Manhã</option>
                      <option value="afternoon">Tarde</option>
                      <option value="any">Qualquer</option>
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#eff6ff', padding: '0.65rem', borderRadius: '6px' }}>
                  💡 O motor garantirá que esta terapia não tenha choque de horário com as demais terapias de {addDemandModalState.patientName}.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAddDemandModalState({ ...addDemandModalState, isOpen: false })}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Adicionar Demanda & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cadastrar Fisioterapeuta com Janelas de Horário Diárias */}
      {isNewTherapistModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsNewTherapistModalOpen(false)}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserPlus size={20} color="#059669" />
                Cadastrar Fisioterapeuta / Terapeuta
              </h3>
              <button className="modal-close-btn" onClick={() => setIsNewTherapistModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTherapist}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Terapeuta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dra. Larissa Prado"
                    className="planner-input"
                    value={newTherapistForm.professionalName}
                    onChange={(e) => setNewTherapistForm({ ...newTherapistForm, professionalName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Especialidade de Atuação *</label>
                  <select
                    className="planner-select"
                    value={newTherapistForm.specialty}
                    onChange={(e) => setNewTherapistForm({ ...newTherapistForm, specialty: e.target.value })}
                  >
                    {THERAPY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Região da Base de Saída (Ponto de Partida em SP)</label>
                  <select
                    className="planner-select"
                    value={newTherapistForm.neighborhood}
                    onChange={(e) => setNewTherapistForm({ ...newTherapistForm, neighborhood: e.target.value })}
                  >
                    {Object.keys(SP_PRESET_LOCATIONS).map((neigh) => (
                      <option key={neigh} value={neigh}>{neigh}</option>
                    ))}
                  </select>
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
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
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
                  onClick={() => setIsNewTherapistModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#059669' }}
                >
                  Cadastrar Terapeuta & Recalcular
                </button>
              </div>
            </form>
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
                  <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    As coordenadas geodésicas da rota serão recalculadas automaticamente para este bairro.
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
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem', background: '#fffbeb', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
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
                <button type="submit" className="btn-primary" style={{ background: '#d97706' }}>
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
                <div style={{ fontSize: '0.82rem', color: '#3730a3', marginBottom: '0.75rem', background: '#eef2ff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
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
                    {patientsWithDemands.map((p) => (
                      <option key={p.patientId} value={p.patientId}>{p.patientName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Profissional de Saúde *</label>
                  <select
                    className="planner-select"
                    value={fixedAppointmentModalState.professionalId}
                    onChange={(e) => setFixedAppointmentModalState({ ...fixedAppointmentModalState, professionalId: e.target.value })}
                  >
                    {professionalAvailabilities.map((prof) => (
                      <option key={prof.professionalId} value={prof.professionalId}>
                        {prof.professionalName} ({prof.specialty})
                      </option>
                    ))}
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
                <button type="submit" className="btn-primary" style={{ background: '#4f46e5' }}>
                  Fixar Atendimento & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
