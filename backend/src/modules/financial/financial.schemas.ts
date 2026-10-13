import { z } from 'zod';
import { SettlementPeriodType, SettlementStatus, ScheduleType } from '@prisma/client';

/**
 * Schemas Zod para Validação Estrita do Módulo Financeiro
 * Padrão Arquitetural: Validação na borda com mensagens claras em português.
 */

export const createContextualPriceSchema = z
  .object({
    professionalId: z.string().uuid('ID do profissional inválido'),
    patientId: z.string().uuid('ID do paciente inválido'),
    addressId: z.string().uuid('ID do endereço inválido').nullable().optional(),
    pricePerSession: z
      .number({ invalid_type_error: 'O valor da sessão deve ser numérico' })
      .positive('O valor por sessão deve ser estritamente positivo (maior que zero)'),
    notes: z.string().max(255, 'Observações devem ter no máximo 255 caracteres').optional(),
    effectiveFrom: z.coerce.date({ invalid_type_error: 'Data inicial de vigência inválida' }),
    effectiveTo: z.coerce.date({ invalid_type_error: 'Data final de vigência inválida' }).nullable().optional()
  })
  .refine(
    data => !data.effectiveTo || data.effectiveTo >= data.effectiveFrom,
    {
      message: 'A data final de vigência (effectiveTo) não pode ser anterior à data de início (effectiveFrom).',
      path: ['effectiveTo']
    }
  );

export const updateContextualPriceSchema = z.object({
  pricePerSession: z
    .number({ invalid_type_error: 'O valor da sessão deve ser numérico' })
    .positive('O valor por sessão deve ser estritamente positivo')
    .optional(),
  notes: z.string().max(255).nullable().optional(),
  effectiveTo: z.coerce.date().nullable().optional()
});

const baseSettlementPeriodSchema = z.object({
  professionalId: z.string().uuid('ID do profissional inválido'),
  periodType: z.nativeEnum(SettlementPeriodType, {
    errorMap: () => ({ message: 'Tipo de período inválido (WEEKLY, DECENDIAL, MONTHLY)' })
  }),
  periodStart: z.coerce.date({ invalid_type_error: 'Data de início inválida' }),
  periodEnd: z.coerce.date({ invalid_type_error: 'Data de término inválida' }),
  scheduleTypeFilter: z
    .enum(['ALL', 'INSTITUTIONAL_SCALE', 'AUTONOMOUS_APPOINTMENT'])
    .default('ALL')
});

export const previewSettlementSchema = baseSettlementPeriodSchema.refine(
  data => data.periodStart <= data.periodEnd,
  {
    message: 'A data de início do período não pode ser posterior à data de término.',
    path: ['periodStart']
  }
);

export const generateSettlementSchema = baseSettlementPeriodSchema
  .extend({
    allowUnpricedOverride: z.boolean().default(false)
  })
  .refine(data => data.periodStart <= data.periodEnd, {
    message: 'A data de início do período não pode ser posterior à data de término.',
    path: ['periodStart']
  });

export const cancelSettlementSchema = z.object({
  settlementId: z.string().uuid('ID do fechamento inválido'),
  reason: z.string().min(5, 'A justificativa de cancelamento deve ter pelo menos 5 caracteres').max(255).optional()
});

export const listSettlementsQuerySchema = z.object({
  professionalId: z.string().uuid().optional(),
  status: z.nativeEnum(SettlementStatus).optional(),
  periodType: z.nativeEnum(SettlementPeriodType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export type CreateContextualPriceInput = z.infer<typeof createContextualPriceSchema>;
export type UpdateContextualPriceInput = z.infer<typeof updateContextualPriceSchema>;
export type PreviewSettlementQuery = z.infer<typeof previewSettlementSchema>;
export type GenerateSettlementQuery = z.infer<typeof generateSettlementSchema>;
export type CancelSettlementInput = z.infer<typeof cancelSettlementSchema>;
export type ListSettlementsQuery = z.infer<typeof listSettlementsQuerySchema>;
