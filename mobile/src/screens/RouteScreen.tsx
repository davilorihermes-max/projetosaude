// mobile/src/screens/RouteScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Appointment, Patient, CheckInRecord, CheckOutRecord } from '../types';
import { GeofenceCheckInModal } from '../components/GeofenceCheckInModal';

interface RouteScreenProps {
  theme: ColorTheme;
  appointments: Appointment[];
  patients: Patient[];
  onOpenNewAppointment?: () => void;
  onUpdateCheckIn: (appointmentId: string, record: CheckInRecord) => void;
  onUpdateCheckOut: (appointmentId: string, record: CheckOutRecord) => void;
}

export const RouteScreen: React.FC<RouteScreenProps> = ({
  theme,
  appointments,
  patients,
  onOpenNewAppointment,
  onUpdateCheckIn,
  onUpdateCheckOut,
}) => {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getPatient = (patientId: string): Patient | undefined => {
    return patients.find((p) => p.id === patientId);
  };

  // Metrics
  const totalCount = appointments.length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const inProgressCount = appointments.filter((a) => a.status === 'in_progress').length;
  const totalKm = appointments
    .reduce((acc, curr) => acc + (curr.distanceFromPrevKm || 0), 0)
    .toFixed(1);
  const totalTransitMinutes = appointments.reduce(
    (acc, curr) => acc + (curr.transitTimeMinutes || 0),
    0
  );

  const handleOpenCheckIn = (apt: Appointment) => {
    setSelectedApt(apt);
    setModalVisible(true);
  };

  const openNavigationApp = (patient: Patient) => {
    const { latitude, longitude } = patient.coordinates || {};
    const hasValidCoords = typeof latitude === 'number' && typeof longitude === 'number' && latitude !== 0;
    
    // Google Maps URL (web & mobile app direct deep link)
    const googleMapsUrl = hasValidCoords
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(patient.address || 'Vitória - ES')}`;

    Linking.openURL(googleMapsUrl).catch(() => {
      alert('Não foi possível abrir o Google Maps.');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Route Summary KPIs */}
        <View style={styles.kpiGrid}>
          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="calendar" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {completedCount}/{totalCount}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Sessões Hoje
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: theme.infoBg }]}>
              <Ionicons name="car" size={18} color={theme.info} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {totalKm} km
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Deslocamento
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: theme.warningBg }]}>
              <Ionicons name="time" size={18} color={theme.warning} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {totalTransitMinutes} min
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Tempo em Trânsito
            </Text>
          </View>
        </View>

        {/* Home Care Banner Alert */}
        <View
          style={[
            styles.bannerBox,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: theme.textPrimary }]}>
              Auditoria de Presença Ativa (Geofencing 150m)
            </Text>
            <Text style={[styles.bannerDesc, { color: theme.textSecondary }]}>
              O check-in valida a proximidade por satélite. Fechamento financeiro vinculado à comprovação espacial.
            </Text>
          </View>
        </View>

        {/* Section Title & Agendar Button */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Agenda de Atendimentos
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
              {appointments.length} sessões • Toque no endereço para abrir no Google Maps
            </Text>
          </View>
          {onOpenNewAppointment && (
            <TouchableOpacity
              onPress={onOpenNewAppointment}
              activeOpacity={0.8}
              style={[styles.newAptBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.newAptBtnText}>Agendar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Appointments List */}
        {appointments.map((apt, index) => {
          const patient = getPatient(apt.patientId);
          if (!patient) return null;

          const isCompleted = apt.status === 'completed';
          const isInProgress = apt.status === 'in_progress';

          return (
            <View
              key={apt.id}
              style={[
                styles.appointmentCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isInProgress
                    ? theme.primary
                    : isCompleted
                    ? theme.borderSubtle
                    : theme.border,
                  borderWidth: isInProgress ? 2 : 1,
                },
              ]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.timeTag}>
                  <Ionicons name="time-outline" size={14} color={theme.textPrimary} />
                  <Text style={[styles.timeText, { color: theme.textPrimary }]}>
                    {apt.time}
                  </Text>
                  <Text style={[styles.durationText, { color: theme.textMuted }]}>
                    ({apt.durationMinutes} min)
                  </Text>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isCompleted
                        ? theme.successBg
                        : isInProgress
                        ? theme.warningBg
                        : theme.surfaceVariant,
                      borderColor: isCompleted
                        ? theme.success
                        : isInProgress
                        ? theme.warning
                        : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isCompleted
                          ? theme.success
                          : isInProgress
                          ? theme.warning
                          : theme.textMuted,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: isCompleted
                          ? theme.success
                          : isInProgress
                          ? theme.warning
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {isCompleted
                      ? 'Concluído'
                      : isInProgress
                      ? 'Em Atendimento'
                      : 'Agendado'}
                  </Text>
                </View>
              </View>

              {/* Patient Core Details */}
              <View style={styles.cardBody}>
                <View style={styles.patientTitleRow}>
                  <Text style={[styles.patientNameText, { color: theme.textPrimary }]}>
                    {index + 1}. {patient.name}
                  </Text>
                  <Text style={[styles.patientAgeText, { color: theme.textMuted }]}>
                    {patient.age} anos • {patient.gender}
                  </Text>
                </View>

                <Text style={[styles.procedureText, { color: theme.primary }]}>
                  {apt.type}
                </Text>

                {/* Clickable Address that opens Google Maps */}
                <TouchableOpacity
                  onPress={() => openNavigationApp(patient)}
                  activeOpacity={0.7}
                  style={[styles.addressRow, { backgroundColor: theme.surfaceVariant, padding: 8, borderRadius: BorderRadius.md }]}
                >
                  <Ionicons name="location" size={16} color={theme.primary} />
                  <Text style={[styles.addressText, { color: theme.textPrimary, fontWeight: '600' }]}>
                    {patient.address}
                  </Text>
                  <View style={styles.mapsBadge}>
                    <Ionicons name="open-outline" size={12} color={theme.primary} />
                    <Text style={[styles.mapsBadgeText, { color: theme.primary }]}>Google Maps</Text>
                  </View>
                </TouchableOpacity>

                {/* Distance and Transit */}
                <View style={styles.transitInfoRow}>
                  <Ionicons name="navigate-outline" size={14} color={theme.info} />
                  <Text style={[styles.transitInfoText, { color: theme.info }]}>
                    {apt.distanceFromPrevKm} km da parada anterior (~{apt.transitTimeMinutes} min de deslocamento)
                  </Text>
                </View>

                {/* Caregiver & Access notes */}
                {patient.caregiver && (
                  <View style={[styles.caregiverBox, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons name="person-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.caregiverText, { color: theme.textSecondary }]}>
                      {patient.caregiver}
                    </Text>
                  </View>
                )}

                {/* Audit confirmation badge if completed */}
                {apt.checkIn && (
                  <View
                    style={[
                      styles.auditBox,
                      {
                        backgroundColor: apt.checkIn.isWithinGeofence
                          ? theme.successBg
                          : theme.warningBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={apt.checkIn.isWithinGeofence ? theme.success : theme.warning}
                    />
                    <Text
                      style={[
                        styles.auditText,
                        {
                          color: apt.checkIn.isWithinGeofence
                            ? theme.success
                            : theme.warning,
                        },
                      ]}
                    >
                      Auditado via GPS: {apt.checkIn.distanceMeters}m ({apt.checkIn.status})
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons: Google Maps & Check-in */}
              <View style={[styles.cardActions, { borderTopColor: theme.borderSubtle }]}>
                {/* Abrir no Google Maps */}
                <TouchableOpacity
                  onPress={() => openNavigationApp(patient)}
                  activeOpacity={0.7}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="navigate" size={16} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.textPrimary }]}>
                    Abrir no Maps
                  </Text>
                </TouchableOpacity>

                {/* Check-in / Check-out Button */}
                <TouchableOpacity
                  onPress={() => handleOpenCheckIn(apt)}
                  activeOpacity={0.8}
                  style={[
                    styles.actionBtnPrimary,
                    {
                      backgroundColor: isInProgress
                        ? theme.warning
                        : isCompleted
                        ? theme.surfaceVariant
                        : theme.primary,
                      borderColor: isCompleted ? theme.border : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isInProgress
                        ? 'checkbox-outline'
                        : isCompleted
                        ? 'checkmark-done-circle'
                        : 'location-outline'
                    }
                    size={16}
                    color={isCompleted ? theme.textSecondary : '#ffffff'}
                  />
                  <Text
                    style={[
                      styles.actionBtnPrimaryText,
                      { color: isCompleted ? theme.textSecondary : '#ffffff' },
                    ]}
                  >
                    {isInProgress
                      ? 'Fazer Check-out'
                      : isCompleted
                      ? 'Revê Check-in'
                      : 'Fazer Check-in GPS'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Geofence Modal */}
      {selectedApt && (
        <GeofenceCheckInModal
          visible={modalVisible}
          appointment={selectedApt}
          patient={getPatient(selectedApt.patientId) || null}
          theme={theme}
          onClose={() => setModalVisible(false)}
          onConfirmCheckIn={onUpdateCheckIn}
          onConfirmCheckOut={onUpdateCheckOut}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  bannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  newAptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  newAptBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  mapsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginLeft: 6,
  },
  mapsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  appointmentCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  durationText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    gap: 6,
  },
  patientTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  patientAgeText: {
    fontSize: 12,
  },
  procedureText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    flex: 1,
  },
  transitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transitInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  caregiverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: BorderRadius.sm,
    marginTop: 2,
  },
  caregiverText: {
    fontSize: 11,
    flex: 1,
  },
  auditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  auditText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
