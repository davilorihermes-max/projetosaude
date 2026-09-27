import { CheckInStatus } from '@prisma/client';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface ResolvedAddressInfo {
  addressId: string;
  label: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  location: GeoPoint;
  isOverride: boolean;
  overrideReason?: string;
}

export interface PerformCheckInInput {
  scheduleId: string;
  professionalId: string;
  latitude: number;
  longitude: number;
  timestamp?: Date;
  overrideReason?: string;
  isManualOverride?: boolean;
}

export interface PerformCheckOutInput {
  attendanceId: string;
  professionalId: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
}

export interface CheckInAssessment {
  status: CheckInStatus;
  distanceMeters: number;
  isWithinGeofence: boolean;
  message: string;
}
