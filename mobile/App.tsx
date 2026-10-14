// mobile/App.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme, darkTheme, Spacing, BorderRadius } from './src/theme';
import { Header } from './src/components/Header';
import { RouteScreen } from './src/screens/RouteScreen';
import { ClinicalRecordScreen } from './src/screens/ClinicalRecordScreen';
import { ScalePlannerScreen } from './src/screens/ScalePlannerScreen';
import { PatientsScreen } from './src/screens/PatientsScreen';
import { FinancialScreen } from './src/screens/FinancialScreen';
import { AppStorage } from './src/services/storage';
import { PROFESSIONALS } from './src/data/mockData';
import {
  Appointment,
  Patient,
  ClinicalEvolution,
  UserRole,
  CheckInRecord,
  CheckOutRecord,
} from './src/types';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [role, setRole] = useState<UserRole>('PROFESSIONAL');
  const [activeTab, setActiveTab] = useState<string>('route');
  const [loading, setLoading] = useState(true);

  // Core Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [evolutions, setEvolutions] = useState<ClinicalEvolution[]>([]);
  const [selectedPatientForPEP, setSelectedPatientForPEP] = useState<Patient | null>(null);

  const activeProfessional = PROFESSIONALS[0]; // Rafael Fontes (Fisioterapeuta)
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [savedApts, savedPatients, savedEvos, savedRole, savedDark] =
        await Promise.all([
          AppStorage.getAppointments(),
          AppStorage.getPatients(),
          AppStorage.getEvolutions(),
          AppStorage.getActiveRole(),
          AppStorage.getDarkMode(),
        ]);

      setAppointments(savedApts);
      setPatients(savedPatients);
      setEvolutions(savedEvos);
      setRole(savedRole);
      setIsDark(savedDark);
      if (savedRole === 'MANAGER') {
        setActiveTab('scale');
      } else {
        setActiveTab('route');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    await AppStorage.setDarkMode(next);
  };

  const handleToggleRole = async () => {
    const nextRole: UserRole = role === 'PROFESSIONAL' ? 'MANAGER' : 'PROFESSIONAL';
    setRole(nextRole);
    await AppStorage.setActiveRole(nextRole);
    setActiveTab(nextRole === 'PROFESSIONAL' ? 'route' : 'scale');
  };

  const handleUpdateCheckIn = async (appointmentId: string, record: CheckInRecord) => {
    const updated = await AppStorage.registerCheckIn(appointmentId, record);
    setAppointments(updated);
  };

  const handleUpdateCheckOut = async (appointmentId: string, record: CheckOutRecord) => {
    const updated = await AppStorage.registerCheckOut(appointmentId, record);
    setAppointments(updated);
  };

  const handleAddPatient = async (newPatient: Patient) => {
    const updated = await AppStorage.savePatient(newPatient);
    setPatients(updated);
  };

  const handleSaveEvolution = async (newEvolution: ClinicalEvolution) => {
    const updated = await AppStorage.saveEvolution(newEvolution);
    setEvolutions(updated);
  };

  const handleSelectPatientForPEP = (patient: Patient) => {
    setSelectedPatientForPEP(patient);
    setActiveTab('pep');
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Carregando OmniSaúde Mobile...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.headerBackground }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.headerBackground}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Main Top Header */}
      <Header
        theme={theme}
        role={role}
        onToggleRole={handleToggleRole}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        professional={activeProfessional}
      />

      {/* Screen Content View */}
      <View style={[styles.screenContainer, { backgroundColor: theme.background }]}>
        {role === 'PROFESSIONAL' ? (
          <>
            {activeTab === 'route' && (
              <RouteScreen
                theme={theme}
                appointments={appointments}
                patients={patients}
                onSelectPatientForPEP={handleSelectPatientForPEP}
                onUpdateCheckIn={handleUpdateCheckIn}
                onUpdateCheckOut={handleUpdateCheckOut}
              />
            )}
            {activeTab === 'pep' && (
              <ClinicalRecordScreen
                theme={theme}
                patients={patients}
                selectedPatient={selectedPatientForPEP}
                onSelectPatient={setSelectedPatientForPEP}
                evolutions={evolutions}
                onSaveEvolution={handleSaveEvolution}
                activeProfessional={activeProfessional}
              />
            )}
            {activeTab === 'patients' && (
              <PatientsScreen
                theme={theme}
                patients={patients}
                onSelectPatientForPEP={handleSelectPatientForPEP}
                onAddPatient={handleAddPatient}
              />
            )}
          </>
        ) : (
          <>
            {activeTab === 'scale' && (
              <ScalePlannerScreen
                theme={theme}
                appointments={appointments}
                patients={patients}
                professionals={PROFESSIONALS}
              />
            )}
            {activeTab === 'patients' && (
              <PatientsScreen
                theme={theme}
                patients={patients}
                onSelectPatientForPEP={handleSelectPatientForPEP}
                onAddPatient={handleAddPatient}
              />
            )}
            {activeTab === 'financial' && (
              <FinancialScreen
                theme={theme}
                appointments={appointments}
                patients={patients}
                professionals={PROFESSIONALS}
              />
            )}
          </>
        )}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.tabBarBackground,
            borderTopColor: theme.tabBarBorder,
          },
        ]}
      >
        {role === 'PROFESSIONAL' ? (
          <>
            <TouchableOpacity
              onPress={() => setActiveTab('route')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'route' ? 'map' : 'map-outline'}
                size={22}
                color={activeTab === 'route' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'route' ? theme.primary : theme.textMuted },
                ]}
              >
                Rota Hoje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('pep')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'pep' ? 'document-text' : 'document-text-outline'}
                size={22}
                color={activeTab === 'pep' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'pep' ? theme.primary : theme.textMuted },
                ]}
              >
                Prontuário
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('patients')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'patients' ? 'people' : 'people-outline'}
                size={22}
                color={activeTab === 'patients' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'patients' ? theme.primary : theme.textMuted },
                ]}
              >
                Pacientes
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setActiveTab('scale')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'scale' ? 'calendar' : 'calendar-outline'}
                size={22}
                color={activeTab === 'scale' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'scale' ? theme.primary : theme.textMuted },
                ]}
              >
                Escalas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('patients')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'patients' ? 'people' : 'people-outline'}
                size={22}
                color={activeTab === 'patients' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'patients' ? theme.primary : theme.textMuted },
                ]}
              >
                Pacientes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('financial')}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={activeTab === 'financial' ? 'cash' : 'cash-outline'}
                size={22}
                color={activeTab === 'financial' ? theme.primary : theme.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'financial' ? theme.primary : theme.textMuted },
                ]}
              >
                Financeiro
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
