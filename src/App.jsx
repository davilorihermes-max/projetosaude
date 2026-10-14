// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ScheduleView from './components/ScheduleView';
import PatientsView from './components/PatientsView';
import ClinicSettingsView from './components/ClinicSettingsView';
import MonthlyScalePlannerView from './components/MonthlyScalePlannerView';
import NewAppointmentModal from './components/NewAppointmentModal';
import NewPatientModal from './components/NewPatientModal';
import NotificationsModal from './components/NotificationsModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import MobileDeviceSimulator from './components/MobileDeviceSimulator';

import {
  DOCTORS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS
} from './data/mockData';

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

  // Core Data States (with LocalStorage)
  const [doctors, setDoctors] = useState(() => {
    const saved = localStorage.getItem('omnihome_doctors_v3');
    return saved ? JSON.parse(saved) : DOCTORS;
  });

  const [patients, setPatients] = useState(() => {
    const saved = localStorage.getItem('omnihome_patients_v3');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('omnihome_appointments_v3');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  // Active Authenticated User (JWT)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('omnihome_user_v3') || localStorage.getItem('omnihome_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
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
  const [activePatientId, setActivePatientId] = useState(patients[0]?.id || 'pat-1');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [modalInitialPatientId, setModalInitialPatientId] = useState(null);
  const [modalInitialTime, setModalInitialTime] = useState('09:00');
  const [modalInitialDate, setModalInitialDate] = useState('2026-09-28');
  const [modalInitialDuration, setModalInitialDuration] = useState(45);

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSimOpen, setIsMobileSimOpen] = useState(false);

  // Home Care Operational Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      type: 'alert',
      title: 'Acesso Restrito ao Condomínio',
      description: 'Mariana Souza Lima: Portaria exige aviso prévio de 15 min e cadastro na guarita.',
      time: 'Há 15 min'
    },
    {
      id: 'notif-2',
      type: 'lab',
      title: 'Check-in Realizado com Sucesso',
      description: 'Rafael Fontes iniciou atendimento domiciliar em Pinheiros (Roberto Carlos).',
      time: 'Há 25 min'
    },
    {
      id: 'notif-3',
      type: 'info',
      title: 'Confirmação do Cuidador',
      description: 'Cuidadora de Juliana confirmou presença e autorizou entrada para as 14:00.',
      time: 'Há 1 hora'
    }
  ]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('omnihome_doctors_v3', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('omnihome_patients_v3', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('omnihome_appointments_v3', JSON.stringify(appointments));
  }, [appointments]);

  // Sincroniza profissionais cadastrados no backend Fastify/Prisma
  useEffect(() => {
    const fetchBackendProfessionals = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/scheduler/professionals');
        if (res.ok) {
          const data = await res.json();
          if (data.professionals && Array.isArray(data.professionals)) {
            setDoctors((prev) => {
              const existingIds = new Set(prev.map((d) => d.id));
              const newFromBackend = data.professionals
                .filter((p) => !existingIds.has(p.id))
                .map((p) => {
                  const spec = p.specialty || '';
                  const profName = spec.includes('Enfermagem')
                    ? 'Enfermagem'
                    : spec.includes('Fono')
                    ? 'Fonoaudiologia'
                    : spec.includes('Nutri')
                    ? 'Nutrição'
                    : 'Fisioterapia';

                  return {
                    id: p.id,
                    userId: p.userId,
                    name: p.user?.name || 'Profissional',
                    email: p.user?.email || '',
                    profession: profName,
                    specialty: p.specialty || 'Atendimento Multidisciplinar',
                    councilNumber: p.crm || 'Registro Ativo',
                    crm: p.crm || 'Registro Ativo',
                    avatar: p.user?.avatar || null,
                    color: '#0d9488',
                    baseAddress: 'São Paulo - SP',
                    baseCoordinates: {
                      latitude: p.latitude ?? -23.585000,
                      longitude: p.longitude ?? -46.638000
                    }
                  };
                });
              return [...prev, ...newFromBackend];
            });
          }
        }
      } catch (err) {
        console.warn('Sincronização de profissionais com backend ignorada:', err);
      }
    };

    fetchBackendProfessionals();
  }, []);

  // Sincroniza agendamentos do backend Prisma quando houver sessão autenticada
  useEffect(() => {
    const syncBackendAppointments = async () => {
      try {
        const token = localStorage.getItem('omnihome_jwt');
        if (!token) return;

        const res = await fetch('http://localhost:3001/api/scheduler/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.appointments && Array.isArray(data.appointments)) {
            const mapped = data.appointments.map((a) => {
              const dateObj = new Date(a.scheduledTime);
              const dateStr = dateObj.toISOString().slice(0, 10);
              const timeStr = dateObj.toISOString().slice(11, 16);
              const doctorId =
                a.professionalId === 'doc-3' || a.professional?.user?.name?.includes('Rafael')
                  ? 'doc-3'
                  : a.professionalId;

              return {
                id: a.id,
                patientId: a.patientId,
                doctorId,
                date: dateStr,
                time: timeStr,
                type: a.notes || 'Sessão Domiciliar',
                durationMinutes: a.durationMinutes || 45,
                address: a.patient?.address || 'São Paulo - SP',
                notes: a.notes || '',
                status: a.status ? a.status.toLowerCase() : 'scheduled'
              };
            });

            setAppointments((prev) => {
              const backendIds = new Set(mapped.map((m) => m.id));
              const localOnly = prev.filter((p) => !backendIds.has(p.id));
              return [...mapped, ...localOnly];
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

  // Active professional object
  const activeDoctor =
    selectedDoctorId === 'all'
      ? { id: 'all', name: 'Toda a Equipe Multidisciplinar', profession: 'Central Operacional' }
      : (doctors.find((d) => d.id === selectedDoctorId) || doctors[0] || DOCTORS[0]);

  // Actions
  const handleOpenNewProfessional = () => {
    setLoginModalTab('register');
    setIsLoginModalOpen(true);
  };

  const handleRegisterProfessional = (newProfessional, user) => {
    setDoctors((prev) => {
      const filtered = prev.filter((d) => d.id !== newProfessional.id && d.name !== newProfessional.name);
      return [newProfessional, ...filtered];
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
      setDoctors((prev) =>
        prev.map((d) => (d.id === updatedDoctorData.id ? { ...d, ...updatedDoctorData } : d))
      );
    }
    if (updatedUserData) {
      setCurrentUser((prev) => {
        const merged = { ...prev, ...updatedUserData };
        localStorage.setItem('omnihome_user_v3', JSON.stringify(merged));
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

  const handleOpenNewAppointment = (patientId = null, time = '09:00', date = '2026-09-28', duration = 45, docId = null) => {
    setModalInitialPatientId(patientId);
    setModalInitialTime(time);
    setModalInitialDate(date);
    setModalInitialDuration(duration);
    if (docId && docId !== 'all') {
      setSelectedDoctorId(docId);
    }
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (newApt) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  const handleSavePatient = (newPatient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setActivePatientId(newPatient.id);
  };

  const handleResetData = () => {
    setPatients(INITIAL_PATIENTS);
    setAppointments(INITIAL_APPOINTMENTS);
    setDoctors(DOCTORS);
    localStorage.removeItem('omnihome_patients_v3');
    localStorage.removeItem('omnihome_appointments_v3');
    localStorage.removeItem('omnihome_records_v3');
    localStorage.removeItem('omnihome_doctors_v3');
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        type: 'info',
        title: 'Dados Restaurados',
        description: 'Todos os agendamentos, pacientes e equipe foram restaurados para os valores padrão.',
        time: 'Agora'
      },
      ...prev
    ]);
  };

  // Waiting in reception count
  const waitingCount = appointments.filter(
    (a) => a.date === '2026-09-28' && a.status === 'waiting'
  ).length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        waitingCount={waitingCount}
        doctor={activeDoctor}
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
          onOpenNewAppointment={() => handleOpenNewAppointment(null, '09:00', '2026-09-28', 45, activeDoctor?.id)}
          onOpenNewPatient={() => setIsPatientModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadCount={notifications.length}
          onOpenMobileSimulator={() => setIsMobileSimOpen(true)}
        />

        <div className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              appointments={appointments}
              patients={patients}
              doctors={doctors}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewAppointment={() => handleOpenNewAppointment(null, '09:00', '2026-09-28', 45, activeDoctor?.id)}
              onOpenNewPatient={() => setIsPatientModalOpen(true)}
              activeDoctor={activeDoctor}
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
            />
          )}

          {activeTab === 'monthly-planner' && (
            <MonthlyScalePlannerView
              patients={patients}
              doctors={DOCTORS}
              onCommitScaleToAppointments={(newAppointments) => {
                setAppointments((prev) => [...newAppointments, ...prev]);
                setActiveTab('schedule');
              }}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={patients}
              appointments={appointments}
              activeDoctor={activeDoctor}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewPatient={() => setIsPatientModalOpen(true)}
              onOpenNewAppointment={(patId) => handleOpenNewAppointment(patId, '09:00', '2026-09-28', 45, activeDoctor?.id)}
              onNavigateToPlanner={() => setActiveTab('monthly-planner')}
            />
          )}

          {activeTab === 'clinic' && (
            <ClinicSettingsView
              doctors={doctors}
              onResetData={handleResetData}
              onOpenNewProfessional={handleOpenNewProfessional}
            />
          )}
        </div>
      </main>

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
        onClose={() => setIsPatientModalOpen(false)}
        onSavePatient={handleSavePatient}
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
          setCurrentUser(user);
          localStorage.setItem('omnihome_user_v3', JSON.stringify(user));
          localStorage.setItem('omnihome_user', JSON.stringify(user));

          if (user.professional) {
            setDoctors((prev) => {
              if (prev.some((d) => d.id === user.professional.id)) return prev;
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
                avatar: user.avatar || null,
                color: '#0d9488',
                baseAddress: 'São Paulo - SP',
                baseCoordinates: {
                  latitude: user.professional.latitude ?? -23.585,
                  longitude: user.professional.longitude ?? -46.638
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
            } else if (user.name.toLowerCase().includes('camila')) {
              setSelectedDoctorId('doc-4');
            } else if (user.name.toLowerCase().includes('rafael')) {
              setSelectedDoctorId('doc-3');
            }
          }

          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              type: 'info',
              title: 'Login Realizado com Sucesso',
              description: `Conectado como ${user.name} (${user.role}) via Fastify JWT.`,
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
        currentDoctor={activeDoctor}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
      />

      <MobileDeviceSimulator
        isOpen={isMobileSimOpen}
        onClose={() => setIsMobileSimOpen(false)}
        appointments={appointments}
        setAppointments={setAppointments}
        patients={patients}
        doctors={doctors}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
      />
    </div>
  );
}
