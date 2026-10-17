// mobile/src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Appointment,
  Patient,
  Professional,
  ClinicalEvolution,
  CheckInRecord,
  CheckOutRecord,
  UserRole,
} from '../types';
import {
  INITIAL_APPOINTMENTS,
  PATIENTS,
  PROFESSIONALS,
  INITIAL_CLINICAL_EVOLUTIONS,
} from '../data/mockData';
import { estimateUrbanDistanceKm } from './geofence';

const CLOUD_API_URL = 'https://omnihomecare.vercel.app';

const KEYS = {
  PROFESSIONALS: '@omnisaude_professionals_v3',
  APPOINTMENTS: '@omnisaude_appointments_v3',
  PATIENTS: '@omnisaude_patients_v3',
  EVOLUTIONS: '@omnisaude_evolutions_v3',
  ACTIVE_ROLE: '@omnisaude_role',
  ACTIVE_PROFESSIONAL: '@omnisaude_prof',
  DARK_MODE: '@omnisaude_darkmode',
};

export class AppStorage {
  static async getProfessionals(): Promise<Professional[]> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/api/scheduler/professionals`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.professionals) && json.professionals.length > 0) {
          const mapped: Professional[] = json.professionals.map((p: any) => ({
            id: p.id,
            name: p.user?.name || 'Profissional',
            profession: 'Fisioterapia',
            specialty: p.specialty || 'Fisioterapia Domiciliar',
            councilNumber: p.crm || 'Registro Ativo',
            avatar: '',
            color: '#0d9488',
            baseAddress: 'Grande Vitória - ES',
            baseCoordinates: {
              latitude: p.latitude ?? -20.3012,
              longitude: p.longitude ?? -40.2925,
            },
          }));
          await AsyncStorage.setItem(KEYS.PROFESSIONALS, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch {
      // Offline fallback
    }
    try {
      const data = await AsyncStorage.getItem(KEYS.PROFESSIONALS);
      return data ? JSON.parse(data) : PROFESSIONALS;
    } catch {
      return PROFESSIONALS;
    }
  }

  static async getPatients(): Promise<Patient[]> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/api/scheduler/patients`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.patients) && json.patients.length > 0) {
          const mapped: Patient[] = json.patients.map((p: any) => ({
            id: p.id,
            name: p.name,
            age: 68,
            gender: 'Domiciliar',
            cpf: p.cpf || '',
            birthDate: '',
            phone: p.phone || '(27) 99999-0000',
            email: p.email || '',
            insurance: 'Home Care Integral',
            insuranceNumber: '',
            address: p.address || 'Grande Vitória - ES',
            accessNotes: 'Atendimento domiciliar autorizado',
            caregiver: 'Familiar / Cuidador no local',
            mobilityStatus: 'Reabilitação Domiciliar',
            coordinates: {
              latitude: p.latitude ?? -20.3012,
              longitude: p.longitude ?? -40.2925,
            },
            lastVisit: 'Sincronizado',
            avatar: '',
          }));
          await AsyncStorage.setItem(KEYS.PATIENTS, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch {
      // Offline fallback
    }
    try {
      const data = await AsyncStorage.getItem(KEYS.PATIENTS);
      return data ? JSON.parse(data) : PATIENTS;
    } catch {
      return PATIENTS;
    }
  }

  static async getAppointments(patientsList?: Patient[]): Promise<Appointment[]> {
    try {
      const res = await fetch(`${CLOUD_API_URL}/api/scheduler/schedule`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.appointments) && json.appointments.length > 0) {
          const pats = patientsList || (await this.getPatients());
          const patMap = new Map(pats.map((p) => [p.id, p]));
          let prevCoords = { latitude: -20.3012, longitude: -40.2925 };

          const mapped: Appointment[] = json.appointments.slice(0, 40).map((a: any) => {
            const d = new Date(a.scheduledTime);
            const dateStr = d.toISOString().slice(0, 10);
            const timeStr = d.toISOString().slice(11, 16);
            const pat = patMap.get(a.patientId);
            const coords = pat?.coordinates || {
              latitude: a.patient?.latitude ?? -20.3012,
              longitude: a.patient?.longitude ?? -40.2925,
            };
            const distKm = estimateUrbanDistanceKm(prevCoords, coords);
            const transitMin = Math.max(5, Math.round((distKm / 28) * 60));
            prevCoords = coords;

            return {
              id: a.id,
              patientId: a.patientId,
              doctorId: a.professionalId,
              time: timeStr,
              date: dateStr,
              type: a.notes || 'Fisioterapia Domiciliar',
              durationMinutes: a.durationMinutes || 45,
              status: 'scheduled',
              distanceFromPrevKm: distKm,
              transitTimeMinutes: transitMin,
              address: pat?.address || a.patient?.address || 'Grande Vitória - ES',
              notes: a.notes || '',
            };
          });
          await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch {
      // Offline fallback
    }
    try {
      const data = await AsyncStorage.getItem(KEYS.APPOINTMENTS);
      return data ? JSON.parse(data) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  }

  static async saveAppointments(appointments: Appointment[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appointments));
    } catch (e) {
      console.warn('Erro ao salvar atendimentos offline:', e);
    }
  }

  static async savePatient(newPatient: Patient): Promise<Patient[]> {
    try {
      const current = await this.getPatients();
      const updated = [newPatient, ...current];
      await AsyncStorage.setItem(KEYS.PATIENTS, JSON.stringify(updated));
      return updated;
    } catch {
      return PATIENTS;
    }
  }

  static async getEvolutions(): Promise<ClinicalEvolution[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.EVOLUTIONS);
      return data ? JSON.parse(data) : INITIAL_CLINICAL_EVOLUTIONS;
    } catch {
      return INITIAL_CLINICAL_EVOLUTIONS;
    }
  }

  static async saveEvolution(evolution: ClinicalEvolution): Promise<ClinicalEvolution[]> {
    try {
      const current = await this.getEvolutions();
      const updated = [evolution, ...current];
      await AsyncStorage.setItem(KEYS.EVOLUTIONS, JSON.stringify(updated));
      return updated;
    } catch {
      return INITIAL_CLINICAL_EVOLUTIONS;
    }
  }

  static async registerCheckIn(
    appointmentId: string,
    checkInRecord: CheckInRecord
  ): Promise<Appointment[]> {
    const list = await this.getAppointments();
    const updated = list.map((item) => {
      if (item.id === appointmentId) {
        return {
          ...item,
          status: 'in_progress' as const,
          checkIn: checkInRecord,
        };
      }
      return item;
    });
    await this.saveAppointments(updated);
    return updated;
  }

  static async registerCheckOut(
    appointmentId: string,
    checkOutRecord: CheckOutRecord
  ): Promise<Appointment[]> {
    const list = await this.getAppointments();
    const updated = list.map((item) => {
      if (item.id === appointmentId) {
        return {
          ...item,
          status: 'completed' as const,
          checkOut: checkOutRecord,
        };
      }
      return item;
    });
    await this.saveAppointments(updated);
    return updated;
  }

  static async getDarkMode(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.DARK_MODE);
      return val ? JSON.parse(val) : false;
    } catch {
      return false;
    }
  }

  static async setDarkMode(isDark: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.DARK_MODE, JSON.stringify(isDark));
    } catch (e) {
      console.warn(e);
    }
  }

  static async getActiveRole(): Promise<UserRole> {
    try {
      const val = await AsyncStorage.getItem(KEYS.ACTIVE_ROLE);
      return (val as UserRole) || 'PROFESSIONAL';
    } catch {
      return 'PROFESSIONAL';
    }
  }

  static async setActiveRole(role: UserRole): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ACTIVE_ROLE, role);
    } catch (e) {
      console.warn(e);
    }
  }
}
