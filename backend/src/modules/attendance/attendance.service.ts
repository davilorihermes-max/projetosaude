import { PrismaClient, ScheduleStatus } from '@prisma/client';
import { AddressResolverService } from './address-resolver.service';
import { GeofencingCalculator } from './geofencing.calculator';
import {
  PerformCheckInInput,
  PerformCheckOutInput,
  GeoPoint
} from './attendance.types';

export class AttendanceService {
  private readonly addressResolver: AddressResolverService;

  constructor(private readonly prisma: PrismaClient) {
    this.addressResolver = new AddressResolverService(prisma);
  }

  /**
   * Realiza o Check-in no local do atendimento:
   * 1. Valida se o agendamento existe, pertence ao profissional e está em estado válido.
   * 2. Identifica as coordenadas do endereço ativo (considerando exceções do dia).
   * 3. Calcula a distância por Haversine e avalia o raio de Geofencing (150m).
   * 4. Registra o Attendance e altera o status do Schedule para IN_PROGRESS.
   */
  public async performCheckIn(input: PerformCheckInInput) {
    const checkInTime = input.timestamp || new Date();

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: input.scheduleId },
      include: {
        attendance: true,
        address: true,
        patient: true
      }
    });

    if (!schedule) {
      throw new Error(`Agendamento ${input.scheduleId} não encontrado.`);
    }

    if (schedule.professionalId !== input.professionalId) {
      throw new Error('Acesso negado: o profissional não é o responsável escalado para este atendimento.');
    }

    if (schedule.attendance) {
      throw new Error('Check-in já foi realizado anteriormente para este atendimento.');
    }

    if (
      schedule.status === ScheduleStatus.CANCELLED_BY_PATIENT ||
      schedule.status === ScheduleStatus.CANCELLED_BY_PROFESSIONAL ||
      schedule.status === ScheduleStatus.NO_SHOW
    ) {
      throw new Error(`Não é possível realizar check-in em um atendimento com status '${schedule.status}'.`);
    }

    // Identifica o endereço de referência:
    // Se houver um endereço de exceção para o dia (PatientAddressOverride), ele tem prioridade sobre o padrão
    const activeAddress = await this.addressResolver.resolveActiveAddressForDate(
      schedule.patientId,
      checkInTime
    );

    const targetLocation: GeoPoint = activeAddress.location;
    const checkInLocation: GeoPoint = {
      latitude: input.latitude,
      longitude: input.longitude
    };

    // Valida o raio geográfico de geofencing
    const assessment = GeofencingCalculator.assessCheckIn(
      checkInLocation,
      targetLocation,
      input.overrideReason,
      input.isManualOverride
    );

    // Gravação transacional do check-in e atualização da escala
    return this.prisma.$transaction(async tx => {
      const attendance = await tx.attendance.create({
        data: {
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          professionalId: schedule.professionalId,
          checkInAt: checkInTime,
          checkInLatitude: input.latitude,
          checkInLongitude: input.longitude,
          checkInDistanceMeters: assessment.distanceMeters,
          checkInStatus: assessment.status
        }
      });

      await tx.schedule.update({
        where: { id: schedule.id },
        data: {
          status: ScheduleStatus.IN_PROGRESS
        }
      });

      return {
        attendance,
        assessment,
        addressUsed: activeAddress
      };
    });
  }

  /**
   * Realiza o Check-out ao término da sessão:
   * 1. Valida existência do check-in correspondente.
   * 2. Calcula a duração real do atendimento em minutos.
   * 3. Registra as coordenadas de saída e atualiza o Schedule para COMPLETED.
   */
  public async performCheckOut(input: PerformCheckOutInput) {
    const checkOutTime = input.timestamp || new Date();

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: input.attendanceId },
      include: { schedule: true }
    });

    if (!attendance) {
      throw new Error(`Registro de atendimento ${input.attendanceId} não encontrado.`);
    }

    if (attendance.professionalId !== input.professionalId) {
      throw new Error('Acesso negado: o profissional não é o autor do check-in deste atendimento.');
    }

    if (attendance.checkOutAt) {
      throw new Error('Check-out já foi concluído anteriormente para este atendimento.');
    }

    const durationMilliseconds = checkOutTime.getTime() - attendance.checkInAt.getTime();
    if (durationMilliseconds < 0) {
      throw new Error('Horário de check-out não pode ser anterior ao horário de check-in.');
    }

    const actualDurationMin = Math.round(durationMilliseconds / (1000 * 60));

    return this.prisma.$transaction(async tx => {
      const updatedAttendance = await tx.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutAt: checkOutTime,
          checkOutLatitude: input.latitude,
          checkOutLongitude: input.longitude,
          actualDurationMin
        }
      });

      await tx.schedule.update({
        where: { id: attendance.scheduleId },
        data: {
          status: ScheduleStatus.COMPLETED
        }
      });

      return updatedAttendance;
    });
  }
}
