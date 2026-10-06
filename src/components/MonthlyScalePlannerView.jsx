// src/components/MonthlyScalePlannerView.jsx
import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
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
  ArrowRight
} from 'lucide-react';
import { MonthlyScaleGenerator } from '../services/monthly-scale-generator';
import './MonthlyScalePlannerView.css';

// Bairros padrão de São Paulo para facilitar coordenadas automáticas
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

export default function MonthlyScalePlannerView({
  patients = [],
  doctors = [],
  onCommitScaleToAppointments
}) {
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar', 'coverage', 'demands', 'bottlenecks'
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState('all');
  const [committedSuccess, setCommittedSuccess] = useState(false);

  // Modais de Criação
  const [isNewDemandModalOpen, setIsNewDemandModalOpen] = useState(false);
  const [isNewTherapistModalOpen, setIsNewTherapistModalOpen] = useState(false);

  // Form State: Nova Demanda de Paciente
  const [newDemandForm, setNewDemandForm] = useState({
    patientName: '',
    therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
    sessionsPerWeek: 2,
    durationMinutes: 45,
    preferredShift: 'morning',
    neighborhood: 'Cerqueira César (Alameda Santos)'
  });

  // Form State: Novo Fisioterapeuta / Terapeuta
  const [newTherapistForm, setNewTherapistForm] = useState({
    professionalName: '',
    specialty: 'Fisioterapia Cardiorrespiratória & Motora',
    availableDays: [1, 2, 3, 4, 5], // Seg a Sex
    shifts: ['morning', 'afternoon'],
    maxDailySessions: 4,
    neighborhood: 'Bela Vista (Av. Paulista)',
    assignedPatientIds: []
  });

  // 1. Estado Dinâmico: Demandas Terapêuticas dos Pacientes
  const [therapyDemands, setTherapyDemands] = useState([
    {
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning',
      location: { latitude: -23.563099, longitude: -46.654271 },
      address: 'Alameda Santos, 1000 - Cerqueira César'
    },
    {
      patientId: 'pat-2',
      patientName: 'Roberto Carlos Peixoto',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning',
      location: { latitude: -23.567300, longitude: -46.693400 },
      address: 'Rua Fradique Coutinho, 500 - Pinheiros'
    },
    {
      patientId: 'pat-3',
      patientName: 'Juliana Mendes Prado',
      therapyType: 'Fonoaudiologia Domiciliar',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'afternoon',
      location: { latitude: -23.602200, longitude: -46.662100 },
      address: 'Av. Moema, 350 - Moema'
    },
    {
      patientId: 'pat-4',
      patientName: 'Gabriel Santos Oliveira',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 3,
      durationMinutes: 45,
      preferredShift: 'afternoon',
      location: { latitude: -23.558000, longitude: -46.662000 },
      address: 'Rua Bela Cintra, 1400 - Cerqueira César'
    },
    {
      patientId: 'pat-5',
      patientName: 'Helena Vasconcelos',
      therapyType: 'Enfermagem Estomaterapeuta & Curativos',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'any',
      location: { latitude: -23.559000, longitude: -46.678000 },
      address: 'Rua Oscar Freire, 1800 - Pinheiros'
    }
  ]);

  // 2. Estado Dinâmico: Disponibilidade dos Profissionais
  const [professionalAvailabilities, setProfessionalAvailabilities] = useState([
    {
      professionalId: 'doc-3',
      professionalName: 'Dr. Rafael Fontes',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      availableDaysOfWeek: [1, 2, 3, 4, 5], // Seg a Sex
      shifts: ['morning', 'afternoon'],
      baseLocation: { latitude: -23.585000, longitude: -46.638000 },
      maxDailySessions: 4
    },
    {
      professionalId: 'doc-4',
      professionalName: 'Dra. Camila Nogueira',
      specialty: 'Enfermagem Estomaterapeuta & Curativos Complexos',
      availableDaysOfWeek: [2, 4], // Ter e Qui
      shifts: ['morning', 'afternoon'],
      baseLocation: { latitude: -23.565000, longitude: -46.657000 },
      maxDailySessions: 4
    },
    {
      professionalId: 'doc-1',
      professionalName: 'Dr. Lucas Silveira',
      specialty: 'Medicina de Família & Atenção Domiciliar (EMAD)',
      availableDaysOfWeek: [1, 3, 5], // Seg, Qua, Sex
      shifts: ['morning'],
      baseLocation: { latitude: -23.561684, longitude: -46.655981 },
      maxDailySessions: 3
    }
  ]);

  // 3. Estado Dinâmico: Care Teams (Vínculo Restrito de Equipe de Cuidado)
  const [careTeams, setCareTeams] = useState([
    { patientId: 'pat-1', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-2', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-3', professionalIds: ['doc-1'] }, // Juliana sem fonoaudióloga autorizada no Care Team -> gera bottleneck
    { patientId: 'pat-4', professionalIds: ['doc-3'] },
    { patientId: 'pat-5', professionalIds: ['doc-4'] }
  ]);

  // Estado da escala gerada
  const [scaleResult, setScaleResult] = useState(() => {
    const generator = new MonthlyScaleGenerator(28, 12);
    return generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: therapyDemands,
      availabilities: professionalAvailabilities,
      careTeams
    });
  });

  // Executa o cálculo da escala mensal
  const runGeneration = (demands = therapyDemands, avails = professionalAvailabilities, cts = careTeams) => {
    setIsGenerating(true);
    setCommittedSuccess(false);

    setTimeout(() => {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const generator = new MonthlyScaleGenerator(28, 12);
      const result = generator.generateMonthlyScale({
        year,
        month,
        demands,
        availabilities: avails,
        careTeams: cts
      });

      setScaleResult(result);
      setIsGenerating(false);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 300);
  };

  // Alterar frequência semanal de um paciente (+ ou -)
  const handleUpdateWeeklySessions = (patientId, delta) => {
    const updated = therapyDemands.map((d) => {
      if (d.patientId === patientId) {
        const nextSessions = Math.max(1, Math.min(7, d.sessionsPerWeek + delta));
        return { ...d, sessionsPerWeek: nextSessions };
      }
      return d;
    });
    setTherapyDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Alterar turno preferencial de um paciente
  const handleUpdateShift = (patientId, shift) => {
    const updated = therapyDemands.map((d) => (d.patientId === patientId ? { ...d, preferredShift: shift } : d));
    setTherapyDemands(updated);
    runGeneration(updated, professionalAvailabilities, careTeams);
  };

  // Alternar dia da semana de trabalho do profissional (ex: Terça ligada/desligada)
  const handleToggleProfDay = (profId, dayNum) => {
    const updated = professionalAvailabilities.map((p) => {
      if (p.professionalId === profId) {
        const hasDay = p.availableDaysOfWeek.includes(dayNum);
        const nextDays = hasDay
          ? p.availableDaysOfWeek.filter((d) => d !== dayNum)
          : [...p.availableDaysOfWeek, dayNum].sort();
        return { ...p, availableDaysOfWeek: nextDays.length > 0 ? nextDays : [dayNum] };
      }
      return p;
    });
    setProfessionalAvailabilities(updated);
    runGeneration(therapyDemands, updated, careTeams);
  };

  // Alternar turno do profissional (Manhã / Tarde)
  const handleToggleProfShift = (profId, shift) => {
    const updated = professionalAvailabilities.map((p) => {
      if (p.professionalId === profId) {
        const hasShift = p.shifts.includes(shift);
        const nextShifts = hasShift
          ? p.shifts.filter((s) => s !== shift)
          : [...p.shifts, shift];
        return { ...p, shifts: nextShifts.length > 0 ? nextShifts : [shift] };
      }
      return p;
    });
    setProfessionalAvailabilities(updated);
    runGeneration(therapyDemands, updated, careTeams);
  };

  // Alternar vínculo de Care Team (adicionar ou remover terapeuta da equipe do paciente)
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
    runGeneration(therapyDemands, professionalAvailabilities, updated);
  };

  // Remover Demanda de Paciente
  const handleDeleteDemand = (patientId) => {
    if (window.confirm('Deseja remover este paciente e sua demanda da escala?')) {
      const nextDemands = therapyDemands.filter((d) => d.patientId !== patientId);
      const nextCareTeams = careTeams.filter((ct) => ct.patientId !== patientId);
      setTherapyDemands(nextDemands);
      setCareTeams(nextCareTeams);
      runGeneration(nextDemands, professionalAvailabilities, nextCareTeams);
    }
  };

  // Remover Profissional
  const handleDeleteProfessional = (profId) => {
    if (window.confirm('Deseja remover este profissional e sua disponibilidade?')) {
      const nextProfs = professionalAvailabilities.filter((p) => p.professionalId !== profId);
      const nextCareTeams = careTeams.map((ct) => ({
        ...ct,
        professionalIds: ct.professionalIds.filter((id) => id !== profId)
      }));
      setProfessionalAvailabilities(nextProfs);
      setCareTeams(nextCareTeams);
      runGeneration(therapyDemands, nextProfs, nextCareTeams);
    }
  };

  // Criar Nova Demanda de Paciente
  const handleCreateNewDemand = (e) => {
    e.preventDefault();
    if (!newDemandForm.patientName.trim()) return;

    const newId = `pat-${Date.now()}`;
    const coords = SP_PRESET_LOCATIONS[newDemandForm.neighborhood] || SP_PRESET_LOCATIONS['Cerqueira César (Alameda Santos)'];

    const newDemand = {
      patientId: newId,
      patientName: newDemandForm.patientName.trim(),
      therapyType: newDemandForm.therapyType,
      sessionsPerWeek: Number(newDemandForm.sessionsPerWeek),
      durationMinutes: Number(newDemandForm.durationMinutes),
      preferredShift: newDemandForm.preferredShift,
      location: coords,
      address: newDemandForm.neighborhood
    };

    // Auto-vincula profissionais que tenham especialidade compatível no Care Team
    const autoDocIds = professionalAvailabilities
      .filter((p) => p.specialty.toLowerCase().includes(newDemandForm.therapyType.toLowerCase().split(' ')[0]))
      .map((p) => p.professionalId);

    const nextDemands = [...therapyDemands, newDemand];
    const nextCareTeams = [...careTeams, { patientId: newId, professionalIds: autoDocIds }];

    setTherapyDemands(nextDemands);
    setCareTeams(nextCareTeams);
    setIsNewDemandModalOpen(false);
    setNewDemandForm({
      patientName: '',
      therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
      sessionsPerWeek: 2,
      durationMinutes: 45,
      preferredShift: 'morning',
      neighborhood: 'Cerqueira César (Alameda Santos)'
    });

    runGeneration(nextDemands, professionalAvailabilities, nextCareTeams);
  };

  // Criar Novo Fisioterapeuta / Terapeuta
  const handleCreateNewTherapist = (e) => {
    e.preventDefault();
    if (!newTherapistForm.professionalName.trim()) return;

    const newDocId = `doc-${Date.now()}`;
    const baseCoords = SP_PRESET_LOCATIONS[newTherapistForm.neighborhood] || SP_PRESET_LOCATIONS['Bela Vista (Av. Paulista)'];

    const newProf = {
      professionalId: newDocId,
      professionalName: newTherapistForm.professionalName.trim(),
      specialty: newTherapistForm.specialty,
      availableDaysOfWeek: newTherapistForm.availableDays,
      shifts: newTherapistForm.shifts,
      baseLocation: baseCoords,
      maxDailySessions: Number(newTherapistForm.maxDailySessions)
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

    setNewTherapistForm({
      professionalName: '',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      availableDays: [1, 2, 3, 4, 5],
      shifts: ['morning', 'afternoon'],
      maxDailySessions: 4,
      neighborhood: 'Bela Vista (Av. Paulista)',
      assignedPatientIds: []
    });

    runGeneration(therapyDemands, nextProfs, nextCareTeams);
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
        notes: `Plano Terapêutico Mensal: ${s.therapyType} (${s.transitKmFromPrevious.toFixed(1)} km da parada anterior)`,
        address: s.address,
        accessNotes: 'Sessão gerada pelo motor de escala mensal automatizada.',
        transitTime: `${s.transitTimeMinutes} min de trânsito estimado`
      }));

      onCommitScaleToAppointments(appointmentsToSave);
      setCommittedSuccess(true);

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.5 }
      });
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

  const DAY_LABELS = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex' };

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
            Cruzamento automatizado de metas terapêuticas, disponibilidade da equipe de saúde e travas do Care Team.
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
              <div className="kpi-subtext">Distribuídas em 5 semanas úteis</div>
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

      {/* Navegação de Abas do Módulo */}
      <div className="planner-tabs">
        <button
          className={`planner-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarDays size={18} />
          Grade Mensal de Sessões
          {scaleResult && (
            <span className="tab-badge">{scaleResult.plannedSessions.length}</span>
          )}
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'coverage' ? 'active' : ''}`}
          onClick={() => setActiveTab('coverage')}
        >
          <TrendingUp size={18} />
          Metas Terapêuticas & Cobertura
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'bottlenecks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bottlenecks')}
        >
          <AlertTriangle size={18} />
          Gargalos & Ações do Gestor
          {scaleResult?.bottlenecks?.length > 0 && (
            <span className="tab-badge badge-amber">{scaleResult.bottlenecks.length}</span>
          )}
        </button>

        <button
          className={`planner-tab-btn ${activeTab === 'demands' ? 'active' : ''}`}
          onClick={() => setActiveTab('demands')}
        >
          <Users size={18} />
          Gerenciar Demandas, Fisioterapeutas & Care Team
          <span className="tab-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
            {therapyDemands.length} pacientes | {professionalAvailabilities.length} terapeutas
          </span>
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
                {therapyDemands.map((d) => (
                  <option key={d.patientId} value={d.patientId}>
                    {d.patientName}
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
              {scaleResult?.coverageReports.map((report) => {
                const fillClass =
                  report.coveragePercent >= 100
                    ? 'progress-fill-green'
                    : report.coveragePercent >= 60
                    ? 'progress-fill-amber'
                    : 'progress-fill-red';

                return (
                  <tr key={report.patientId}>
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
              Demandas que não puderam ser 100% preenchidas por restrição de equipe ou capacidade.
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
                Todas as metas terapêuticas do mês foram 100% alocadas com viabilidade de trânsito e Care Team.
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
                      <span>Motivo: Os profissionais do Care Team atingiram o limite de vagas disponíveis para este turno/dia.</span>
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

      {/* Conteúdo da Aba 4: GERENCIAR DEMANDAS, FISIOTERAPEUTAS & CARE TEAM */}
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
                Laboratório de Escalas: Pacientes, Fisioterapeutas & Care Team
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Adicione e altere as necessidades terapêuticas dos pacientes e disponibilidades dos profissionais para testar o motor.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => setIsNewDemandModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} />
                + Nova Demanda de Paciente
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

          {/* Seção 1: Pacientes e Demandas Terapêuticas */}
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
              <Users size={20} color="#2563eb" />
              Demandas Terapêuticas dos Pacientes ({therapyDemands.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
              {therapyDemands.map((demand) => {
                const patientCareTeam = careTeams.find((ct) => ct.patientId === demand.patientId) || { professionalIds: [] };

                return (
                  <div key={demand.patientId} style={{
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
                          {demand.patientName}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                          🩺 {demand.therapyType}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📍 {demand.address}
                        </div>
                      </div>

                      <button
                        className="btn-danger-icon"
                        title="Remover Demanda"
                        onClick={() => handleDeleteDemand(demand.patientId)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Controles de Frequência e Turno */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Sessões por Semana:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          className="stepper-btn"
                          disabled={demand.sessionsPerWeek <= 1}
                          onClick={() => handleUpdateWeeklySessions(demand.patientId, -1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: '22px', textAlign: 'center' }}>
                          {demand.sessionsPerWeek}x
                        </span>
                        <button
                          className="stepper-btn"
                          disabled={demand.sessionsPerWeek >= 6}
                          onClick={() => handleUpdateWeeklySessions(demand.patientId, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem'
                    }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>Turno Preferencial:</span>
                      <div className="chips-row">
                        {['morning', 'afternoon', 'any'].map((sh) => (
                          <button
                            key={sh}
                            className={`chip-btn ${demand.preferredShift === sh ? 'active' : ''}`}
                            onClick={() => handleUpdateShift(demand.patientId, sh)}
                            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                          >
                            {sh === 'morning' ? 'Manhã' : sh === 'afternoon' ? 'Tarde' : 'Qualquer'}
                          </button>
                        ))}
                      </div>
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
                              onClick={() => handleToggleCareTeamMember(demand.patientId, prof.professionalId)}
                              title={isMember ? 'Remover do Care Team' : 'Adicionar ao Care Team'}
                            >
                              {isMember ? <CheckCircle2 size={12} color="#2563eb" /> : <Plus size={12} />}
                              {prof.professionalName.split(' ')[0]} {prof.professionalName.split(' ')[1] || ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Fisioterapeutas & Grade de Disponibilidade */}
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
              <Stethoscope size={20} color="#059669" />
              Equipe de Fisioterapeutas & Disponibilidades ({professionalAvailabilities.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
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
                        📍 Base: {prof.baseLocation.latitude.toFixed(4)}, {prof.baseLocation.longitude.toFixed(4)}
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

                  {/* Dias da Semana Interativos */}
                  <div style={{ fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Dias de Atendimento na Semana:
                    </div>
                    <div className="chips-row">
                      {[1, 2, 3, 4, 5].map((dayNum) => {
                        const isDayActive = prof.availableDaysOfWeek.includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            className={`chip-btn ${isDayActive ? 'active' : ''}`}
                            onClick={() => handleToggleProfDay(prof.professionalId, dayNum)}
                          >
                            {DAY_LABELS[dayNum]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Turnos Interativos */}
                  <div style={{ fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Turnos Habilitados:
                    </div>
                    <div className="chips-row">
                      {['morning', 'afternoon'].map((sh) => {
                        const isShiftActive = prof.shifts.includes(sh);
                        return (
                          <button
                            key={sh}
                            className={`chip-btn ${isShiftActive ? 'active' : ''}`}
                            onClick={() => handleToggleProfShift(prof.professionalId, sh)}
                          >
                            {sh === 'morning' ? '🌅 Manhã (08:30 - 12:00)' : '🌇 Tarde (13:30 - 17:30)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    background: '#f8fafc',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px'
                  }}>
                    Capacidade máxima: <strong>{prof.maxDailySessions} sessões/dia</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Adicionar Demanda de Paciente */}
      {isNewDemandModalOpen && (
        <div className="planner-modal-backdrop" onClick={() => setIsNewDemandModalOpen(false)}>
          <div className="planner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserPlus size={20} color="#2563eb" />
                Cadastrar Demanda Terapêutica de Paciente
              </h3>
              <button className="modal-close-btn" onClick={() => setIsNewDemandModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewDemand}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome Completo do Paciente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="planner-input"
                    value={newDemandForm.patientName}
                    onChange={(e) => setNewDemandForm({ ...newDemandForm, patientName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Especialidade Terapêutica Necessária *</label>
                  <select
                    className="planner-select"
                    value={newDemandForm.therapyType}
                    onChange={(e) => setNewDemandForm({ ...newDemandForm, therapyType: e.target.value })}
                  >
                    <option value="Fisioterapia Cardiorrespiratória & Motora">Fisioterapia Cardiorrespiratória & Motora</option>
                    <option value="Fisioterapia Motora & Neuroreabilitação">Fisioterapia Motora & Neuroreabilitação</option>
                    <option value="Fonoaudiologia Domiciliar">Fonoaudiologia Domiciliar</option>
                    <option value="Enfermagem Estomaterapeuta & Curativos">Enfermagem Estomaterapeuta & Curativos</option>
                    <option value="Terapia Ocupacional Domiciliar">Terapia Ocupacional Domiciliar</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Sessões / Semana *</label>
                    <select
                      className="planner-select"
                      value={newDemandForm.sessionsPerWeek}
                      onChange={(e) => setNewDemandForm({ ...newDemandForm, sessionsPerWeek: Number(e.target.value) })}
                    >
                      <option value={1}>1x por semana</option>
                      <option value={2}>2x por semana</option>
                      <option value={3}>3x por semana</option>
                      <option value={4}>4x por semana</option>
                      <option value={5}>5x por semana</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Turno Preferencial *</label>
                    <select
                      className="planner-select"
                      value={newDemandForm.preferredShift}
                      onChange={(e) => setNewDemandForm({ ...newDemandForm, preferredShift: e.target.value })}
                    >
                      <option value="morning">Manhã (08:30 - 12:00)</option>
                      <option value="afternoon">Tarde (13:30 - 17:30)</option>
                      <option value="any">Qualquer Turno</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Região / Endereço Domiciliar em SP *</label>
                  <select
                    className="planner-select"
                    value={newDemandForm.neighborhood}
                    onChange={(e) => setNewDemandForm({ ...newDemandForm, neighborhood: e.target.value })}
                  >
                    {Object.keys(SP_PRESET_LOCATIONS).map((neigh) => (
                      <option key={neigh} value={neigh}>{neigh}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    O motor utilizará as coordenadas desta região para calcular o deslocamento na rota urbana.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewDemandModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Salvar Demanda & Recalcular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Fisioterapeuta / Terapeuta */}
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
                    placeholder="Ex: Dr. Thiago Mendes"
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
                    <option value="Fisioterapia Cardiorrespiratória & Motora">Fisioterapia Cardiorrespiratória & Motora</option>
                    <option value="Fisioterapia Motora & Neuroreabilitação">Fisioterapia Motora & Neuroreabilitação</option>
                    <option value="Fonoaudiologia Domiciliar">Fonoaudiologia Domiciliar</option>
                    <option value="Enfermagem Estomaterapeuta & Curativos Complexos">Enfermagem Estomaterapeuta & Curativos Complexos</option>
                    <option value="Terapia Ocupacional Domiciliar">Terapia Ocupacional Domiciliar</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Dias Disponíveis na Semana *</label>
                  <div className="chips-row">
                    {[1, 2, 3, 4, 5].map((d) => {
                      const active = newTherapistForm.availableDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`chip-btn ${active ? 'active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? newTherapistForm.availableDays.filter((x) => x !== d)
                              : [...newTherapistForm.availableDays, d];
                            setNewTherapistForm({ ...newTherapistForm, availableDays: next.length ? next : [d] });
                          }}
                        >
                          {DAY_LABELS[d]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Turnos Disponíveis *</label>
                  <div className="chips-row">
                    {['morning', 'afternoon'].map((sh) => {
                      const active = newTherapistForm.shifts.includes(sh);
                      return (
                        <button
                          key={sh}
                          type="button"
                          className={`chip-btn ${active ? 'active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? newTherapistForm.shifts.filter((x) => x !== sh)
                              : [...newTherapistForm.shifts, sh];
                            setNewTherapistForm({ ...newTherapistForm, shifts: next.length ? next : [sh] });
                          }}
                        >
                          {sh === 'morning' ? 'Manhã' : 'Tarde'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label>Máximo de Sessões / Dia</label>
                    <select
                      className="planner-select"
                      value={newTherapistForm.maxDailySessions}
                      onChange={(e) => setNewTherapistForm({ ...newTherapistForm, maxDailySessions: Number(e.target.value) })}
                    >
                      <option value={2}>2 sessões</option>
                      <option value={3}>3 sessões</option>
                      <option value={4}>4 sessões</option>
                      <option value={5}>5 sessões</option>
                      <option value={6}>6 sessões</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Base de Saída Geográfica</label>
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
                </div>

                <div className="form-group">
                  <label>Vincular Imediatamente aos Pacientes no Care Team:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {therapyDemands.map((dem) => {
                      const isSelected = newTherapistForm.assignedPatientIds.includes(dem.patientId);
                      return (
                        <label
                          key={dem.patientId}
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
                                ? [...newTherapistForm.assignedPatientIds, dem.patientId]
                                : newTherapistForm.assignedPatientIds.filter((id) => id !== dem.patientId);
                              setNewTherapistForm({ ...newTherapistForm, assignedPatientIds: nextIds });
                            }}
                          />
                          {dem.patientName} ({dem.therapyType})
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
    </div>
  );
}
