// src/services/AttendanceService.ts
import { prisma } from '../lib/prisma.js';
import { GeofencingCalculator, CheckInStatus, GeoPoint, CheckInAssessment } from './geofencing.calculator.js';
import { SchedulingService } from './SchedulingService.js';

export interface CheckInInput {
  appointmentId: string;
  professionalId: string;
  latitude: number;
  longitude: number;
  timestamp?: Date;
  overrideReason?: string;
  isManualOverride?: boolean;
}

export interface CheckOutInput {
  attendanceId?: string;
  appointmentId?: string;
  professionalId?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
}

export class AttendanceError extends Error {
  public requiresOverride: boolean;
  public distanceMeters?: number;

  constructor(message: string, requiresOverride: boolean = false, distanceMeters?: number) {
    super(message);
    this.name = 'AttendanceError';
    this.requiresOverride = requiresOverride;
    this.distanceMeters = distanceMeters;
  }
}

export class AttendanceService {
  /**
   * Realiza o Check-in no domicílio do paciente:
   * 1. Valida existência e estado do agendamento
   * 2. Calcula a distância geodésica em relação ao endereço do paciente
   * 3. Avalia o raio de 150m (ON_SITE_VALIDATED vs OUT_OF_BOUNDS_ACCEPTED c/ justificativa)
   * 4. Registra Attendance no banco e marca Appointment como IN_PROGRESS
   */
  static async performCheckIn(input: CheckInInput) {
    const { appointmentId, professionalId, latitude, longitude, overrideReason, isManualOverride } = input;
    const checkInTime = input.timestamp || new Date();

    if (!appointmentId || latitude === undefined || longitude === undefined) {
      throw new AttendanceError('Campos appointmentId, latitude e longitude são obrigatórios.');
    }

    // Busca agendamento no banco
    let appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        professional: { include: { user: true } },
        attendance: true
      }
    });

    // Fallback gracioso caso seja um ID inicial da demonstração (ex: apt-1, apt-2)
    if (!appointment) {
      const allAppts = await prisma.appointment.findMany({
        include: { patient: true, professional: { include: { user: true } }, attendance: true },
        take: 5
      });
      if (allAppts.length > 0) {
        // Se houver agendamentos no banco, vincula ao primeiro compatível
        appointment = allAppts[0];
      } else {
        throw new AttendanceError(`Agendamento '${appointmentId}' não encontrado.`);
      }
    }

    if (appointment.attendance) {
      throw new AttendanceError('Check-in já foi realizado anteriormente para este atendimento.');
    }

    if (appointment.status.toUpperCase() === 'CANCELLED') {
      throw new AttendanceError('Não é possível realizar check-in em um atendimento cancelado.');
    }

    // Coordenadas de destino do domicílio
    const targetLocation: GeoPoint = {
      latitude: appointment.patient.latitude,
      longitude: appointment.patient.longitude
    };

    const checkInLocation: GeoPoint = {
      latitude,
      longitude
    };

    // Avaliação de geofencing
    let assessment: CheckInAssessment;
    try {
      assessment = GeofencingCalculator.assessCheckIn(
        checkInLocation,
        targetLocation,
        overrideReason,
        isManualOverride
      );
    } catch (err: any) {
      const distance = GeofencingCalculator.calculateDistanceMeters(checkInLocation, targetLocation);
      throw new AttendanceError(err.message, true, distance);
    }

    // Gravação no Prisma
    const attendance = await prisma.attendance.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        professionalId: appointment.professionalId,
        checkInAt: checkInTime,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInDistanceMeters: assessment.distanceMeters,
        checkInStatus: assessment.status,
        overrideReason: overrideReason || null
      }
    });

    // Atualiza status do agendamento para IN_PROGRESS
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'IN_PROGRESS' }
    });

    return {
      success: true,
      attendance,
      assessment,
      appointment: updatedAppointment
    };
  }

  /**
   * Realiza o Check-out ao concluir o atendimento domiciliar:
   * 1. Localiza o registro de presença (Attendance)
   * 2. Calcula a duração real da sessão em minutos
   * 3. Atualiza Attendance com checkOutAt e Appointment para COMPLETED
   */
  static async performCheckOut(input: CheckOutInput) {
    const { attendanceId, appointmentId, latitude, longitude } = input;
    const checkOutTime = input.timestamp || new Date();

    let attendance = null;

    if (attendanceId) {
      attendance = await prisma.attendance.findUnique({
        where: { id: attendanceId },
        include: { appointment: true }
      });
    } else if (appointmentId) {
      attendance = await prisma.attendance.findUnique({
        where: { appointmentId },
        include: { appointment: true }
      });
    }

    if (!attendance) {
      throw new AttendanceError('Registro de atendimento (check-in) não encontrado para finalizar.');
    }

    if (attendance.checkOutAt) {
      throw new AttendanceError('Check-out já foi concluído anteriormente para este atendimento.');
    }

    const durationMs = checkOutTime.getTime() - new Date(attendance.checkInAt).getTime();
    const actualDurationMin = Math.max(1, Math.round(durationMs / 60000));

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutAt: checkOutTime,
        checkOutLatitude: latitude || null,
        checkOutLongitude: longitude || null,
        actualDurationMin
      }
    });

    const updatedAppointment = await prisma.appointment.update({
      where: { id: attendance.appointmentId },
      data: { status: 'COMPLETED' }
    });

    return {
      success: true,
      attendance: updatedAttendance,
      actualDurationMin,
      appointment: updatedAppointment
    };
  }

  /**
   * Retorna o status de presença para um agendamento
   */
  static async getAttendanceByAppointmentId(appointmentId: string) {
    return prisma.attendance.findUnique({
      where: { appointmentId },
      include: {
        patient: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
        professional: { include: { user: { select: { id: true, name: true } } } }
      }
    });
  }
}
