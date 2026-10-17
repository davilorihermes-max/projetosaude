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
import { AppStorage } from './src/services/storage';
import { PROFESSIONALS } from './src/data/mockData';
import { NewAppointmentModal } from './src/components/NewAppointmentModal';
import {
  Appointment,
  Patient,
  Professional,
  UserRole,
  CheckInRecord,
  CheckOutRecord,
} from './src/types';

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);

  // Core Data State
  const [professionals, setProfessionals] = useState<Professional[]>(PROFESSIONALS);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const activeProfessional =
    professionals.find((p) => p.name.toLowerCase().includes('sergio')) ||
    professionals[0] ||
    null;
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [savedProfs, savedPatients, savedDark] =
        await Promise.all([
          AppStorage.getProfessionals(),
          AppStorage.getPatients(),
          AppStorage.getDarkMode(),
        ]);

      const savedApts = await AppStorage.getAppointments(savedPatients);

      setProfessionals(savedProfs);
      setAppointments(savedApts);
      setPatients(savedPatients);
      setIsDark(savedDark);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    await AppStorage.setDarkMode(next);
  };

  const handleUpdateCheckIn = async (appointmentId: string, record: CheckInRecord) => {
    const updated = await AppStorage.registerCheckIn(appointmentId, record);
    setAppointments(updated);
  };

  const handleUpdateCheckOut = async (appointmentId: string, record: CheckOutRecord) => {
    const updated = await AppStorage.registerCheckOut(appointmentId, record);
    setAppointments(updated);
  };

  const handleSaveNewAppointment = async (newApt: Appointment) => {
    const updated = [newApt, ...appointments];
    setAppointments(updated);
    await AppStorage.saveAppointments(updated);
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
        role="PROFESSIONAL"
        onToggleRole={() => {}}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        professional={activeProfessional}
      />

      {/* Screen Content View: Focado 100% em Agenda, Deslocamento, Google Maps e Check-in */}
      <View style={[styles.screenContainer, { backgroundColor: theme.background }]}>
        <RouteScreen
          theme={theme}
          appointments={appointments}
          patients={patients}
          onOpenNewAppointment={() => setIsNewAptModalOpen(true)}
          onUpdateCheckIn={handleUpdateCheckIn}
          onUpdateCheckOut={handleUpdateCheckOut}
        />
      </View>

      {/* Modal de Agendar Sessão Específica */}
      <NewAppointmentModal
        visible={isNewAptModalOpen}
        theme={theme}
        patients={patients}
        professional={activeProfessional}
        onClose={() => setIsNewAptModalOpen(false)}
        onSave={handleSaveNewAppointment}
      />
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
