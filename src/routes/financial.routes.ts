// src/routes/financial.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { FinancialService } from '../services/FinancialService.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

export const financialRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  /**
   * GET /api/financial/summary
   * Resumo de KPIs financeiros da clínica (Faturamento bruto, pendente, aprovado, pago, ticket médio)
   */
  app.get<{
    Querystring: { year?: string; month?: string; professionalId?: string };
  }>(
    '/summary',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const year = request.query.year ? parseInt(request.query.year, 10) : undefined;
      const month = request.query.month ? parseInt(request.query.month, 10) : undefined;
      let professionalId = request.query.professionalId;

      // Profissionais só podem consultar seu próprio resumo, a menos que sejam ADMIN
      if (request.user.role !== 'ADMIN') {
        const pro = await prisma.professional.findFirst({
          where: { userId: request.user.userId }
        });
        if (pro) {
          professionalId = pro.id;
        }
      }

      const summary = await FinancialService.getFinancialSummary({
        year,
        month,
        professionalId
      });

      return reply.status(200).send({
        success: true,
        summary
      });
    }
  );

  /**
   * GET /api/financial/preview
   * Prévia em tempo real do fechamento mensal sem gravar dados
   */
  app.get<{
    Querystring: {
      year?: string;
      month?: string;
      professionalId?: string;
      periodType?: string;
    };
  }>(
    '/preview',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const now = new Date();
      const year = request.query.year ? parseInt(request.query.year, 10) : now.getFullYear();
      const month = request.query.month ? parseInt(request.query.month, 10) : now.getMonth() + 1;
      const periodType = request.query.periodType || 'MONTHLY';
      let professionalId = request.query.professionalId;

      // Se for profissional comum, restringe à sua própria prévia
      if (request.user.role !== 'ADMIN') {
        // Encontra o professionalId a partir do userId
        const { prisma } = await import('../lib/prisma.js');
        const pro = await prisma.professional.findFirst({
          where: { userId: request.user.userId }
        });
        if (pro) {
          professionalId = pro.id;
        }
      }

      const preview = await FinancialService.previewMonthlySettlement({
        year,
        month,
        professionalId,
        periodType
      });

      return reply.status(200).send({
        success: true,
        preview
      });
    }
  );

  /**
   * POST /api/financial/settlements/generate
   * Consolida o fechamento mensal com snapshots imutáveis em status DRAFT
   */
  app.post<{
    Body: {
      professionalId: string;
      year: number;
      month: number;
      periodType?: string;
      allowUnpricedOverride?: boolean;
    };
  }>(
    '/settlements/generate',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { professionalId, year, month, periodType, allowUnpricedOverride } = request.body || {};

      if (!professionalId || !year || !month) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campos professionalId, year e month são obrigatórios.'
        });
      }

      try {
        const settlement = await FinancialService.generateMonthlySettlement({
          professionalId,
          year,
          month,
          periodType,
          allowUnpricedOverride
        });

        return reply.status(201).send({
          success: true,
          message: 'Fechamento gerado com sucesso em status DRAFT.',
          settlement
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message || 'Erro ao gerar fechamento financeiro.'
        });
      }
    }
  );

  /**
   * GET /api/financial/settlements
   * Listagem de fechamentos financeiros consolidados
   */
  app.get<{
    Querystring: {
      professionalId?: string;
      status?: string;
      periodType?: string;
    };
  }>(
    '/settlements',
    { preHandler: [authenticate] },
    async (request, reply) => {
      let professionalId = request.query.professionalId;

      if (request.user.role !== 'ADMIN') {
        const { prisma } = await import('../lib/prisma.js');
        const pro = await prisma.professional.findFirst({
          where: { userId: request.user.userId }
        });
        if (pro) {
          professionalId = pro.id;
        }
      }

      const settlements = await FinancialService.listSettlements({
        professionalId,
        status: request.query.status,
        periodType: request.query.periodType
      });

      return reply.status(200).send({
        success: true,
        count: settlements.length,
        settlements
      });
    }
  );

  /**
   * GET /api/financial/settlements/:id
   * Detalhes de um fechamento específico com extrato completo dos atendimentos
   */
  app.get<{ Params: { id: string } }>(
    '/settlements/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const settlement = await FinancialService.getSettlementById(request.params.id);
        return reply.status(200).send({
          success: true,
          settlement
        });
      } catch (err: any) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: err.message || 'Fechamento não encontrado.'
        });
      }
    }
  );

  /**
   * PATCH /api/financial/settlements/:id/review
   * Envia fechamento de DRAFT para PENDING_REVIEW
   */
  app.patch<{ Params: { id: string } }>(
    '/settlements/:id/review',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const updated = await FinancialService.submitForReview(request.params.id);
        return reply.status(200).send({
          success: true,
          message: 'Fechamento enviado para revisão com sucesso.',
          settlement: updated
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * PATCH /api/financial/settlements/:id/approve
   * Aprovação formal do fechamento pelo Gestor (requer ADMIN)
   */
  app.patch<{ Params: { id: string } }>(
    '/settlements/:id/approve',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const updated = await FinancialService.approveSettlement(request.params.id);
        return reply.status(200).send({
          success: true,
          message: 'Fechamento aprovado com sucesso.',
          settlement: updated
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * PATCH /api/financial/settlements/:id/pay
   * Marca repasse como PAGO (requer ADMIN)
   */
  app.patch<{ Params: { id: string }; Body: { notes?: string } }>(
    '/settlements/:id/pay',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const updated = await FinancialService.markAsPaid(
          request.params.id,
          request.body?.notes
        );
        return reply.status(200).send({
          success: true,
          message: 'Fechamento liquidado como PAGO.',
          settlement: updated
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * DELETE /api/financial/settlements/:id
   * Cancela fechamento e libera as sessões (requer ADMIN)
   */
  app.delete<{ Params: { id: string } }>(
    '/settlements/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const updated = await FinancialService.cancelSettlement(request.params.id);
        return reply.status(200).send({
          success: true,
          message: 'Fechamento cancelado e atendimentos liberados.',
          settlement: updated
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * GET /api/financial/pricing
   * Lista matriz de preços contextuais
   */
  app.get<{
    Querystring: { professionalId?: string; patientId?: string };
  }>(
    '/pricing',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const prices = await FinancialService.listContextualPrices({
        professionalId: request.query.professionalId,
        patientId: request.query.patientId
      });
      return reply.status(200).send({
        success: true,
        count: prices.length,
        prices
      });
    }
  );

  /**
   * POST /api/financial/pricing
   * Cadastra nova regra de preço na matriz (Profissional x Paciente x Endereço)
   */
  app.post<{
    Body: {
      professionalId: string;
      patientId: string;
      address?: string | null;
      pricePerSession: number;
      notes?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
    };
  }>(
    '/pricing',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { professionalId, patientId, pricePerSession } = request.body || {};

      if (!professionalId || !patientId || pricePerSession === undefined) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campos professionalId, patientId e pricePerSession são obrigatórios.'
        });
      }

      try {
        const created = await FinancialService.createContextualPrice(request.body);
        return reply.status(201).send({
          success: true,
          message: 'Regra de precificação cadastrada com sucesso.',
          price: created
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * PUT /api/financial/pricing/:id
   * Atualiza regra de precificação existente
   */
  app.put<{
    Params: { id: string };
    Body: {
      pricePerSession?: number;
      notes?: string;
      address?: string | null;
      effectiveTo?: string;
    };
  }>(
    '/pricing/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        const updated = await FinancialService.updateContextualPrice(
          request.params.id,
          request.body
        );
        return reply.status(200).send({
          success: true,
          message: 'Regra de precificação atualizada com sucesso.',
          price: updated
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );

  /**
   * DELETE /api/financial/pricing/:id
   * Remove regra de precificação
   */
  app.delete<{ Params: { id: string } }>(
    '/pricing/:id',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      try {
        await FinancialService.deleteContextualPrice(request.params.id);
        return reply.status(200).send({
          success: true,
          message: 'Regra de precificação removida com sucesso.'
        });
      } catch (err: any) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: err.message
        });
      }
    }
  );
};
