// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ScheduleView from './components/ScheduleView';
import PatientsView from './components/PatientsView';
import ProfessionalsView from './components/ProfessionalsView';
import ClinicSettingsView from './components/ClinicSettingsView';
import MonthlyScalePlannerView, {
  getPlannedAppointments,
  getInitialScaleSavedData,
  SCALE_STORAGE_KEY
} from './components/MonthlyScalePlannerView';
import MonthlyFinancialSettlementView from './components/MonthlyFinancialSettlementView';
import NewAppointmentModal from './components/NewAppointmentModal';
import NewPatientModal from './components/NewPatientModal';
import NewProfessionalModal from './components/NewProfessionalModal';
import NotificationsModal from './components/NotificationsModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import MobileAppView from './components/MobileAppView';

import {
  DOCTORS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS
} from './data/mockData';
import { API_BASE_URL } from './services/apiConfig';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('omnisaude_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('omnisaude_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('omnisaude_theme', 'light');
    }
  }, [darkMode]);

  // Main navigation tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mobile-first simplified view mode (detects mobile screen or URL flag or user preference)
  const [forceDesktopMode, setForceDesktopMode] = useState(() => {
    return localStorage.getItem('omnihome_prefer_desktop') === 'true';
  });
  const [isMobileScreen, setIsMobileScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isSmall = window.innerWidth <= 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isSmall || isMobileUA;
  });

  useEffect(() => {
    const handleResize = () => {
      const isSmall = window.innerWidth <= 768;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileScreen(isSmall || isMobileUA);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper filters to prevent mock/test data contamination from old caches
  const isMockPatient = (p) => {
    if (!p) return true;
    const name = (p.name || '').toLowerCase().trim();
    const id = String(p.id || '');
    const cpf = String(p.cpf || '');
    const address = (p.address || '').toLowerCase();
    return (
      ['pat-1', 'pat-2', 'pat-3', 'cmvbhl9ni0000hi1iamswxf2z', 'cmvbioafs00006my8x76qrx83'].includes(id) ||
      ['123.456.789-00', '12345678901', '284.912.839-44', '910.283.746-11', '418.992.301-85'].includes(cpf) ||
      name.includes('mariana souza') ||
      name.includes('roberto carlos') ||
      name.includes('juliana mendes') ||
      (name === 'ana clara' && address.includes('xv de novembro')) ||
      (name === 'maria silva' && address.includes('rua das flores'))
    );
  };

  const isMockDoctor = (d) => {
    if (!d) return true;
    const name = (d.name || '').toLowerCase().trim();
    const id = String(d.id || '');
    return (
      ['doc-1', 'doc-2', 'doc-3', 'doc-4'].includes(id) ||
      name.includes('lucas silveira') ||
      name.includes('rafael fontes') ||
      name.includes('camila nogueira') ||
      name.includes('fernanda prado')
    );
  };

  // Core Data States (with LocalStorage filtered from stale mock cache)
  const [doctors, setDoctors] = useState(() => {
    const saved = localStorage.getItem('omnihome_doctors_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((d) => !isMockDoctor(d)).map((d) => {
            const emailClean = (d.email || '').toLowerCase().trim();
            if (emailClean === 'sabrinapradolucas@elohabilitar.com.br' && !d.avatar) {
              return { ...d, avatar: '/avatars/sabrina-prado-lucas.png' };
            }
            return d;
          });
          if (filtered.length > 0) return filtered;
        }
      } catch {}
    }
    return DOCTORS;
  });

  const [patients, setPatients] = useState(() => {
    const saved = localStorage.getItem('omnihome_patients_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p) => !isMockPatient(p));
          if (filtered.length > 0) return filtered;
        }
      } catch {}
    }
    return INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState(() => {
    let baseApts = INITIAL_APPOINTMENTS;
    const saved = localStorage.getItem('omnihome_appointments_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (a) =>
              !['pat-1', 'pat-2', 'pat-3', 'cmvbhl9ni0000hi1iamswxf2z', 'cmvbioafs00006my8x76qrx83'].includes(
                a.patientId
              )
          );
          if (filtered.length > 0) baseApts = filtered;
        }
      } catch {}
    }

    // Garante que a escala mensal planejada esteja sempre carregada na agenda
    const hasPlanned = baseApts.some((a) => String(a.id || '').startsWith('apt-plan-'));
    if (!hasPlanned) {
      const planned = getPlannedAppointments(INITIAL_PATIENTS, DOCTORS);
      if (planned.length > 0) {
        return [...planned, ...baseApts.filter((a) => !String(a.id || '').startsWith('apt-plan-'))];
      }
    }
    return baseApts;
  });

  // Active Authenticated User (JWT)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('omnihome_user_v3') || localStorage.getItem('omnihome_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const emailClean = (parsed.email || '').toLowerCase().trim();
          if (emailClean === 'sabrinapradolucas@elohabilitar.com.br' && !parsed.avatar) {
            parsed.avatar = '/avatars/sabrina-prado-lucas.png';
          }
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  // Active Professional & Selected Patient
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => {
    const savedUser = localStorage.getItem('omnihome_user_v3') || localStorage.getItem('omnihome_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        const savedDocs = localStorage.getItem('omnihome_doctors_v3');
        const docsList = savedDocs ? JSON.parse(savedDocs) : DOCTORS;
        const matched = docsList.find(
          (d) =>
            (u.professionalId && d.id === u.professionalId) ||
            (d.userId && d.userId === u.id) ||
            (d.email && u.email && d.email.toLowerCase().trim() === u.email.toLowerCase().trim()) ||
            (d.name && u.name && d.name.toLowerCase().trim() === u.name.toLowerCase().trim())
        );
        if (matched) return matched.id;
        if (u.professionalId) return u.professionalId;
      } catch {}
    }
    return 'all';
  });
  const [activePatientId, setActivePatientId] = useState(patients[0]?.id || null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [modalInitialPatientId, setModalInitialPatientId] = useState(null);
  const [modalInitialTime, setModalInitialTime] = useState('09:00');
  const [modalInitialDate, setModalInitialDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modalInitialDuration, setModalInitialDuration] = useState(45);
  const [scheduleActiveDate, setScheduleActiveDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Home Care Operational Notifications
  const [notifications, setNotifications] = useState([]);

  // Sync to LocalStorage (filtered)
  useEffect(() => {
    localStorage.setItem('omnihome_doctors_v3', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('omnihome_patients_v3', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('omnihome_appointments_v3', JSON.stringify(appointments));
  }, [appointments]);

  // Keep activePatientId valid when patients change
  useEffect(() => {
    if (patients.length > 0) {
      if (!patients.some((p) => p.id === activePatientId)) {
        setActivePatientId(patients[0].id);
      }
    } else {
      setActivePatientId(null);
    }
  }, [patients, activePatientId]);

  // Verifica e sincroniza o perfil do usuário autenticado diretamente no backend em nuvem (GET /api/auth/me)
  useEffect(() => {
    localStorage.removeItem('omnihome_registered_users');
    const verifyCloudProfile = async () => {
      const token = localStorage.getItem('omnihome_jwt');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const emailClean = (data.user.email || '').toLowerCase().trim();
            const enriched = {
              ...data.user,
              avatar: data.user.avatar || (emailClean === 'sabrinapradolucas@elohabilitar.com.br' ? '/avatars/sabrina-prado-lucas.png' : null),
              professionalId: data.user.professional?.id || data.user.professionalId || null
            };
            setCurrentUser(enriched);
            localStorage.setItem('omnihome_user_v3', JSON.stringify(enriched));
            localStorage.setItem('omnihome_user', JSON.stringify(enriched));
          }
        } else if (res.status === 401 || res.status === 404) {
          setCurrentUser(null);
          setSelectedDoctorId('all');
          localStorage.removeItem('omnihome_jwt');
          localStorage.removeItem('omnihome_user_v3');
          localStorage.removeItem('omnihome_user');
        }
      } catch (err) {
        console.warn('Verificação de perfil em nuvem ignorada:', err);
      }
    };
    verifyCloudProfile();
  }, []);

  // Sincroniza profissionais cadastrados no backend Fastify/Prisma
  useEffect(() => {
    const fetchBackendProfessionals = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/scheduler/professionals`);
        if (res.ok) {
          const data = await res.json();
          if (data.professionals && Array.isArray(data.professionals)) {
            const mapped = data.professionals
              .filter((p) => !isMockDoctor(p.user))
              .map((p) => {
                const spec = (p.specialty || '').toLowerCase();
                const crm = (p.crm || '').toUpperCase();
                let profName = 'Fisioterapia';
                if (crm.startsWith('CRM') || spec.includes('cardio') || spec.includes('médic')) {
                  profName = 'Medicina';
                } else if (crm.startsWith('COREN') || spec.includes('enferm')) {
                  profName = 'Enfermagem';
                } else if (crm.startsWith('CRFA') || spec.includes('fono')) {
                  profName = 'Fonoaudiologia';
                } else if (crm.startsWith('CRN') || spec.includes('nutri')) {
                  profName = 'Nutrição';
                } else if (crm.startsWith('CREFITO') || spec.includes('fisio')) {
                  profName = 'Fisioterapia';
                } else if (p.profession) {
                  profName = p.profession;
                }

                const emailClean = (p.user?.email || '').toLowerCase().trim();
                const defaultAvatar = emailClean === 'sabrinapradolucas@elohabilitar.com.br' ? '/avatars/sabrina-prado-lucas.png' : null;

                return {
                  id: p.id,
                  userId: p.userId,
                  name: p.user?.name || 'Profissional',
                  email: p.user?.email || '',
                  profession: profName,
                  specialty: p.specialty || 'Atendimento Multidisciplinar',
                  councilNumber: p.crm || 'Registro Ativo',
                  crm: p.crm || 'Registro Ativo',
                  avatar: p.user?.avatar || defaultAvatar,
                  color: '#0d9488',
                  baseAddress: 'Praia do Canto, Vitória - ES',
                  baseCoordinates: {
                    latitude: p.latitude ?? -20.301200,
                    longitude: p.longitude ?? -40.292500
                  }
                };
              });

            // Deduplica por email e id
            const uniqueDocs = [];
            const seen = new Set();
            for (const doc of mapped) {
              const key = doc.email ? doc.email.toLowerCase().trim() : doc.id;
              if (!seen.has(key)) {
                seen.add(key);
                uniqueDocs.push(doc);
              }
            }

            setDoctors((prev) => {
              const prevMap = new Map(prev.map((d) => [d.id, d]));
              const mergedDocs = uniqueDocs.map((doc) => {
                const old = prevMap.get(doc.id) || prev.find((d) => d.email && d.email.toLowerCase() === doc.email?.toLowerCase());
                return {
                  ...doc,
                  avatar: doc.avatar || old?.avatar || null,
                  color: old?.color || doc.color
                };
              });

              const backendIds = new Set(mergedDocs.map((d) => d.id));
              const localWithoutAccount = prev.filter(
                (d) => d.hasAccount === false && !backendIds.has(d.id) && !isMockDoctor(d)
              );
              const combined = [...mergedDocs, ...localWithoutAccount];
              localStorage.setItem('omnihome_doctors_v3', JSON.stringify(combined));
              return combined;
            });
          }
        }
      } catch (err) {
        console.warn('Sincronização de profissionais com backend ignorada:', err);
      }
    };

    fetchBackendProfessionals();
  }, []);

  // Sincroniza pacientes cadastrados no backend Fastify/Prisma
  useEffect(() => {
    const fetchBackendPatients = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/scheduler/patients`);
        if (res.ok) {
          const data = await res.json();
          if (data.patients && Array.isArray(data.patients)) {
            let localById = {};
            try {
              const savedLocal = JSON.parse(localStorage.getItem('omnihome_patients_v3') || '[]');
              if (Array.isArray(savedLocal)) {
                for (const lp of savedLocal) {
                  if (lp && lp.id) localById[lp.id] = lp;
                }
              }
            } catch {}

            const mapped = data.patients
              .filter((p) => !isMockPatient(p))
              .map((p) => {
                const existing = localById[p.id] || {};
                const cleanPhone = p.phone && p.phone !== '(11) 98765-4321' ? p.phone : existing.phone && existing.phone !== '(11) 98765-4321' ? existing.phone : '';
                const cleanInsurance = existing.insurance && existing.insurance !== 'Unimed Pleno' ? existing.insurance : '';
                const cleanInsuranceNumber = existing.insuranceNumber && existing.insuranceNumber !== 'PLEN-001' ? existing.insuranceNumber : '';
                const cleanCaregiver = existing.caregiver && existing.caregiver !== 'Cuidador(a) cadastrado' ? existing.caregiver : '';
                const cleanAccessNotes = existing.accessNotes && existing.accessNotes !== 'Residência autorizada para atendimento domiciliar' ? existing.accessNotes : '';
                const cleanMobility = existing.mobilityStatus && existing.mobilityStatus !== 'Deambula sem auxílio' ? existing.mobilityStatus : '';

                return {
                  id: p.id,
                  name: p.name,
                  cpf: p.cpf || existing.cpf || '',
                  birthDate: existing.birthDate && existing.birthDate !== '1990-01-01' ? existing.birthDate : '',
                  age: existing.age && existing.age !== 45 ? existing.age : null,
                  gender: existing.gender || '',
                  phone: cleanPhone,
                  email: p.email || existing.email || '',
                  insurance: cleanInsurance,
                  insuranceNumber: cleanInsuranceNumber,
                  address: p.address || existing.address || '',
                  latitude: p.latitude ?? existing.latitude,
                  longitude: p.longitude ?? existing.longitude,
                  caregiver: cleanCaregiver,
                  accessNotes: cleanAccessNotes,
                  mobilityStatus: cleanMobility,
                  avatar: null,
                  demands: existing.demands || [],
                  careTeamProfessionalIds:
                    existing.careTeamProfessionalIds ||
                    (Array.isArray(p.careTeamMembers) ? p.careTeamMembers.map((m) => m.professionalId) : []),
                  careTeamMembers: p.careTeamMembers || existing.careTeamMembers || []
                };
              });

            const uniquePats = [];
            const seen = new Set();
            for (const pat of mapped) {
              const key = pat.cpf && pat.cpf !== '000.000.000-00' ? pat.cpf : pat.id;
              if (!seen.has(key)) {
                seen.add(key);
                uniquePats.push(pat);
              }
            }

            setPatients(uniquePats);
            localStorage.setItem('omnihome_patients_v3', JSON.stringify(uniquePats));
          }
        }
      } catch (err) {
        console.warn('Sincronização de pacientes com backend ignorada:', err);
      }
    };

    fetchBackendPatients();
  }, []);

  // Sincroniza agendamentos do backend Prisma (com ou sem sessão autenticada)
  useEffect(() => {
    const syncBackendAppointments = async () => {
      try {
        const token = localStorage.getItem('omnihome_jwt');
        const endpoint = token
          ? `${API_BASE_URL}/api/scheduler/appointments`
          : `${API_BASE_URL}/api/scheduler/schedule`;

        const res = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.ok) {
          const data = await res.json();
          if (data.appointments && Array.isArray(data.appointments)) {
            const mapped = data.appointments
              .filter((a) => !isMockPatient(a.patient))
              .map((a) => {
                const dateObj = new Date(a.scheduledTime);
                const dateStr = dateObj.toISOString().slice(0, 10);
                const timeStr = dateObj.toISOString().slice(11, 16);
                const doctorId = a.professionalId;

                return {
                  id: a.id,
                  patientId: a.patientId,
                  doctorId,
                  date: dateStr,
                  time: timeStr,
                  type: a.notes || 'Sessão Domiciliar',
                  durationMinutes: a.durationMinutes || 45,
                  address: a.patient?.address || 'Vitória - ES',
                  notes: a.notes || '',
                  status: a.status ? a.status.toLowerCase() : 'scheduled'
                };
              });

            setAppointments((prev) => {
              const backendIds = new Set(mapped.map((m) => m.id));
              let localPlanned = prev.filter(
                (p) => String(p.id || '').startsWith('apt-plan-') && !backendIds.has(p.id)
              );
              if (localPlanned.length === 0) {
                const recovered = getPlannedAppointments(patients, doctors);
                localPlanned = recovered.filter((p) => !backendIds.has(p.id));
              }
              const combined = [...mapped, ...localPlanned];
              localStorage.setItem('omnihome_appointments_v3', JSON.stringify(combined));
              return combined;
            });
          }
        }
      } catch (err) {
        console.warn('Sincronização com backend ignorada:', err);
      }
    };

    syncBackendAppointments();
  }, [currentUser]);


  // Sincroniza automaticamente o profissional selecionado com o usuário autenticado
  useEffect(() => {
    if (currentUser && doctors.length > 0) {
      const matched = doctors.find(
        (d) =>
          (currentUser.professionalId && d.id === currentUser.professionalId) ||
          (d.userId && d.userId === currentUser.id) ||
          (d.email && currentUser.email && d.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) ||
          (d.name && currentUser.name && d.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
      );
      if (matched && selectedDoctorId !== matched.id) {
        setSelectedDoctorId((prev) => (prev === 'all' ? prev : matched.id));
      }
    }
  }, [currentUser, doctors]);

  // Active professional object (never null so child views never crash when doctors list is empty)
  const activeDoctor =
    selectedDoctorId === 'all'
      ? { id: 'all', name: 'Toda a Equipe Multidisciplinar', profession: 'Central Operacional' }
      : (doctors.find((d) => d.id === selectedDoctorId) ||
          doctors[0] ||
          (currentUser
            ? {
                id: currentUser.professional?.id || currentUser.professionalId || 'all',
                name: currentUser.name || 'Profissional',
                profession: 'Fisioterapia',
                specialty: currentUser.professional?.specialty || 'Fisioterapia Motora',
                councilNumber: currentUser.professional?.crm || 'Registro Ativo',
                crm: currentUser.professional?.crm || 'Registro Ativo',
                color: '#0d9488'
              }
            : { id: 'all', name: 'Toda a Equipe Multidisciplinar', profession: 'Central Operacional' }));

  // Profissional correspondente ao usuário logado (mesmo quando o filtro da agenda está em 'all')
  const currentUserDoctor =
    (currentUser &&
      doctors.find(
        (d) =>
          (currentUser.professionalId && d.id === currentUser.professionalId) ||
          (currentUser.professional?.id && d.id === currentUser.professional.id) ||
          (d.userId && d.userId === currentUser.id) ||
          (d.email && currentUser.email && d.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
      )) ||
    (activeDoctor && activeDoctor.id !== 'all' ? activeDoctor : null);

  // Actions
  const handleOpenNewProfessional = () => {
    setIsProfessionalModalOpen(true);
  };

  const handleSaveNewProfessional = (newDoctor, credentials) => {
    setDoctors((prev) => {
      const filtered = prev.filter((d) => d.id !== newDoctor.id && d.name !== newDoctor.name);
      const updated = [newDoctor, ...filtered];
      localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
      return updated;
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'success',
        title: 'Novo Profissional Credenciado',
        description: `${newDoctor.name} (${newDoctor.profession || 'Especialista'}) cadastrado(a) com sucesso na nuvem. Acesso: ${credentials?.login || newDoctor.email}`,
        time: 'Agora'
      },
      ...prev
    ]);
  };

  const handleDeleteProfessional = async (docId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/scheduler/professionals/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDoctors((prev) => {
          const updated = prev.filter((d) => d.id !== docId);
          localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
          return updated;
        });
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}`,
            type: 'info',
            title: 'Profissional Descredenciado',
            description: 'Profissional removido da equipe com sucesso no servidor em nuvem.',
            time: 'Agora'
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.warn('Erro ao remover profissional na nuvem:', err);
    }
  };

  const handleRegisterProfessional = (newProfessional, user) => {
    setDoctors((prev) => {
      const filtered = prev.filter((d) => d.id !== newProfessional.id && d.name !== newProfessional.name);
      const updated = [newProfessional, ...filtered];
      localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
      return updated;
    });
    setSelectedDoctorId(newProfessional.id);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('omnihome_user_v3', JSON.stringify(user));
    }
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Novo Profissional Credenciado',
        description: `${newProfessional.name} (${newProfessional.profession}) adicionado(a) ao Care Team.`,
        time: 'Agora'
      },
      ...prev
    ]);
  };

  const handleUpdateProfile = (updatedDoctorData, updatedUserData) => {
    if (updatedDoctorData) {
      setDoctors((prev) => {
        const exists = prev.some((d) => d.id === updatedDoctorData.id);
        const updated = exists
          ? prev.map((d) => (d.id === updatedDoctorData.id ? { ...d, ...updatedDoctorData } : d))
          : [updatedDoctorData, ...prev];
        localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
        return updated;
      });
    }
    if (updatedUserData) {
      setCurrentUser((prev) => {
        const merged = { ...prev, ...updatedUserData };
        localStorage.setItem('omnihome_user_v3', JSON.stringify(merged));
        localStorage.setItem('omnihome_user', JSON.stringify(merged));
        return merged;
      });
    }
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Perfil Atualizado',
        description: 'Seus dados e registro profissional foram atualizados.',
        time: 'Agora'
      },
      ...prev
    ]);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedDoctorId('all');
    localStorage.removeItem('omnihome_jwt');
    localStorage.removeItem('omnihome_user_v3');
    localStorage.removeItem('omnihome_user');
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'alert',
        title: 'Sessão Encerrada',
        description: 'Você desconectou da conta com sucesso.',
        time: 'Agora'
      },
      ...prev
    ]);
  };

  // Actions
  const handleUpdateAppointmentStatus = (aptId, newStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === aptId ? { ...apt, status: newStatus } : apt))
    );
  };

  const handleOpenPatientRecord = (patientId) => {
    if (patientId) {
      setActivePatientId(patientId);
    }
    setActiveTab('patients');
  };

  const handleOpenNewAppointment = (patientId = null, time = '09:00', date = null, duration = 45, docId = null) => {
    const defaultDate = date || new Date().toISOString().slice(0, 10);
    setModalInitialPatientId(patientId);
    setModalInitialTime(time);
    setModalInitialDate(defaultDate);
    setModalInitialDuration(duration);
    if (docId && docId !== 'all') {
      setSelectedDoctorId(docId);
    }
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (newApt) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  const handleRegisterDoctorWithoutAccount = async (newDoctor) => {
    setDoctors((prev) => {
      const filtered = prev.filter((d) => d.id !== newDoctor.id);
      const updated = [newDoctor, ...filtered];
      localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
      return updated;
    });
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Fisioterapeuta Cadastrado na Escala',
        description: `${newDoctor.name} (${newDoctor.specialty}) foi adicionado(a) na equipe em nuvem.`,
        time: 'Agora'
      },
      ...prev
    ]);

    try {
      const generatedEmail =
        newDoctor.email ||
        `${newDoctor.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')}.${Date.now()}@equipe.omnisaude.com.br`;
      const res = await fetch(`${API_BASE_URL}/api/scheduler/professionals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDoctor.name,
          email: generatedEmail,
          profession: newDoctor.profession || 'Fisioterapia',
          specialty: newDoctor.specialty,
          councilNumber: newDoctor.councilNumber || newDoctor.crm || 'Registro Ativo',
          crm: newDoctor.crm || 'Registro Ativo',
          latitude: newDoctor.baseCoordinates?.latitude ?? -20.3012,
          longitude: newDoctor.baseCoordinates?.longitude ?? -40.2925
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.professional?.id) {
          setDoctors((prev) => {
            const updated = prev.map((d) =>
              d.id === newDoctor.id ? { ...d, id: data.professional.id, userId: data.professional.userId } : d
            );
            localStorage.setItem('omnihome_doctors_v3', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Persistência de profissional no backend em nuvem ignorada:', err);
    }
  };

  const handleSavePatient = async (savedPatient) => {
    setPatients((prev) => {
      const exists = prev.some((p) => p.id === savedPatient.id);
      if (exists) {
        return prev.map((p) => (p.id === savedPatient.id ? savedPatient : p));
      }
      return [savedPatient, ...prev];
    });
    setActivePatientId(savedPatient.id);

    // Persiste no backend em nuvem
    try {
      const token = localStorage.getItem('omnihome_jwt');
      const res = await fetch(`${API_BASE_URL}/api/scheduler/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: savedPatient.id,
          name: savedPatient.name,
          cpf: savedPatient.cpf,
          email: savedPatient.email,
          phone: savedPatient.phone,
          address: savedPatient.address,
          latitude: savedPatient.latitude,
          longitude: savedPatient.longitude,
          professionalId: selectedDoctorId !== 'all' ? selectedDoctorId : undefined,
          careTeamProfessionalIds: savedPatient.careTeamProfessionalIds
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patient?.id) {
          setPatients((prev) =>
            prev.map((p) =>
              p.id === savedPatient.id
                ? {
                    ...p,
                    id: data.patient.id,
                    careTeamMembers: data.patient.careTeamMembers || p.careTeamMembers
                  }
                : p
            )
          );
        }
      }
    } catch (err) {
      console.warn('Persistência do paciente no backend ignorada:', err);
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (!patientId) return;
    setPatients((prev) => {
      const updated = prev.filter((p) => p.id !== patientId);
      localStorage.setItem('omnihome_patients_v3', JSON.stringify(updated));
      return updated;
    });
    setAppointments((prev) => {
      const updated = prev.filter((a) => a.patientId !== patientId);
      localStorage.setItem('omnihome_appointments_v3', JSON.stringify(updated));
      return updated;
    });

    try {
      await fetch(`${API_BASE_URL}/api/scheduler/patients/${patientId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Exclusão de paciente no backend ignorada:', err);
    }
  };

  const handleResetData = () => {
    setPatients(INITIAL_PATIENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setDoctors(DOCTORS);
    localStorage.removeItem('omnihome_patients_v3');
    localStorage.removeItem('omnihome_appointments_v3');
    localStorage.removeItem('omnihome_records_v3');
    localStorage.removeItem('omnihome_doctors_v3');
    localStorage.removeItem('omnihome_registered_users');
    localStorage.removeItem('omnihome_jwt');
    localStorage.removeItem('omnihome_user_v3');
    localStorage.removeItem('omnihome_user');
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Dados Locais Limpos',
        description: 'Todos os agendamentos, pacientes e equipe salvos localmente foram limpos.',
        time: 'Agora'
      },
      ...prev
    ]);
  };

  const handleLoadOrSyncPlannedScale = () => {
    const planned = getPlannedAppointments(patients, doctors);
    if (planned && planned.length > 0) {
      setAppointments((prev) => {
        const nonPlan = prev.filter((a) => !String(a.id || '').startsWith('apt-plan-'));
        const merged = [...planned, ...nonPlan];
        localStorage.setItem('omnihome_appointments_v3', JSON.stringify(merged));
        return merged;
      });
      if (planned[0]?.date) {
        setScheduleActiveDate(planned[0].date);
      }
      return planned.length;
    }
    return 0;
  };

  // Waiting in reception count
  const todayStr = new Date().toISOString().slice(0, 10);
  const waitingCount = appointments.filter(
    (a) => a.date === todayStr && a.status === 'waiting'
  ).length;

  const isMobileAppActive = isMobileScreen && !forceDesktopMode;

  return (
    <div className="app-container">
      {isMobileAppActive ? (
        <MobileAppView
          appointments={appointments}
          patients={patients}
          doctors={doctors}
          currentUser={currentUser}
          activeDoctor={currentUserDoctor || activeDoctor}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onOpenNewAppointment={handleOpenNewAppointment}
          onOpenLoginModal={() => {
            setLoginModalTab('login');
            setIsLoginModalOpen(true);
          }}
          onSwitchToDesktop={() => {
            setForceDesktopMode(true);
            localStorage.setItem('omnihome_prefer_desktop', 'true');
          }}
          onLoadPlannedScale={handleLoadOrSyncPlannedScale}
        />
      ) : (
        <>
          {/* Sidebar Navigation */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            waitingCount={waitingCount}
            doctor={currentUserDoctor || activeDoctor}
        currentUser={currentUser}
        onOpenLoginModal={() => {
          setLoginModalTab('login');
          setIsLoginModalOpen(true);
        }}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          doctors={doctors}
          currentUser={currentUser}
          onOpenLoginModal={() => {
            setLoginModalTab('login');
            setIsLoginModalOpen(true);
          }}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenNewProfessional={handleOpenNewProfessional}
          onOpenNewAppointment={() => handleOpenNewAppointment(null, '09:00', todayStr, 45, activeDoctor?.id)}
          onOpenNewPatient={() => setIsPatientModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadCount={notifications.length}
        />

        <div className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewAppointment={() => handleOpenNewAppointment(null, '09:00', todayStr, 45, activeDoctor?.id)}
              onOpenNewPatient={() => setIsPatientModalOpen(true)}
              activeDoctor={activeDoctor}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewAppointment={handleOpenNewAppointment}
              selectedDoctorId={selectedDoctorId}
              setSelectedDoctorId={setSelectedDoctorId}
              initialSelectedDate={scheduleActiveDate}
              onLoadPlannedScale={handleLoadOrSyncPlannedScale}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'monthly-planner' && (
            <MonthlyScalePlannerView
              patients={patients}
              doctors={doctors}
              onCommitScaleToAppointments={async (newAppointments, scaleResult) => {
                // 1. Atualização imediata do estado local da UI
                setAppointments((prev) => {
                  const nonPlanApts = prev.filter((a) => !a.id.startsWith('apt-plan-'));
                  const merged = [...newAppointments, ...nonPlanApts];
                  localStorage.setItem('omnihome_appointments_v3', JSON.stringify(merged));
                  return merged;
                });
                if (newAppointments.length > 0 && newAppointments[0].date) {
                  setScheduleActiveDate(newAppointments[0].date);
                }
                setActiveTab('schedule');

                // 2. Persistência atômica no banco de dados em nuvem PostgreSQL
                if (scaleResult && Array.isArray(scaleResult.plannedSessions) && scaleResult.plannedSessions.length > 0) {
                  try {
                    const token = localStorage.getItem('omnihome_jwt');
                    const res = await fetch(`${API_BASE_URL}/api/scheduler/monthly-plan/commit`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({
                        sessions: scaleResult.plannedSessions
                      })
                    });

                    if (res.ok) {
                      const data = await res.json().catch(() => ({}));
                      setNotifications((prev) => [
                        {
                          id: `notif-${Date.now()}`,
                          type: 'success',
                          title: 'Escala Mensal Sincronizada na Nuvem',
                          description: `${data.committedCount || scaleResult.plannedSessions.length} sessões gravadas com sucesso no PostgreSQL.`,
                          time: 'Agora'
                        },
                        ...prev
                      ]);
                    }
                  } catch (commitErr) {
                    console.warn('Persistência da escala mensal em nuvem em contingência:', commitErr);
                  }
                }
              }}
              onRegisterDoctorWithoutAccount={handleRegisterDoctorWithoutAccount}
              onNavigateToPatientsView={() => setActiveTab('patients')}
              onUpdatePatient={handleSavePatient}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={patients}
              appointments={appointments}
              activeDoctor={activeDoctor}
              searchQuery={searchQuery}
              doctors={doctors}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewPatient={() => {
                setEditingPatient(null);
                setIsPatientModalOpen(true);
              }}
              onEditPatient={(pat) => {
                setEditingPatient(pat);
                setIsPatientModalOpen(true);
              }}
              onOpenNewAppointment={(patId) => handleOpenNewAppointment(patId, '09:00', todayStr, 45, activeDoctor?.id)}
              onNavigateToPlanner={() => setActiveTab('monthly-planner')}
              searchQuery={searchQuery}
              onDeletePatient={handleDeletePatient}
            />
          )}

          {activeTab === 'professionals' && (
            <ProfessionalsView
              doctors={doctors}
              onOpenNewProfessional={handleOpenNewProfessional}
              onDeleteProfessional={handleDeleteProfessional}
              onSelectDoctorForSchedule={(docId) => {
                setSelectedDoctorId(docId);
                setActiveTab('schedule');
              }}
              onNavigateToPlanner={() => setActiveTab('monthly-planner')}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'financial' && (
            <MonthlyFinancialSettlementView
              doctors={doctors}
              patients={patients}
              appointments={appointments}
              currentUser={currentUser}
              selectedDoctorId={selectedDoctorId}
              setSelectedDoctorId={setSelectedDoctorId}
            />
          )}

          {activeTab === 'clinic' && (
            <ClinicSettingsView
              doctors={doctors}
              onResetData={handleResetData}
              onOpenNewProfessional={handleOpenNewProfessional}
              onNavigateToProfessionals={() => setActiveTab('professionals')}
            />
          )}
        </div>
      </main>
      </>
      )}

      {/* Modals */}
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        patients={patients}
        doctors={doctors}
        onSaveAppointment={handleSaveAppointment}
        initialPatientId={modalInitialPatientId}
        initialDoctorId={selectedDoctorId !== 'all' ? selectedDoctorId : doctors[0]?.id}
        initialTime={modalInitialTime}
        initialDate={modalInitialDate}
        initialDuration={modalInitialDuration}
      />

      <NewPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setEditingPatient(null);
        }}
        onSavePatient={handleSavePatient}
        doctors={doctors}
        initialPatientData={editingPatient}
      />

      <NewProfessionalModal
        isOpen={isProfessionalModalOpen}
        onClose={() => setIsProfessionalModalOpen(false)}
        onSaveProfessional={handleSaveNewProfessional}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClearAll={() => setNotifications([])}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        initialTab={loginModalTab}
        onRegisterSuccess={handleRegisterProfessional}
        onLoginSuccess={(user, token) => {
          const userEmail = (user.email || '').toLowerCase().trim();
          const userAvatar = user.avatar || (userEmail === 'sabrinapradolucas@elohabilitar.com.br' ? '/avatars/sabrina-prado-lucas.png' : null);
          const enrichedUser = {
            ...user,
            avatar: userAvatar
          };
          setCurrentUser(enrichedUser);
          localStorage.setItem('omnihome_user_v3', JSON.stringify(enrichedUser));
          localStorage.setItem('omnihome_user', JSON.stringify(enrichedUser));

          if (user.professional) {
            setDoctors((prev) => {
              if (prev.some((d) => d.id === user.professional.id)) {
                return prev.map((d) =>
                  d.id === user.professional.id
                    ? { ...d, avatar: d.avatar || userAvatar }
                    : d
                );
              }
              const prof = {
                id: user.professional.id,
                userId: user.id,
                name: user.name,
                email: user.email,
                profession: user.professional.specialty?.includes('Enfermagem')
                  ? 'Enfermagem'
                  : user.professional.specialty?.includes('Fono')
                  ? 'Fonoaudiologia'
                  : user.professional.specialty?.includes('Nutri')
                  ? 'Nutrição'
                  : 'Fisioterapia',
                specialty: user.professional.specialty || 'Atendimento Multidisciplinar',
                councilNumber: user.professional.crm || 'Registro Ativo',
                crm: user.professional.crm || 'Registro Ativo',
                avatar: userAvatar,
                color: '#0d9488',
                baseAddress: 'Praia do Canto, Vitória - ES',
                baseCoordinates: {
                  latitude: user.professional.latitude ?? -20.3012,
                  longitude: user.professional.longitude ?? -40.2925
                }
              };
              return [prof, ...prev];
            });
            setSelectedDoctorId(user.professional.id);
          } else {
            const matched = doctors.find(
              (d) =>
                (user.professionalId && d.id === user.professionalId) ||
                (d.userId && d.userId === user.id) ||
                (d.email && user.email && d.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
                (d.name && user.name && d.name.toLowerCase().trim() === user.name.toLowerCase().trim())
            );
            if (matched) {
              setSelectedDoctorId(matched.id);
            } else if (user.professionalId) {
              setSelectedDoctorId(user.professionalId);
            }
          }

          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              type: 'info',
              title: 'Login Realizado com Sucesso',
              description: `Conectado como ${user.name} (${user.role === 'ADMIN' ? 'Administrador' : 'Profissional'}).`,
              time: 'Agora'
            },
            ...prev
          ]);
        }}
        onLogout={handleLogout}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        currentDoctor={currentUserDoctor || activeDoctor}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />
    </div>
  );
}
