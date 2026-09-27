import { SettlementPeriodType, SettlementStatus } from '@prisma/client';

export type PricingRuleType = 'EXACT_ADDRESS' | 'PATIENT_DEFAULT' | 'NOT_CONFIGURED';

export interface PricingResolution {
  chargedAmount: number;
  ruleApplied: PricingRuleType;
  contextualPriceId?: string;
}

export interface SettlementPreviewItem {
  attendanceId: string;
  scheduleId: string;
  patientId: string;
  patientName: string;
  executedAt: Date;
  addressId: string;
  addressFormatted: string;
  chargedAmount: number;
  ruleApplied: PricingRuleType;
}

export interface UnpricedAttendanceAlert {
  attendanceId: string;
  scheduleId: string;
  patientId: string;
  patientName: string;
  executedAt: Date;
  addressId: string;
  reason: string;
}

export interface SettlementPreviewResult {
  professionalId: string;
  professionalName: string;
  councilRegistration: string;
  periodType: SettlementPeriodType;
  periodStart: Date;
  periodEnd: Date;
  totalEligibleSessions: number;
  totalGrossAmount: number;
  items: SettlementPreviewItem[];
  unpricedAttendances: UnpricedAttendanceAlert[];
}

export interface GenerateSettlementInput {
  professionalId: string;
  periodType: SettlementPeriodType;
  periodStart: Date;
  periodEnd: Date;
  allowUnpricedOverride?: boolean;
}
