// mobile/src/data/mockData.ts
import {
  ClinicInfo,
  Professional,
  Patient,
  Appointment,
  ClinicalEvolution,
} from '../types';

export const CLINIC_INFO: ClinicInfo = {
  name: '',
  cnes: '',
  cnpj: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  director: '',
};

export const PROFESSIONALS: Professional[] = [];

export const PATIENTS: Patient[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_CLINICAL_EVOLUTIONS: ClinicalEvolution[] = [];
