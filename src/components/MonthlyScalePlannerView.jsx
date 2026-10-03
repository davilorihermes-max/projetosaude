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
  Layers,
  Save,
  Info,
  CalendarCheck
} from 'lucide-react';
import { MonthlyScaleGenerator } from '../services/monthly-scale-generator';
import './MonthlyScalePlannerView.css';

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

  // Configuração inicial de demandas terapêuticas por paciente
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

  // Configuração de disponibilidade dos profissionais
  const professionalAvailabilities = useMemo(() => [
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
  ], []);

  // Vínculos de Care Team (Restrição de Ouro)
  const careTeams = useMemo(() => [
    { patientId: 'pat-1', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-2', professionalIds: ['doc-1', 'doc-3'] },
    { patientId: 'pat-3', professionalIds: ['doc-1'] }, // Sem fono cadastrada no care team -> gera bottleneck
    { patientId: 'pat-4', professionalIds: ['doc-3'] },
    { patientId: 'pat-5', professionalIds: ['doc-4'] }
  ], []);

  // Estado da escala gerada
  const [scaleResult, setScaleResult] = useState(() => {
    // Execução inicial padrão para Outubro/2026
    const generator = new MonthlyScaleGenerator(28, 12);
    return generator.generateMonthlyScale({
      year: 2026,
      month: 10,
      demands: therapyDemands,
      availabilities: professionalAvailabilities,
      careTeams
    });
  });

  // Handler de geração inteligente
  const handleGenerateScale = () => {
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
        demands: therapyDemands,
        availabilities: professionalAvailabilities,
        careTeams
      });

      setScaleResult(result);
      setIsGenerating(false);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 400);
  };

  // Grava as sessões geradas no estado de agendamentos principal
  const handleCommitScale = () => {
    if (!scaleResult || scaleResult.plannedSessions.length === 0) return;

    if (onCommitScaleToAppointments) {
      // Converte PlannedSession para formato de Appointment
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

  // Dias únicos do mês presentes na escala
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
            Cruzamento automatizado de metas terapêuticas, disponibilidade da equipe de saúde e travas do Care Team.
          </p>
        </div>

        <div className="planner-controls">
          <select
            className="select-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="2026-10">Outubro / 2026</option>
            <option value="2026-11">Novembro / 2026</option>
            <option value="2026-12">Dezembro / 2026</option>
            <option value="2027-01">Janeiro / 2027</option>
          </select>

          <button
            className="btn-generate-scale"
            onClick={handleGenerateScale}
            disabled={isGenerating}
          >
            <Sparkles size={18} />
            {isGenerating ? 'Calculando Escala...' : '⚡ Gerar Escala Mensal'}
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
          Configuração de Demandas & Care Team
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

      {/* Conteúdo da Aba 4: Configuração de Demandas & Care Team */}
      {activeTab === 'demands' && (
        <div className="tab-content">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>
              Parâmetros de Entrada da Escala
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Demandas semanais de cada paciente e as equipes de cuidado habilitadas.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {therapyDemands.map((demand) => {
              const patientCareTeam = careTeams.find((ct) => ct.patientId === demand.patientId);
              const teamDocNames = (patientCareTeam?.professionalIds || [])
                .map((docId) => professionalAvailabilities.find((p) => p.professionalId === docId)?.professionalName || docId);

              return (
                <div key={demand.patientId} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  background: '#f8fafc'
                }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    {demand.patientName}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 600, marginTop: '0.2rem' }}>
                    🩺 {demand.therapyType}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem' }}>
                    Frequência: <strong>{demand.sessionsPerWeek}x / semana</strong> ({demand.durationMinutes} min/sessão)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                    Turno Preferencial: <strong>{demand.preferredShift === 'morning' ? 'Manhã' : demand.preferredShift === 'afternoon' ? 'Tarde' : 'Qualquer'}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                    📍 {demand.address}
                  </div>

                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.78rem'
                  }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Equipe Autorizada (Care Team):</span>
                    <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {teamDocNames.length > 0 ? teamDocNames.map((name, i) => (
                        <span key={i} style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.72rem'
                        }}>
                          {name}
                        </span>
                      )) : (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>Nenhum profissional vinculado</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
