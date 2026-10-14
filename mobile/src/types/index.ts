// mobile/src/types/index.ts

export type UserRole = 'PROFESSIONAL' | 'MANAGER' | 'PATIENT';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Professional {
  id: string;
  name: string;
  profession: string;
  specialty: string;
  councilNumber: string;
  avatar: string;
  color: string;
  baseAddress: string;
  baseCoordinates: GeoLocation;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  insurance: string;
  insuranceNumber: string;
  address: string;
  accessNotes: string;
  caregiver: string;
  mobilityStatus: string;
  coordinates: GeoLocation;
  lastVisit: string;
  avatar: string;
}

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  time: string;
  date: string;
  type: string;
  durationMinutes: number;
  status: AppointmentStatus;
  distanceFromPrevKm: number;
  transitTimeMinutes: number;
  address: string;
  notes?: string;
  checkIn?: CheckInRecord;
  checkOut?: CheckOutRecord;
}

export type CheckInStatus = 'ON_SITE_VALIDATED' | 'OUT_OF_BOUNDS_ACCEPTED' | 'MANUAL_OVERRIDE';

export interface CheckInAssessment {
  status: CheckInStatus;
  distanceMeters: number;
  isWithinGeofence: boolean;
  message: string;
}

export interface CheckInRecord {
  id: string;
  appointmentId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  status: CheckInStatus;
  overrideReason?: string;
  isWithinGeofence: boolean;
}

export interface CheckOutRecord {
  timestamp: string;
  latitude: number;
  longitude: number;
  observations?: string;
}

export interface ClinicalEvolution {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  date: string;
  time: string;
  vitals: {
    bloodPressure?: string;
    heartRate?: number;
    oxygenSaturation?: number;
    temperature?: number;
    glucose?: number;
  };
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ClinicInfo {
  name: string;
  cnes: string;
  cnpj: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  director: string;
}
