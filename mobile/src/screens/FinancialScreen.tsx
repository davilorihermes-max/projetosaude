// mobile/src/screens/FinancialScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Appointment, Patient, Professional } from '../types';

interface FinancialScreenProps {
  theme: ColorTheme;
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
}

export const FinancialScreen: React.FC<FinancialScreenProps> = ({
  theme,
  appointments,
  patients,
  professionals,
}) => {
  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getProf = (id: string) => professionals.find((p) => p.id === id);

  // Financial Pricing Matrix calculation (Mocked base rates)
  // Base session = R$ 180, Displacement per km = R$ 4.50
  const BASE_SESSION_RATE = 180;
  const KM_RATE = 4.5;
  const PROF_SPLIT_PERCENTAGE = 0.7; // 70% repasse ao profissional

  const calculations = appointments.map((apt) => {
    const kmBonus = (apt.distanceFromPrevKm || 0) * KM_RATE;
    const sessionGross = BASE_SESSION_RATE + kmBonus;
    const profShare = sessionGross * PROF_SPLIT_PERCENTAGE;
    const clinicShare = sessionGross * (1 - PROF_SPLIT_PERCENTAGE);

    return {
      apt,
      sessionGross,
      profShare,
      clinicShare,
      isAudited: !!apt.checkIn?.isWithinGeofence,
    };
  });

  const totalGross = calculations.reduce((acc, c) => acc + c.sessionGross, 0);
  const totalProfRepasse = calculations.reduce((acc, c) => acc + c.profShare, 0);
  const totalClinicMargin = calculations.reduce((acc, c) => acc + c.clinicShare, 0);
  const auditedCount = calculations.filter((c) => c.isAudited).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Faturamento Bruto
            </Text>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              R$ {totalGross.toFixed(2)}
            </Text>
            <Text style={[styles.kpiSub, { color: theme.success }]}>
              {appointments.length} sessões
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textMuted }]}>
              Repasse Profissional
            </Text>
            <Text style={[styles.kpiValue, { color: theme.primary }]}>
              R$ {totalProfRepasse.toFixed(2)}
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textMuted }]}>
              70% base líquida
            </Text>
          </View>
        </View>

        {/* Audit Compliance Banner */}
        <View
          style={[
            styles.auditBanner,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.success },
          ]}
        >
          <Ionicons name="checkmark-done-circle" size={24} color={theme.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.auditTitle, { color: theme.textPrimary }]}>
              Auditoria Espacial de Faturamento
            </Text>
            <Text style={[styles.auditDesc, { color: theme.textSecondary }]}>
              {auditedCount} de {appointments.length} atendimentos 100% auditados por Geofencing (raio ≤ 150m do domicílio cadastrado).
            </Text>
          </View>
        </View>

        {/* Pricing Matrix Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Matriz Tridimensional (Profissional x Paciente x Endereço)
          </Text>

          {calculations.map(({ apt, sessionGross, profShare, clinicShare, isAudited }) => {
            const patient = getPatient(apt.patientId);
            const prof = getProf(apt.doctorId);
            if (!patient || !prof) return null;

            return (
              <View
                key={apt.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemPatient, { color: theme.textPrimary }]}>
                      {patient.name}
                    </Text>
                    <Text style={[styles.itemProf, { color: theme.textSecondary }]}>
                      {prof.name} ({prof.profession})
                    </Text>
                  </View>

                  <Text style={[styles.itemTotal, { color: theme.textPrimary }]}>
                    R$ {sessionGross.toFixed(2)}
                  </Text>
                </View>

                <Text style={[styles.itemAddress, { color: theme.textMuted }]}>
                  {patient.address}
                </Text>

                <View style={[styles.itemDivider, { backgroundColor: theme.borderSubtle }]} />

                <View style={styles.itemFooter}>
                  <View style={styles.footerCol}>
                    <Text style={[styles.footerLabel, { color: theme.textMuted }]}>
                      Repasse:
                    </Text>
                    <Text style={[styles.footerValue, { color: theme.primary }]}>
                      R$ {profShare.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.footerCol}>
                    <Text style={[styles.footerLabel, { color: theme.textMuted }]}>
                      Deslocamento:
                    </Text>
                    <Text style={[styles.footerValue, { color: theme.textSecondary }]}>
                      +{apt.distanceFromPrevKm} km
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.auditTag,
                      { backgroundColor: isAudited ? theme.successBg : theme.warningBg },
                    ]}
                  >
                    <Ionicons
                      name={isAudited ? 'shield-checkmark' : 'alert-circle'}
                      size={12}
                      color={isAudited ? theme.success : theme.warning}
                    />
                    <Text
                      style={[
                        styles.auditTagText,
                        { color: isAudited ? theme.success : theme.warning },
                      ]}
                    >
                      {isAudited ? 'Validado' : 'Pendente'}
                    </Text>
                  </View>
                </View>
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
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  auditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  auditTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  auditDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  breakdownSection: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemPatient: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemProf: {
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemAddress: {
    fontSize: 11,
  },
  itemDivider: {
    height: 1,
    marginVertical: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 11,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  auditTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  auditTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
