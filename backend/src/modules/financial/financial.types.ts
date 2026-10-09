import { SettlementPeriodType, SettlementStatus, ScheduleType } from '@prisma/client';

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
  scheduleType: ScheduleType;
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
  scheduleTypeFilter: 'ALL' | 'INSTITUTIONAL_SCALE' | 'AUTONOMOUS_APPOINTMENT';
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
  scheduleTypeFilter?: 'ALL' | 'INSTITUTIONAL_SCALE' | 'AUTONOMOUS_APPOINTMENT';
  allowUnpricedOverride?: boolean;
}

export interface MarkAsPaidInput {
  settlementId: string;
  paidAt?: Date;
  notes?: string;
}

export interface FinancialSummaryFilters {
  startDate?: Date;
  endDate?: Date;
  professionalId?: string;
}

export interface FinancialSummaryResult {
  totalGrossSettled: number;
  totalDraftAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  totalSessionsCount: number;
  averageSessionPrice: number;
  settlementsCount: {
    draft: number;
    pendingReview: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
