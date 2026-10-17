import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/main.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { FinancialService } from '../src/services/FinancialService.js';

describe('Módulo Financeiro - Fechamento Mensal & Precificação Contextual', () => {
  let server: FastifyInstance;
  let adminToken: string;
  let doctorToken: string;
  let testAdminEmail: string;
  let testDoctorEmail: string;
  let testProfessionalId: string;
  let testPatientId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    server = buildServer();
    await server.ready();

    const timestamp = Date.now();
    testAdminEmail = `financial.admin.${timestamp}@omnisaude.com.br`;
    testDoctorEmail = `financial.doctor.${timestamp}@omnisaude.com.br`;

    // 1. Cria usuário ADMIN
    const adminUser = await prisma.user.create({
      data: {
        name: 'Gestor Financeiro Teste',
        email: testAdminEmail,
        passwordHash: await bcrypt.hash('AdminSecret123!', 10),
        role: 'ADMIN'
      }
    });

    // 2. Cria usuário PROFESSIONAL
    const doctorUser = await prisma.user.create({
      data: {
        name: 'Dr. Lucas Silveira Teste',
        email: testDoctorEmail,
        passwordHash: await bcrypt.hash('DoctorSecret123!', 10),
        role: 'PROFESSIONAL'
      }
    });

    const pro = await prisma.professional.create({
      data: {
        userId: doctorUser.id,
        crm: 'CREFITO-2/ES 99.888-F',
        specialty: 'Fisioterapia Neurofuncional',
        latitude: -20.301,
        longitude: -40.292
      }
    });
    testProfessionalId = pro.id;

    // 3. Cria paciente com endereço
    const patient = await prisma.patient.create({
      data: {
        name: 'Mariana Souza Santos',
        cpf: `999.${Math.floor(Math.random() * 899 + 100)}.123-00`,
        email: `mariana.${timestamp}@exemplo.com`,
        phone: '(27) 99888-7766',
        latitude: -20.315,
        longitude: -40.305,
        address: 'Rua das Flores, 120 - Jardim da Penha, Vitória - ES'
      }
    });
    testPatientId = patient.id;

    // 4. Cria agendamento no mês de Outubro/2026
    const apt = await prisma.appointment.create({
      data: {
        professionalId: testProfessionalId,
        patientId: testPatientId,
        scheduledTime: new Date(Date.UTC(2026, 9, 15, 14, 0, 0)), // 15 de Outubro de 2026
        durationMinutes: 60,
        status: 'COMPLETED'
      }
    });
    testAppointmentId = apt.id;

    // 5. Gera tokens JWT
    adminToken = server.jwt.sign(
      { userId: adminUser.id, role: adminUser.role },
      { expiresIn: '1h' }
    );
    doctorToken = server.jwt.sign(
      { userId: doctorUser.id, role: doctorUser.role },
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Limpeza reversa
    await prisma.settlementItem.deleteMany({
      where: { appointmentId: testAppointmentId }
    });
    await prisma.financialSettlement.deleteMany({
      where: { professionalId: testProfessionalId }
    });
    await prisma.contextualPrice.deleteMany({
      where: { professionalId: testProfessionalId }
    });
    await prisma.appointment.deleteMany({
      where: { id: testAppointmentId }
    });
    await prisma.patient.deleteMany({
      where: { id: testPatientId }
    });
    await prisma.professional.deleteMany({
      where: { id: testProfessionalId }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [testAdminEmail, testDoctorEmail] } }
    });
    await server.close();
  });

  describe('1. Matriz Tridimensional de Preços Contextuais (Hierarquia de Resolução)', () => {
    it('deve utilizar fallback de base (R$ 150) quando nenhuma regra estiver configurada', async () => {
      const res = await FinancialService.resolvePrice(
        testProfessionalId,
        testPatientId,
        'Rua Aleatória, 999'
      );
      expect(res.ruleApplied).toBe('BASE_FALLBACK');
      expect(res.chargedAmount).toBe(150.0);
    });

    it('deve respeitar a regra padrão do paciente (PATIENT_DEFAULT = R$ 180)', async () => {
      await FinancialService.createContextualPrice({
        professionalId: testProfessionalId,
        patientId: testPatientId,
        pricePerSession: 180.0,
        notes: 'Preço base acordado com a família'
      });

      const res = await FinancialService.resolvePrice(
        testProfessionalId,
        testPatientId,
        'Rua Desconhecida, 10'
      );
      expect(res.ruleApplied).toBe('PATIENT_DEFAULT');
      expect(res.chargedAmount).toBe(180.0);
    });

    it('deve priorizar a regra exata de endereço sobre a regra padrão do paciente (EXACT_ADDRESS = R$ 220)', async () => {
      await FinancialService.createContextualPrice({
        professionalId: testProfessionalId,
        patientId: testPatientId,
        address: 'Rua das Flores, 120 - Jardim da Penha, Vitória - ES',
        pricePerSession: 220.0,
        notes: 'Adicional de distância urbana'
      });

      const res = await FinancialService.resolvePrice(
        testProfessionalId,
        testPatientId,
        'Rua das Flores, 120 - Jardim da Penha, Vitória - ES'
      );
      expect(res.ruleApplied).toBe('EXACT_ADDRESS');
      expect(res.chargedAmount).toBe(220.0);
    });
  });

  describe('2. Prévia e Geração do Fechamento Mensal com Snapshots Imutáveis', () => {
    it('deve calcular corretamente a prévia do fechamento para Outubro/2026', async () => {
      const preview = await FinancialService.previewMonthlySettlement({
        year: 2026,
        month: 10,
        professionalId: testProfessionalId
      });

      expect(preview.year).toBe(2026);
      expect(preview.month).toBe(10);
      expect(preview.totalSessions).toBeGreaterThanOrEqual(1);

      const proSummary = preview.professionals.find((p) => p.professionalId === testProfessionalId);
      expect(proSummary).toBeDefined();
      expect(proSummary?.totalGrossAmount).toBe(220.0);
      expect(proSummary?.items[0].chargedAmount).toBe(220.0);
      expect(proSummary?.items[0].ruleApplied).toBe('EXACT_ADDRESS');
    });

    it('deve consolidar o fechamento em DRAFT gravando snapshots imutáveis em transação ACID', async () => {
      const settlement = await FinancialService.generateMonthlySettlement({
        professionalId: testProfessionalId,
        year: 2026,
        month: 10
      });

      expect(settlement.status).toBe('DRAFT');
      expect(settlement.totalSessions).toBe(1);
      expect(settlement.totalGrossAmount).toBe(220.0);
      expect(settlement.items).toHaveLength(1);

      const item = settlement.items[0];
      expect(item.patientNameSnapshot).toBe('Mariana Souza Santos');
      expect(item.addressSnapshot).toContain('Rua das Flores');
      expect(item.chargedAmount).toBe(220.0);
      expect(item.appointmentId).toBe(testAppointmentId);

      // Testa o ciclo de vida do fechamento
      // 1. Submissão para revisão
      const reviewed = await FinancialService.submitForReview(settlement.id);
      expect(reviewed.status).toBe('PENDING_REVIEW');

      // 2. Aprovação pelo Gestor
      const approved = await FinancialService.approveSettlement(settlement.id);
      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedAt).toBeDefined();

      // 3. Liquidação como PAGO
      const paid = await FinancialService.markAsPaid(settlement.id, 'Pago via PIX na conta do profissional');
      expect(paid.status).toBe('PAID');
      expect(paid.paidAt).toBeDefined();
    });

    it('deve impedir que uma sessão já faturada seja incluída em uma nova prévia de fechamento', async () => {
      const previewAfter = await FinancialService.previewMonthlySettlement({
        year: 2026,
        month: 10,
        professionalId: testProfessionalId
      });

      const proSummary = previewAfter.professionals.find((p) => p.professionalId === testProfessionalId);
      expect(proSummary?.items).toHaveLength(0);
      expect(proSummary?.totalGrossAmount).toBe(0);
    });
  });

  describe('3. Rotas HTTP Fastify & Controles de Acesso (RBAC)', () => {
    it('GET /api/financial/summary - deve exigir autenticação', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/financial/summary'
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/financial/summary - deve retornar os KPIs da clínica quando autenticado', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/financial/summary?year=2026&month=10',
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.summary.totalGrossSettled).toBeGreaterThanOrEqual(220);
      expect(json.summary.totalPaidAmount).toBeGreaterThanOrEqual(220);
      expect(json.summary.settlementsCount.paid).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/financial/settlements/generate - deve negar acesso com 403 para perfil PROFESSIONAL', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/financial/settlements/generate',
        headers: {
          authorization: `Bearer ${doctorToken}`
        },
        payload: {
          professionalId: testProfessionalId,
          year: 2026,
          month: 10
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('GET /api/financial/settlements - deve listar fechamentos com sucesso', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/financial/settlements?professionalId=${testProfessionalId}`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.settlements.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/financial/pricing - deve listar preços contextuais', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/api/financial/pricing?professionalId=${testProfessionalId}`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.prices.length).toBeGreaterThanOrEqual(2);
    });
  });
});
