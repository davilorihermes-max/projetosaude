// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ScheduleView from './components/ScheduleView';
import PatientsView from './components/PatientsView';
import ClinicSettingsView from './components/ClinicSettingsView';
import NewAppointmentModal from './components/NewAppointmentModal';
import NewPatientModal from './components/NewPatientModal';
import NotificationsModal from './components/NotificationsModal';
import LoginModal from './components/LoginModal';

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
  const [patients, setPatients] = useState(() => {
    const saved = localStorage.getItem('omnihome_patients_v3');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('omnihome_appointments_v3');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  // Active Professional & Selected Patient
  const [selectedDoctorId, setSelectedDoctorId] = useState(DOCTORS[0]?.id || 'doc-3');
  const [activePatientId, setActivePatientId] = useState(patients[0]?.id || 'pat-1');

  // Active Authenticated User (JWT)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('omnihome_user_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      id: 'cmukamckz000112nvi9obl3j5',
      name: 'Rafael Fontes',
      email: 'rafael@omnihomecare.com.br',
      role: 'PROFESSIONAL'
    };
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
    localStorage.setItem('omnihome_patients_v3', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('omnihome_appointments_v3', JSON.stringify(appointments));
  }, [appointments]);

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

  // Active professional object
  const activeDoctor = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];
  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  // Actions
  const handleUpdateAppointmentStatus = (aptId, newStatus, attendanceData = null) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === aptId
          ? {
              ...apt,
              status: newStatus,
              ...(attendanceData ? { attendance: attendanceData } : {})
            }
          : apt
      )
    );
  };

  const handleOpenPatientRecord = (patientId) => {
    if (patientId) {
      setActivePatientId(patientId);
    }
    setActiveTab('patients');
  };

  const handleOpenNewAppointment = (patientId = null, time = '09:00', date = '2026-09-28', duration = 45) => {
    setModalInitialPatientId(patientId);
    setModalInitialTime(time);
    setModalInitialDate(date);
    setModalInitialDuration(duration);
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
    if (window.confirm('Deseja restaurar todos os dados para os valores de demonstração padrão?')) {
      setPatients(INITIAL_PATIENTS);
      setAppointments(INITIAL_APPOINTMENTS);
      localStorage.removeItem('omnihome_patients_v3');
      localStorage.removeItem('omnihome_appointments_v3');
      localStorage.removeItem('omnihome_records_v3');
      alert('Dados restaurados com sucesso!');
    }
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
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          doctors={DOCTORS}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenNewAppointment={() => handleOpenNewAppointment()}
          onOpenNewPatient={() => setIsPatientModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadCount={notifications.length}
        />

        <div className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard
              appointments={appointments}
              patients={patients}
              doctors={DOCTORS}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewAppointment={() => handleOpenNewAppointment()}
              activeDoctor={activeDoctor}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              appointments={appointments}
              patients={patients}
              doctors={DOCTORS}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewAppointment={handleOpenNewAppointment}
              selectedDoctorId={selectedDoctorId}
              setSelectedDoctorId={setSelectedDoctorId}
            />
          )}

          {activeTab === 'patients' && (
            <PatientsView
              patients={patients}
              onOpenPatientRecord={handleOpenPatientRecord}
              onOpenNewPatient={() => setIsPatientModalOpen(true)}
              onOpenNewAppointment={handleOpenNewAppointment}
            />
          )}

          {activeTab === 'clinic' && (
            <ClinicSettingsView
              doctors={DOCTORS}
              onResetData={handleResetData}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        patients={patients}
        doctors={DOCTORS}
        onSaveAppointment={handleSaveAppointment}
        initialPatientId={modalInitialPatientId}
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
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          if (user.name.toLowerCase().includes('rafael') || user.name.toLowerCase().includes('fontes')) {
            setSelectedDoctorId('doc-3');
          } else if (user.name.toLowerCase().includes('camila')) {
            setSelectedDoctorId('doc-4');
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
        onLogout={() => {
          setCurrentUser(null);
          localStorage.removeItem('omnihome_jwt');
          localStorage.removeItem('omnihome_user_v3');
          setNotifications((prev) => [
            {
              id: `notif-${Date.now()}`,
              type: 'alert',
              title: 'Sessão Encerrada',
              description: 'O usuário foi desconectado.',
              time: 'Agora'
            },
            ...prev
          ]);
        }}
      />
    </div>
  );
}
