// backend/src/modules/scheduling/scheduling.types.ts
import { Schedule, ScheduleStatus, ScheduleType } from '@prisma/client';

export interface PlannedSessionInput {
  id?: string;
  patientId: string;
  professionalId: string;
  date: string; // Formato YYYY-MM-DD
  time: string; // Formato HH:mm
  durationMinutes: number;
  therapyType: string;
  addressId?: string; // Opcional: ID de endereço específico
  notes?: string;
  isFixed?: boolean; // Indica se foi um atendimento travado
}

export interface CommitMonthlyScaleInput {
  year: number;
  month: number; // 1 a 12
  batchId?: string; // Identificador UUID do lote da escala gerada
  sessions: PlannedSessionInput[];
  overwriteExisting?: boolean; // Se true, substitui com segurança agendamentos prévios do mesmo período
}

export interface CommitMonthlyScaleResult {
  success: boolean;
  batchId: string;
  year: number;
  month: number;
  committedCount: number;
  schedules: Schedule[];
  message: string;
}

export interface ScheduleQueryFilter {
  batchId?: string;
  professionalId?: string;
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ScheduleStatus;
  type?: ScheduleType;
}
