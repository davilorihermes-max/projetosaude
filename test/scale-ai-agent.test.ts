// test/scale-ai-agent.test.ts
import { describe, it, expect } from 'vitest';
import { ScaleAIAgent, ScaleAgentContext } from '../src/services/scale-ai-agent.js';
import { MonthlyScaleGenerator } from '../src/services/monthly-scale-generator.js';

describe('ScaleAIAgent - Chatbot do Gestor com Tool Calling', () => {
  const locPraiaDoCanto = { latitude: -20.3012, longitude: -40.2925 };
  const locEnseadaSua = { latitude: -20.3155, longitude: -40.2915 };

  const mockPatients = [
    {
      patientId: 'pat-1',
      patientName: 'Mariana Souza Lima',
      neighborhood: 'Enseada do Suá, Vitória - ES',
      address: 'Rua José Alexandre Buaiz, 300 - Enseada do Suá, Vitória - ES',
      location: locEnseadaSua,
      demands: [
        {
          id: 'dem-1',
          therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
          sessionsPerWeek: 2,
          durationMinutes: 45,
          preferredShift: 'morning'
        }
      ]
    }
  ];

  const mockProfessionals = [
    {
      professionalId: 'doc-1',
      professionalName: 'Dr. Rafael Fontes',
      specialty: 'Fisioterapia Cardiorrespiratória & Motora',
      baseLocation: locPraiaDoCanto,
      weekdayWindows: {
        1: { enabled: true, startTime: '08:00', endTime: '18:00' },
        2: { enabled: true, startTime: '08:00', endTime: '18:00' }
      }
    },
    {
      professionalId: 'doc-sergio',
      professionalName: 'Dr. Sérgio Hermes',
      specialty: 'Fisioterapia Neurofuncional',
      baseLocation: locPraiaDoCanto,
      weekdayWindows: {
        1: { enabled: true, startTime: '07:00', endTime: '13:00' },
        3: { enabled: true, startTime: '07:00', endTime: '13:00' }
      }
    }
  ];

  // Cenário inicial: Dr. Rafael NÃO está no Care Team da Mariana (gargalo crítico)
  const initialCareTeams = [
    { patientId: 'pat-1', professionalIds: [] }
  ];

  const generator = new MonthlyScaleGenerator(30, 10);
  const initialResult = generator.generateMonthlyScale({
    year: 2026,
    month: 10,
    demands: [
      {
        id: 'dem-1',
        patientId: 'pat-1',
        patientName: 'Mariana Souza Lima',
        therapyType: 'Fisioterapia Cardiorrespiratória & Motora',
        sessionsPerWeek: 2,
        durationMinutes: 45,
        location: locEnseadaSua,
        address: 'Rua José Alexandre Buaiz, 300'
      }
    ],
    availabilities: mockProfessionals,
    careTeams: initialCareTeams
  });

  const baseContext: ScaleAgentContext = {
    scaleResult: initialResult,
    patientsWithDemands: mockPatients,
    professionalAvailabilities: mockProfessionals,
    careTeams: initialCareTeams,
    fixedAppointments: []
  };

  it('deve diagnosticar gargalos da escala identificando falta de profissional no Care Team', () => {
    const diag = ScaleAIAgent.diagnoseScale(baseContext);

    expect(diag.summaryText).toContain('gargalo');
    expect(diag.bottlenecksAnalysis.length).toBeGreaterThan(0);
    expect(diag.bottlenecksAnalysis[0]).toContain('Mariana Souza Lima');
    expect(diag.bottlenecksAnalysis[0]).toContain('Care Team');
    expect(diag.suggestedActions.length).toBeGreaterThan(0);
    expect(diag.suggestedActions[0].actionType).toBe('ADD_CARE_TEAM');
  });

  it('deve processar comando em linguagem natural para adicionar profissional ao Care Team', () => {
    const res = ScaleAIAgent.processMessage(
      'Adicione o Dr. Rafael Fontes ao Care Team da Mariana',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.actionExecuted?.type).toBe('ADD_CARE_TEAM');
    expect(res.newCareTeams).toBeDefined();

    const marianaTeam = res.newCareTeams?.find((c) => c.patientId === 'pat-1');
    expect(marianaTeam?.professionalIds).toContain('doc-1');
  });

  it('deve processar comando para habilitar domingo na agenda do profissional', () => {
    const res = ScaleAIAgent.processMessage(
      'Habilite domingo para o Dr. Rafael das 08:00 às 12:00',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.newProfessionalAvailabilities).toBeDefined();

    const prof = res.newProfessionalAvailabilities?.find((p) => p.professionalId === 'doc-1');
    expect(prof?.weekdayWindows?.[0]).toBeDefined();
    expect(prof?.weekdayWindows?.[0].enabled).toBe(true);
    expect(prof?.weekdayWindows?.[0].startTime).toBe('08:00');
    expect(prof?.weekdayWindows?.[0].endTime).toBe('12:00');
  });

  it('deve processar comando para alterar frequência semanal do paciente', () => {
    const res = ScaleAIAgent.processMessage(
      'Mude a frequência da Mariana para 3 vezes na semana',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.newPatientsWithDemands).toBeDefined();

    const pat = res.newPatientsWithDemands?.find((p) => p.patientId === 'pat-1');
    expect(pat?.demands[0].sessionsPerWeek).toBe(3);
  });

  it('deve processar comando para fixar atendimento prioritário', () => {
    const res = ScaleAIAgent.processMessage(
      'Fixe Mariana com Dr. Rafael na terça às 09:00',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.newFixedAppointments).toBeDefined();
    expect(res.newFixedAppointments?.length).toBe(1);
    expect(res.newFixedAppointments?.[0].time).toBe('09:00');
    expect(res.newFixedAppointments?.[0].dayOfWeek).toBe(2);
  });

  it('deve responder com diagnóstico detalhado ao perguntar "Por que a Mariana não fechou a escala?"', () => {
    const res = ScaleAIAgent.processMessage(
      'Por que a Mariana não fechou a meta de atendimentos?',
      baseContext
    );

    expect(res.mutated).toBe(false);
    expect(res.reply).toContain('Mariana Souza Lima');
    expect(res.reply).toContain('Care Team');
    expect(res.suggestedActions).toBeDefined();
  });

  it('deve processar comando para atualizar endereço do paciente e recalcular coordenadas', () => {
    const res = ScaleAIAgent.processMessage(
      'Mudar endereço de Mariana para Av. Dante Michelini, 3500 - Jardim Camburi, Vitória - ES',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.actionExecuted?.type).toBe('UPDATE_PATIENT_ADDRESS');
    expect(res.newPatientsWithDemands).toBeDefined();

    const pat = res.newPatientsWithDemands?.find((p) => p.patientId === 'pat-1');
    expect(pat?.address).toContain('Jardim Camburi');
    expect(pat?.location?.latitude).toBeCloseTo(-20.2678, 2);
    expect(pat?.location?.longitude).toBeCloseTo(-40.2842, 2);
  });

  it('NÃO deve mutar a agenda nem alterar para 8-18h ao perguntar "quais os horários disponíveis de sergio"', () => {
    const res = ScaleAIAgent.processMessage(
      'quais os horários disponíveis de sergio',
      baseContext
    );

    // Deve ser apenas consulta, SEM mutação
    expect(res.mutated).toBe(false);
    expect(res.newProfessionalAvailabilities).toBeUndefined();

    // A resposta deve ser específica da agenda do Sérgio, com os horários cadastrados
    expect(res.reply).toContain('Dr. Sérgio Hermes');
    expect(res.reply).toContain('Fisioterapia Neurofuncional');
    expect(res.reply).toContain('07:00 às 13:00');
    expect(res.reply).not.toContain('A jornada de Dr. Sérgio Hermes foi atualizada para 08:00 às 18:00');
  });

  it('deve responder com a agenda de Sérgio e NÃO com o menu genérico ao perguntar "sobre a disponibilidade de sergio"', () => {
    const res = ScaleAIAgent.processMessage(
      'sobre a disponibilidade de sergio',
      baseContext
    );

    expect(res.mutated).toBe(false);
    expect(res.reply).toContain('Agenda & Disponibilidade: Dr. Sérgio Hermes');
    expect(res.reply).toContain('Segunda-feira');
    expect(res.reply).toContain('Quarta-feira');
    // NÃO deve responder com as dicas genéricas de boas-vindas do copiloto
    expect(res.reply).not.toContain('Olá! Sou seu Copiloto Inteligente');
  });

  it('deve responder adequadamente a "qual a disponibilidade de sergio"', () => {
    const res = ScaleAIAgent.processMessage(
      'qual a disponibilidade de sergio',
      baseContext
    );

    expect(res.mutated).toBe(false);
    expect(res.reply).toContain('Dr. Sérgio Hermes');
    expect(res.reply).toContain('07:00 às 13:00');
  });

  it('deve permitir mutação quando houver comando e horários explícitos (ex: "mudar o horário de sergio na segunda para 08:00 às 17:00")', () => {
    const res = ScaleAIAgent.processMessage(
      'mudar o horário de sergio na segunda para 08:00 às 17:00',
      baseContext
    );

    expect(res.mutated).toBe(true);
    expect(res.newProfessionalAvailabilities).toBeDefined();

    const prof = res.newProfessionalAvailabilities?.find((p) => p.professionalId === 'doc-sergio');
    expect(prof?.weekdayWindows?.[1].startTime).toBe('08:00');
    expect(prof?.weekdayWindows?.[1].endTime).toBe('17:00');
  });
});
