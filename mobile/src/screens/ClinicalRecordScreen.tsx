// mobile/src/screens/ClinicalRecordScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Patient, ClinicalEvolution, Professional } from '../types';

interface ClinicalRecordScreenProps {
  theme: ColorTheme;
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  evolutions: ClinicalEvolution[];
  onSaveEvolution: (evolution: ClinicalEvolution) => void;
  activeProfessional?: Professional | null;
}

export const ClinicalRecordScreen: React.FC<ClinicalRecordScreenProps> = ({
  theme,
  patients,
  selectedPatient,
  onSelectPatient,
  evolutions,
  onSaveEvolution,
  activeProfessional,
}) => {
  const patient = selectedPatient || patients[0];

  // Form State
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [heartRate, setHeartRate] = useState('76');
  const [oxygenSaturation, setOxygenSaturation] = useState('98');
  const [temperature, setTemperature] = useState('36.5');
  const [glucose, setGlucose] = useState('98');

  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  // Filter evolutions for current patient
  const patientEvolutions = evolutions.filter((e) => e.patientId === patient?.id);

  const handleSaveForm = () => {
    if (!patient) return;
    if (!subjective.trim() && !objective.trim()) {
      alert('Preencha ao menos o relato subjetivo ou o exame objetivo.');
      return;
    }

    const newEvo: ClinicalEvolution = {
      id: `evo-${Date.now()}`,
      patientId: patient.id,
      professionalId: activeProfessional?.id || '',
      professionalName: activeProfessional
        ? `${activeProfessional.name} (${activeProfessional.profession})`
        : 'Profissional',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      vitals: {
        bloodPressure,
        heartRate: Number(heartRate) || undefined,
        oxygenSaturation: Number(oxygenSaturation) || undefined,
        temperature: Number(temperature) || undefined,
        glucose: Number(glucose) || undefined,
      },
      subjective,
      objective,
      assessment,
      plan,
    };

    onSaveEvolution(newEvo);
    setSubjective('');
    setObjective('');
    setAssessment('');
    setPlan('');
    alert('Evolução clínica registrada com sucesso no Prontuário!');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Selection Horizontal Pill List */}
        <View style={styles.patientSelectorBox}>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            SELECIONAR PACIENTE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {patients.map((p) => {
              const isSelected = p.id === patient?.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => onSelectPatient(p)}
                  activeOpacity={0.8}
                  style={[
                    styles.patientPill,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Image source={{ uri: p.avatar }} style={styles.pillAvatar} />
                  <Text
                    style={[
                      styles.pillName,
                      { color: isSelected ? '#ffffff' : theme.textPrimary },
                    ]}
                  >
                    {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Patient Banner */}
        {patient && (
          <View
            style={[
              styles.patientHeroCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.heroTopRow}>
              <Image source={{ uri: patient.avatar }} style={styles.heroAvatar} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={[styles.heroName, { color: theme.textPrimary }]}>
                  {patient.name}
                </Text>
                <Text style={[styles.heroInfo, { color: theme.textSecondary }]}>
                  {patient.age} anos • {patient.gender} • CPF: {patient.cpf}
                </Text>
                <Text style={[styles.heroPlan, { color: theme.primary }]}>
                  {patient.insurance}
                </Text>
              </View>
            </View>

            <View style={[styles.heroDivider, { backgroundColor: theme.borderSubtle }]} />

            <View style={styles.heroDetailsGrid}>
              <View style={styles.heroDetailItem}>
                <Ionicons name="accessibility" size={14} color={theme.warning} />
                <Text style={[styles.heroDetailText, { color: theme.textSecondary }]}>
                  {patient.mobilityStatus}
                </Text>
              </View>
              <View style={styles.heroDetailItem}>
                <Ionicons name="people" size={14} color={theme.info} />
                <Text style={[styles.heroDetailText, { color: theme.textSecondary }]}>
                  {patient.caregiver}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Structured Anamnesis Form */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={styles.formHeader}>
            <View style={[styles.formIconBox, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="fitness" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formTitle, { color: theme.textPrimary }]}>
                Nova Evolução Clínica (SOAP)
              </Text>
              <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>
                Registrado por {activeProfessional.name}
              </Text>
            </View>
          </View>

          {/* Sinais Vitais */}
          <Text style={[styles.inputGroupTitle, { color: theme.textPrimary }]}>
            Sinais Vitais no Domicílio
          </Text>
          <View style={styles.vitalsRow}>
            <View style={styles.vitalField}>
              <Text style={[styles.vitalLabel, { color: theme.textMuted }]}>PA (mmHg)</Text>
              <TextInput
                value={bloodPressure}
                onChangeText={setBloodPressure}
                style={[
                  styles.vitalInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
                ]}
                placeholder="120/80"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.vitalField}>
              <Text style={[styles.vitalLabel, { color: theme.textMuted }]}>FC (bpm)</Text>
              <TextInput
                value={heartRate}
                onChangeText={setHeartRate}
                keyboardType="numeric"
                style={[
                  styles.vitalInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
                ]}
                placeholder="75"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.vitalField}>
              <Text style={[styles.vitalLabel, { color: theme.textMuted }]}>SpO2 (%)</Text>
              <TextInput
                value={oxygenSaturation}
                onChangeText={setOxygenSaturation}
                keyboardType="numeric"
                style={[
                  styles.vitalInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
                ]}
                placeholder="98"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.vitalField}>
              <Text style={[styles.vitalLabel, { color: theme.textMuted }]}>Temp (°C)</Text>
              <TextInput
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="numeric"
                style={[
                  styles.vitalInput,
                  { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
                ]}
                placeholder="36.5"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </View>

          {/* SOAP Inputs */}
          <View style={styles.soapGroup}>
            <Text style={[styles.soapLabel, { color: theme.textPrimary }]}>
              S - Subjetivo (Queixa e relato do paciente/família)
            </Text>
            <TextInput
              value={subjective}
              onChangeText={setSubjective}
              placeholder="Descreva como o paciente e cuidador relatam o quadro recente..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={2}
              style={[
                styles.textArea,
                { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
            />

            <Text style={[styles.soapLabel, { color: theme.textPrimary }]}>
              O - Objetivo (Exame físico, ausculta, inspeção)
            </Text>
            <TextInput
              value={objective}
              onChangeText={setObjective}
              placeholder="Achados do exame físico no leito, ausculta, pele, saturação..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={2}
              style={[
                styles.textArea,
                { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
            />

            <Text style={[styles.soapLabel, { color: theme.textPrimary }]}>
              A - Avaliação (Diagnóstico funcional / evolução)
            </Text>
            <TextInput
              value={assessment}
              onChangeText={setAssessment}
              placeholder="Conclusão clínica sobre o estado atual do paciente..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={2}
              style={[
                styles.textArea,
                { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
            />

            <Text style={[styles.soapLabel, { color: theme.textPrimary }]}>
              P - Plano Terapêutico & Condutas
            </Text>

            <TextInput
              value={plan}
              onChangeText={setPlan}
              placeholder="Exercícios prescritos, orientações ao cuidador e agendamentos..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.textArea,
                { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSaveForm}
            activeOpacity={0.8}
            style={[styles.submitBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.submitBtnText}>Salvar Evolução no Prontuário</Text>
          </TouchableOpacity>
        </View>

        {/* Longitudinal History Timeline */}
        <View style={styles.historySection}>
          <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
            Histórico Longitudinal Multiprofissional ({patientEvolutions.length})
          </Text>

          {patientEvolutions.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Nenhuma evolução registrada anteriormente para este paciente.
              </Text>
            </View>
          ) : (
            patientEvolutions.map((evo) => (
              <View
                key={evo.id}
                style={[
                  styles.timelineCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.timelineHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timelineAuthor, { color: theme.textPrimary }]}>
                      {evo.professionalName}
                    </Text>
                    <Text style={[styles.timelineDate, { color: theme.textMuted }]}>
                      {evo.date} às {evo.time}
                    </Text>
                  </View>

                  <View style={[styles.vitalsMiniBadge, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.vitalsMiniText, { color: theme.primary }]}>
                      PA {evo.vitals.bloodPressure || 'N/I'} • SpO2 {evo.vitals.oxygenSaturation}%
                    </Text>
                  </View>
                </View>

                {evo.subjective ? (
                  <Text style={[styles.evoSnippet, { color: theme.textSecondary }]}>
                    <Text style={{ fontWeight: '700' }}>S: </Text>{evo.subjective}
                  </Text>
                ) : null}

                {evo.objective ? (
                  <Text style={[styles.evoSnippet, { color: theme.textSecondary }]}>
                    <Text style={{ fontWeight: '700' }}>O: </Text>{evo.objective}
                  </Text>
                ) : null}

                {evo.plan ? (
                  <View style={[styles.planSnippetBox, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.evoSnippet, { color: theme.textPrimary }]}>
                      <Text style={{ fontWeight: '700' }}>Conduta: </Text>{evo.plan}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
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
  patientSelectorBox: {
    gap: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillsRow: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  patientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillAvatar: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
  },
  pillName: {
    fontSize: 12,
    fontWeight: '700',
  },
  patientHeroCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatar: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
  },
  heroName: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  heroPlan: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
  },
  heroDetailsGrid: {
    gap: 6,
  },
  heroDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDetailText: {
    fontSize: 12,
  },
  formCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  formIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  formSubtitle: {
    fontSize: 11,
  },
  inputGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  vitalField: {
    flex: 1,
  },
  vitalLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  vitalInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },
  soapGroup: {
    gap: Spacing.sm,
  },
  soapLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBox: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  timelineCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 6,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  timelineDate: {
    fontSize: 11,
  },
  vitalsMiniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  vitalsMiniText: {
    fontSize: 11,
    fontWeight: '700',
  },
  evoSnippet: {
    fontSize: 12,
    lineHeight: 16,
  },
  planSnippetBox: {
    padding: 6,
    borderRadius: BorderRadius.sm,
    marginTop: 2,
  },
});
