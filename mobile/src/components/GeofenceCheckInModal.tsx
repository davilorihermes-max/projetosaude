// mobile/src/components/GeofenceCheckInModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Appointment, Patient, CheckInRecord, CheckOutRecord, GeoLocation } from '../types';
import {
  evaluateGeofence,
  getCurrentDeviceLocation,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from '../services/geofence';

interface Props {
  visible: boolean;
  appointment: Appointment | null;
  patient: Patient | null;
  theme: ColorTheme;
  onClose: () => void;
  onConfirmCheckIn: (appointmentId: string, record: CheckInRecord) => void;
  onConfirmCheckOut: (appointmentId: string, record: CheckOutRecord) => void;
}

export const GeofenceCheckInModal: React.FC<Props> = ({
  visible,
  appointment,
  patient,
  theme,
  onClose,
  onConfirmCheckIn,
  onConfirmCheckOut,
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<GeoLocation | null>(null);
  const [fromGps, setFromGps] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'checkin' | 'checkout'>('checkin');

  useEffect(() => {
    if (visible && appointment && patient) {
      if (appointment.status === 'in_progress') {
        setActiveTab('checkout');
      } else {
        setActiveTab('checkin');
      }
      loadLocation(patient.coordinates);
    }
  }, [visible, appointment, patient]);

  const loadLocation = async (targetCoords: GeoLocation, forceSimulatedOffset?: { lat: number; lon: number }) => {
    setLoadingLocation(true);
    if (forceSimulatedOffset) {
      // Manual simulation mode for test
      setCurrentCoords({
        latitude: targetCoords.latitude + forceSimulatedOffset.lat,
        longitude: targetCoords.longitude + forceSimulatedOffset.lon,
      });
      setFromGps(false);
      setLoadingLocation(false);
      return;
    }

    const res = await getCurrentDeviceLocation({
      // Default fallback close to patient (18 meters)
      latitude: targetCoords.latitude + 0.00012,
      longitude: targetCoords.longitude + 0.00008,
    });

    setCurrentCoords(res.location);
    setFromGps(res.fromGps);
    setLoadingLocation(false);
  };

  if (!appointment || !patient) return null;

  const evaluation = currentCoords
    ? evaluateGeofence(currentCoords, patient.coordinates)
    : null;

  const handleExecuteCheckIn = () => {
    if (!currentCoords || !evaluation) return;

    if (!evaluation.isWithinGeofence && !overrideReason.trim()) {
      alert('Por favor, informe a justificativa clínica para check-in fora do perímetro.');
      return;
    }

    const checkInRecord: CheckInRecord = {
      id: `chk-${Date.now()}`,
      appointmentId: appointment.id,
      timestamp: new Date().toISOString(),
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      distanceMeters: evaluation.distanceMeters,
      status: evaluation.status,
      overrideReason: !evaluation.isWithinGeofence ? overrideReason : undefined,
      isWithinGeofence: evaluation.isWithinGeofence,
    };

    onConfirmCheckIn(appointment.id, checkInRecord);
    onClose();
  };

  const handleExecuteCheckOut = () => {
    const checkOutRecord: CheckOutRecord = {
      timestamp: new Date().toISOString(),
      latitude: currentCoords?.latitude || patient.coordinates.latitude,
      longitude: currentCoords?.longitude || patient.coordinates.longitude,
      observations: checkOutNotes.trim() || 'Atendimento concluído e registrado no domicílio.',
    };

    onConfirmCheckOut(appointment.id, checkOutRecord);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {appointment.status === 'in_progress' ? 'Encerrar Atendimento' : 'Validação de Presença'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                Geofencing Espacial com Raio de {DEFAULT_GEOFENCE_RADIUS_METERS}m
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="close" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Patient Info Card */}
            <View style={[styles.patientCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.borderSubtle }]}>
              <View style={styles.patientRow}>
                <Ionicons name="home" size={20} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.patientName, { color: theme.textPrimary }]}>{patient.name}</Text>
                  <Text style={[styles.patientAddress, { color: theme.textSecondary }]}>{patient.address}</Text>
                </View>
              </View>
              {patient.accessNotes ? (
                <View style={[styles.accessBox, { backgroundColor: theme.background }]}>
                  <Ionicons name="key" size={14} color={theme.warning} />
                  <Text style={[styles.accessText, { color: theme.textSecondary }]}>{patient.accessNotes}</Text>
                </View>
              ) : null}
            </View>

            {/* GPS Geofence Evaluation Section */}
            {loadingLocation ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>
                  Triangulando satélites GPS...
                </Text>
              </View>
            ) : evaluation ? (
              <View
                style={[
                  styles.geofenceBox,
                  {
                    backgroundColor: evaluation.isWithinGeofence ? theme.successBg : theme.warningBg,
                    borderColor: evaluation.isWithinGeofence ? theme.success : theme.warning,
                  },
                ]}
              >
                <View style={styles.geofenceHeader}>
                  <Ionicons
                    name={evaluation.isWithinGeofence ? 'shield-checkmark' : 'alert-circle'}
                    size={28}
                    color={evaluation.isWithinGeofence ? theme.success : theme.warning}
                  />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text
                      style={[
                        styles.geofenceStatusTitle,
                        { color: evaluation.isWithinGeofence ? theme.success : theme.warning },
                      ]}
                    >
                      {evaluation.isWithinGeofence ? 'DENTRO DO DOMICÍLIO' : 'FORA DO PERÍMETRO'}
                    </Text>
                    <Text
                      style={[
                        styles.geofenceDistanceText,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Distância atual: <Text style={{ fontWeight: '800' }}>{evaluation.distanceMeters} metros</Text>
                    </Text>
                  </View>
                </View>

                <Text style={[styles.geofenceMessage, { color: theme.textSecondary }]}>
                  {evaluation.message}
                </Text>

                <View style={styles.coordsFooter}>
                  <Text style={[styles.coordsText, { color: theme.textMuted }]}>
                    Lat: {currentCoords?.latitude.toFixed(6)} | Lon: {currentCoords?.longitude.toFixed(6)}
                    {fromGps ? ' (GPS Nativo)' : ' (Simulado)'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Test Simulation Controls */}
            <View style={styles.simControls}>
              <Text style={[styles.simLabel, { color: theme.textMuted }]}>Simular Localização GPS:</Text>
              <View style={styles.simButtonsRow}>
                <TouchableOpacity
                  onPress={() => loadLocation(patient.coordinates, { lat: 0.0001, lon: 0.0001 })}
                  style={[styles.simBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                >
                  <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                  <Text style={[styles.simBtnText, { color: theme.textPrimary }]}>No Local (~15m)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => loadLocation(patient.coordinates, { lat: 0.004, lon: 0.004 })}
                  style={[styles.simBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                >
                  <Ionicons name="warning" size={14} color={theme.warning} />
                  <Text style={[styles.simBtnText, { color: theme.textPrimary }]}>Distante (~500m)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => loadLocation(patient.coordinates)}
                  style={[styles.simBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                >
                  <Ionicons name="refresh" size={14} color={theme.info} />
                  <Text style={[styles.simBtnText, { color: theme.textPrimary }]}>Atualizar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Justification input if outside boundary */}
            {evaluation && !evaluation.isWithinGeofence && (
              <View style={styles.overrideSection}>
                <Text style={[styles.inputLabel, { color: theme.danger }]}>
                  * Justificativa Obrigatória de Presença:
                </Text>
                <TextInput
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Ex: Aguardando liberação na portaria / Paciente no condomínio"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={2}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            )}

            {/* Checkout notes */}
            {appointment.status === 'in_progress' && (
              <View style={styles.overrideSection}>
                <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                  Observações do Desfecho / Check-out:
                </Text>
                <TextInput
                  value={checkOutNotes}
                  onChangeText={setCheckOutNotes}
                  placeholder="Orientações deixadas com o cuidador, estado do paciente..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.inputBorder,
                      color: theme.textPrimary,
                    },
                  ]}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {appointment.status === 'in_progress' ? (
              <TouchableOpacity
                onPress={handleExecuteCheckOut}
                activeOpacity={0.8}
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.primaryActionText}>Finalizar Sessão (Check-out)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleExecuteCheckIn}
                activeOpacity={0.8}
                disabled={loadingLocation}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor:
                      evaluation && !evaluation.isWithinGeofence ? theme.warning : theme.primary,
                  },
                ]}
              >
                <Ionicons name="location" size={20} color="#ffffff" />
                <Text style={styles.primaryActionText}>
                  {evaluation && !evaluation.isWithinGeofence
                    ? 'Confirmar com Justificativa'
                    : 'Confirmar Presença no Domicílio'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '88%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  patientCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
  },
  patientAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  accessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  accessText: {
    fontSize: 11,
    flex: 1,
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 13,
  },
  geofenceBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  geofenceStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  geofenceDistanceText: {
    fontSize: 14,
    marginTop: 2,
  },
  geofenceMessage: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  coordsFooter: {
    marginTop: Spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  coordsText: {
    fontSize: 10,
  },
  simControls: {
    marginTop: Spacing.xs,
  },
  simLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  simBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overrideSection: {
    marginTop: Spacing.xs,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
