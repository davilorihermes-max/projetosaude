// mobile/src/screens/ScalePlannerScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Appointment, Patient, Professional } from '../types';

interface ScalePlannerScreenProps {
  theme: ColorTheme;
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
}

export const ScalePlannerScreen: React.FC<ScalePlannerScreenProps> = ({
  theme,
  appointments,
  patients,
  professionals,
}) => {
  const [selectedProfId, setSelectedProfId] = useState<string>('all');
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  const filteredAppointments =
    selectedProfId === 'all'
      ? appointments
      : appointments.filter((a) => a.doctorId === selectedProfId);

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getProf = (id: string) => professionals.find((p) => p.id === id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header KPI cards for Clinic Manager */}
        <View style={styles.kpiRow}>
          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIcon, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {appointments.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Atendimentos no Mês
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIcon, { backgroundColor: theme.successBg }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.success} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.success }]}>
              100%
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Care Team Válido
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={[styles.kpiIcon, { backgroundColor: theme.infoBg }]}>
              <Ionicons name="people-outline" size={18} color={theme.info} />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {professionals.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Equipe Ativa
            </Text>
          </View>
        </View>

        {/* Golden Rule Security Banner: Care Team Restriction */}
        <View
          style={[
            styles.goldRuleCard,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.primary },
          ]}
        >
          <View style={styles.goldRuleHeader}>
            <Ionicons name="lock-closed" size={18} color={theme.primary} />
            <Text style={[styles.goldRuleTitle, { color: theme.textPrimary }]}>
              Regra de Ouro: Care Team Restrito
            </Text>
          </View>
          <Text style={[styles.goldRuleDesc, { color: theme.textSecondary }]}>
            Travas ativas impedem que profissionais fora da equipe multiprofissional autorizada do paciente recebam escalas domiciliares.
          </Text>
        </View>

        {/* AI Bottleneck Analyzer */}
        <TouchableOpacity
          onPress={() => setShowAiAnalysis(!showAiAnalysis)}
          activeOpacity={0.8}
          style={[
            styles.aiAlertBanner,
            { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
          ]}
        >
          <View style={styles.aiAlertTop}>
            <Ionicons name="sparkles" size={18} color={theme.primary} />
            <Text style={[styles.aiAlertTitle, { color: theme.textPrimary }]}>
              Otimizador de Rotas & Gargalos (IA)
            </Text>
            <Ionicons
              name={showAiAnalysis ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </View>

          {showAiAnalysis && (
            <View style={styles.aiAlertContent}>
              <Text style={[styles.aiAlertItem, { color: theme.textSecondary }]}>
                ✓ Sugestão: Reagrupar atendimentos de Pinheiros (Roberto Carlos e Helena Vasconcelos) economiza 3.4km de trânsito.
              </Text>
              <Text style={[styles.aiAlertItem, { color: theme.textSecondary }]}>
                ✓ Vagas ociosas: Camila Nogueira (Enfermagem) possui disponibilidade às quintas-feiras período da manhã.
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Filter by Professional Horizontal Bar */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: theme.textPrimary }]}>
            Filtrar por Profissional:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            <TouchableOpacity
              onPress={() => setSelectedProfId('all')}
              style={[
                styles.profFilterPill,
                {
                  backgroundColor: selectedProfId === 'all' ? theme.primary : theme.surface,
                  borderColor: selectedProfId === 'all' ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.profFilterText,
                  { color: selectedProfId === 'all' ? '#ffffff' : theme.textPrimary },
                ]}
              >
                Todos ({appointments.length})
              </Text>
            </TouchableOpacity>

            {professionals.map((prof) => {
              const isSelected = selectedProfId === prof.id;
              return (
                <TouchableOpacity
                  key={prof.id}
                  onPress={() => setSelectedProfId(prof.id)}
                  style={[
                    styles.profFilterPill,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Image source={{ uri: prof.avatar }} style={styles.profFilterAvatar} />
                  <Text
                    style={[
                      styles.profFilterText,
                      { color: isSelected ? '#ffffff' : theme.textPrimary },
                    ]}
                  >
                    {prof.name.split(' ')[0]} ({prof.profession})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scale Appointments List */}
        <View style={styles.scaleListSection}>
          <Text style={[styles.listTitle, { color: theme.textPrimary }]}>
            Escalas Agendadas ({filteredAppointments.length})
          </Text>

          {filteredAppointments.map((apt) => {
            const patient = getPatient(apt.patientId);
            const prof = getProf(apt.doctorId);
            if (!patient || !prof) return null;

            return (
              <View
                key={apt.id}
                style={[
                  styles.scaleCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.scaleCardHeader}>
                  <View style={styles.profRow}>
                    <Image source={{ uri: prof.avatar }} style={styles.cardAvatar} />
                    <View>
                      <Text style={[styles.cardProfName, { color: theme.textPrimary }]}>
                        {prof.name}
                      </Text>
                      <Text style={[styles.cardProfSpecialty, { color: theme.textSecondary }]}>
                        {prof.specialty}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          apt.status === 'completed'
                            ? theme.successBg
                            : apt.status === 'in_progress'
                            ? theme.warningBg
                            : theme.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            apt.status === 'completed'
                              ? theme.success
                              : apt.status === 'in_progress'
                              ? theme.warning
                              : theme.textSecondary,
                        },
                      ]}
                    >
                      {apt.status === 'completed'
                        ? 'Concluído'
                        : apt.status === 'in_progress'
                        ? 'Em Atendimento'
                        : 'Escalado'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: theme.borderSubtle }]} />

                {/* Patient and Schedule row */}
                <View style={styles.scalePatientRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scalePatientName, { color: theme.textPrimary }]}>
                      Paciente: {patient.name}
                    </Text>
                    <Text style={[styles.scalePatientAddress, { color: theme.textSecondary }]}>
                      {patient.address}
                    </Text>
                  </View>

                  <View style={styles.timeBadge}>
                    <Ionicons name="time" size={14} color={theme.primary} />
                    <Text style={[styles.timeBadgeText, { color: theme.primary }]}>
                      {apt.time}
                    </Text>
                  </View>
                </View>

                {/* Geofence verification indicator */}
                {apt.checkIn && (
                  <View style={[styles.geofenceAuditLine, { backgroundColor: theme.surfaceVariant }]}>
                    <Ionicons name="shield-checkmark" size={14} color={theme.success} />
                    <Text style={[styles.geofenceAuditText, { color: theme.success }]}>
                      Presença Auditada por Satélite ({apt.checkIn.distanceMeters}m de distância)
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  kpiRow: {
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
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  goldRuleCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    gap: 6,
  },
  goldRuleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goldRuleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  goldRuleDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  aiAlertBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  aiAlertTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 6,
  },
  aiAlertContent: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  aiAlertItem: {
    fontSize: 11,
    lineHeight: 15,
  },
  filterSection: {
    gap: Spacing.xs,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterList: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  profFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  profFilterAvatar: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  profFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scaleListSection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  scaleCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  scaleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  cardProfName: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardProfSpecialty: {
    fontSize: 11,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
  },
  scalePatientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scalePatientName: {
    fontSize: 13,
    fontWeight: '700',
  },
  scalePatientAddress: {
    fontSize: 11,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  geofenceAuditLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: BorderRadius.sm,
  },
  geofenceAuditText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
