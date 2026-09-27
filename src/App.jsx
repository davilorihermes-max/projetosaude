// src/App.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ScheduleView from './components/ScheduleView';
import PatientsView from './components/PatientsView';
import MedicalRecordView from './components/MedicalRecordView';
import PrescriptionsView from './components/PrescriptionsView';
import ClinicSettingsView from './components/ClinicSettingsView';
import NewAppointmentModal from './components/NewAppointmentModal';
import NewPatientModal from './components/NewPatientModal';
import PrescriptionPrintModal from './components/PrescriptionPrintModal';
import NotificationsModal from './components/NotificationsModal';
import ApiTesterView from './components/ApiTesterView';

import {
  DOCTORS,
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_CLINICAL_RECORDS
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
    const saved = localStorage.getItem('omnisaude_patients');
    return saved ? JSON.parse(saved) : INITIAL_PATIENTS;
  });

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('omnisaude_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [clinicalRecords, setClinicalRecords] = useState(() => {
    const saved = localStorage.getItem('omnisaude_records');
    return saved ? JSON.parse(saved) : INITIAL_CLINICAL_RECORDS;
  });

  // Active Doctor & Selected Patient for PEP
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-1');
  const [activePatientId, setActivePatientId] = useState(patients[0]?.id || 'pat-1');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [modalInitialPatientId, setModalInitialPatientId] = useState(null);
  const [modalInitialTime, setModalInitialTime] = useState('09:00');

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [prescriptionModalData, setPrescriptionModalData] = useState(null);

  // Clinic Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      type: 'alert',
      title: 'Alergia Crítica Detectada',
      description: 'Paciente Mariana Souza Lima possui alergia severa a Penicilina e Dipirona.',
      time: 'Há 15 min'
    },
    {
      id: 'notif-2',
      type: 'lab',
      title: 'Laudo Laboratorial Recebido',
      description: 'Resultados de HbA1c e Lipidograma de Roberto Carlos Peixoto disponíveis.',
      time: 'Há 32 min'
    },
    {
      id: 'notif-3',
      type: 'info',
      title: 'Confirmação via WhatsApp',
      description: 'Juliana Mendes Prado confirmou a teleconsulta das 11:00.',
      time: 'Há 1 hora'
    }
  ]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('omnisaude_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('omnisaude_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('omnisaude_records', JSON.stringify(clinicalRecords));
  }, [clinicalRecords]);

  // Active doctor object
  const activeDoctor = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];
  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

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
    setActiveTab('records');
  };

  const handleOpenNewAppointment = (patientId = null, time = '09:00') => {
    setModalInitialPatientId(patientId);
    setModalInitialTime(time);
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (newApt) => {
    setAppointments((prev) => [newApt, ...prev]);
  };

  const handleSavePatient = (newPatient) => {
    setPatients((prev) => [newPatient, ...prev]);
    setActivePatientId(newPatient.id);
  };

  const handleSaveNewEvolution = (patientId, newRecordItem) => {
    setClinicalRecords((prev) => {
      const existing = prev[patientId] || { timeline: [], diagnoses: [], currentMedications: [] };
      return {
        ...prev,
        [patientId]: {
          ...existing,
          timeline: [newRecordItem, ...(existing.timeline || [])]
        }
      };
    });
  };

  const handleResetData = () => {
    if (window.confirm('Deseja restaurar todos os dados para os valores de demonstração padrão?')) {
      setPatients(INITIAL_PATIENTS);
      setAppointments(INITIAL_APPOINTMENTS);
      setClinicalRecords(INITIAL_CLINICAL_RECORDS);
      localStorage.removeItem('omnisaude_patients');
      localStorage.removeItem('omnisaude_appointments');
      localStorage.removeItem('omnisaude_records');
      alert('Dados restaurados com sucesso!');
    }
  };

  // Waiting in reception count
  const waitingCount = appointments.filter(
    (a) => a.date === '2026-09-27' && a.status === 'waiting'
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
      />

      {/* Main Content Area */}
      <main className="main-content">
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          doctors={DOCTORS}
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

          {activeTab === 'records' && (
            <MedicalRecordView
              patient={activePatient}
              allPatients={patients}
              onSelectPatient={(p) => setActivePatientId(p.id)}
              clinicalRecords={clinicalRecords}
              onSaveNewEvolution={handleSaveNewEvolution}
              onOpenPrescriptionModal={setPrescriptionModalData}
              activeDoctor={activeDoctor}
            />
          )}

          {activeTab === 'prescriptions' && (
            <PrescriptionsView
              patients={patients}
              doctors={DOCTORS}
              onOpenPrescriptionModal={setPrescriptionModalData}
              activeDoctor={activeDoctor}
            />
          )}

          {activeTab === 'clinic' && (
            <ClinicSettingsView
              doctors={DOCTORS}
              onResetData={handleResetData}
            />
          )}

          {activeTab === 'tester' && (
            <ApiTesterView />
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
      />

      <NewPatientModal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSavePatient={handleSavePatient}
      />

      <PrescriptionPrintModal
        isOpen={!!prescriptionModalData}
        onClose={() => setPrescriptionModalData(null)}
        data={prescriptionModalData}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onClearAll={() => setNotifications([])}
      />
    </div>
  );
}
