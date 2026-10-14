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

const KEYS = {
  APPOINTMENTS: '@omnisaude_appointments',
  PATIENTS: '@omnisaude_patients',
  EVOLUTIONS: '@omnisaude_evolutions',
  ACTIVE_ROLE: '@omnisaude_role',
  ACTIVE_PROFESSIONAL: '@omnisaude_prof',
  DARK_MODE: '@omnisaude_darkmode',
};

export class AppStorage {
  static async getAppointments(): Promise<Appointment[]> {
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

  static async getPatients(): Promise<Patient[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PATIENTS);
      return data ? JSON.parse(data) : PATIENTS;
    } catch {
      return PATIENTS;
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
