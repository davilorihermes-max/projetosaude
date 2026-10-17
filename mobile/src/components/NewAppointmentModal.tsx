// mobile/src/components/NewAppointmentModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Patient, Appointment, Professional } from '../types';

interface Props {
  visible: boolean;
  theme: ColorTheme;
  patients: Patient[];
  professional: Professional | null;
  onClose: () => void;
  onSave: (newApt: Appointment) => void;
}

export const NewAppointmentModal: React.FC<Props> = ({
  visible,
  theme,
  patients,
  professional,
  onClose,
  onSave,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || '');
  const [time, setTime] = useState('14:00');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState('Fisioterapia Domiciliar');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];
    if (!patient) {
      alert('Selecione um paciente.');
      return;
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: patient.id,
      doctorId: professional?.id || 'doc-1',
      date: date || new Date().toISOString().slice(0, 10),
      time: time || '14:00',
      type: type || 'Atendimento Domiciliar',
      durationMinutes: Number(durationMinutes) || 45,
      status: 'scheduled',
      distanceFromPrevKm: 3.5,
      transitTimeMinutes: 15,
      address: patient.address,
      notes: notes.trim(),
    };

    onSave(newAppointment);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Agendar Novo Atendimento
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Paciente Selector */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Paciente *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.patientRow}>
              {patients.map((p) => {
                const isSelected = p.id === (selectedPatientId || patients[0]?.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPatientId(p.id)}
                    style={[
                      styles.patientPill,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceVariant,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.patientPillText,
                        { color: isSelected ? '#ffffff' : theme.textPrimary },
                      ]}
                    >
                      {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Data e Horário */}
            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Data (AAAA-MM-DD)</Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-10-17"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={[styles.label, { color: theme.textPrimary }]}>Horário</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="14:00"
                  placeholderTextColor={theme.textMuted}
                  style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
                />
              </View>
            </View>

            {/* Procedimento / Tipo */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Procedimento / Tipo de Sessão</Text>
            <TextInput
              value={type}
              onChangeText={setType}
              placeholder="Ex: Fisioterapia Respiratória"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
            />

            {/* Duração em Minutos */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Duração Estimada (minutos)</Text>
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="numeric"
              placeholder="45"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
            />

            {/* Observações Clínicas */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>Observações (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Orientações ou notas para a sessão"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                {
                  height: 70,
                  textAlignVertical: 'top',
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                },
              ]}
            />

            {/* Botão Salvar */}
            <TouchableOpacity
              onPress={handleCreate}
              activeOpacity={0.8}
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.saveBtnText}>Confirmar e Incluir na Agenda</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderTopWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.xs,
    paddingBottom: 40,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  patientRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  patientPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  patientPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
