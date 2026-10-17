// mobile/src/screens/PatientsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme, Spacing, BorderRadius } from '../theme';
import { Patient } from '../types';

interface PatientsScreenProps {
  theme: ColorTheme;
  patients: Patient[];
  onSelectPatientForPEP: (patient: Patient) => void;
  onAddPatient: (patient: Patient) => void;
}

export const PatientsScreen: React.FC<PatientsScreenProps> = ({
  theme,
  patients,
  onSelectPatientForPEP,
  onAddPatient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // New patient form fields
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCaregiver, setNewCaregiver] = useState('');
  const [newInsurance, setNewInsurance] = useState('');
  const [newMobility, setNewMobility] = useState('');

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cpf.includes(searchQuery) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePatient = () => {
    if (!newName.trim() || !newAddress.trim()) {
      alert('Preencha ao menos o nome completo e o endereço do paciente.');
      return;
    }

    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      name: newName.trim(),
      age: Number(newAge) || 0,
      gender: 'Não informado',
      cpf: newCpf.trim() || '',
      birthDate: '',
      phone: newPhone.trim() || '',
      email: '',
      insurance: newInsurance.trim() || '',
      insuranceNumber: '',
      address: newAddress.trim(),
      accessNotes: '',
      caregiver: newCaregiver.trim() || '',
      mobilityStatus: newMobility.trim() || '',
      coordinates: {
        latitude: -25.4284,
        longitude: -49.2733,
      },
      lastVisit: 'Recém-cadastrado',
      avatar: '',
    };

    onAddPatient(newPatient);
    setModalVisible(false);
    // Reset form
    setNewName('');
    setNewCpf('');
    setNewAge('');
    setNewPhone('');
    setNewAddress('');
    setNewCaregiver('');
    setNewInsurance('');
    setNewMobility('');
    alert('Paciente cadastrado e geocodificado com sucesso!');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search & Add Bar */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.inputBorder,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nome, CPF ou endereço..."
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.textPrimary }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="person-add" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Patients Counter */}
        <View style={styles.counterRow}>
          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            Pacientes sob Cuidado Domiciliar ({filteredPatients.length})
          </Text>
        </View>

        {/* Patients Cards List */}
        {filteredPatients.map((patient) => (
          <View
            key={patient.id}
            style={[
              styles.patientCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            {/* Top row */}
            <View style={styles.cardHeader}>
              {patient.avatar ? (
                <Image source={{ uri: patient.avatar }} style={styles.patientAvatar} />
              ) : null}
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <Text style={[styles.patientName, { color: theme.textPrimary }]}>
                  {patient.name}
                </Text>
                <Text style={[styles.patientSub, { color: theme.textMuted }]}>
                  {patient.age} anos • {patient.gender} • CPF: {patient.cpf}
                </Text>
                <Text style={[styles.patientPlan, { color: theme.primary }]}>
                  {patient.insurance}
                </Text>
              </View>
            </View>

            {/* Address with Geocoding coords */}
            <View style={[styles.addressBox, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="location" size={16} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressText, { color: theme.textPrimary }]}>
                  {patient.address}
                </Text>
                <Text style={[styles.coordsText, { color: theme.textMuted }]}>
                  GPS: {patient.coordinates.latitude.toFixed(5)}, {patient.coordinates.longitude.toFixed(5)}
                </Text>
              </View>
            </View>

            {/* Mobility and Caregiver tags */}
            <View style={styles.tagsRow}>
              <View style={[styles.tagItem, { backgroundColor: theme.warningBg }]}>
                <Ionicons name="accessibility" size={12} color={theme.warning} />
                <Text style={[styles.tagText, { color: theme.warning }]}>
                  {patient.mobilityStatus}
                </Text>
              </View>

              <View style={[styles.tagItem, { backgroundColor: theme.infoBg }]}>
                <Ionicons name="call" size={12} color={theme.info} />
                <Text style={[styles.tagText, { color: theme.info }]}>
                  {patient.phone}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.actionsRow, { borderTopColor: theme.borderSubtle }]}>
              <TouchableOpacity
                onPress={() => onSelectPatientForPEP(patient)}
                activeOpacity={0.8}
                style={[styles.actionBtn, { backgroundColor: theme.primaryMuted, borderColor: theme.primary }]}
              >
                <Ionicons name="document-text" size={16} color={theme.primaryDark} />
                <Text style={[styles.actionBtnText, { color: theme.primaryDark }]}>
                  Abrir Prontuário (PEP)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Patient Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalHeaderTitle, { color: theme.textPrimary }]}>
                Novo Paciente Domiciliar
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Nome Completo *</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nome completo do paciente"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              />

              <View style={styles.splitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>CPF</Text>
                  <TextInput
                    value={newCpf}
                    onChangeText={setNewCpf}
                    placeholder="000.000.000-00"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Idade</Text>
                  <TextInput
                    value={newAge}
                    onChangeText={setNewAge}
                    keyboardType="numeric"
                    placeholder="65"
                    placeholderTextColor={theme.textMuted}
                    style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Endereço do Domicílio *</Text>
              <TextInput
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Rua, número, complemento, bairro, cidade..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Cuidador / Responsável</Text>
              <TextInput
                value={newCaregiver}
                onChangeText={setNewCaregiver}
                placeholder="Nome do cuidador e parentesco..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Status de Mobilidade</Text>
              <TextInput
                value={newMobility}
                onChangeText={setNewMobility}
                placeholder="Ex: Restrito ao leito / Deambula com andador"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Convênio / Plano de Saúde</Text>
              <TextInput
                value={newInsurance}
                onChangeText={setNewInsurance}
                placeholder="Ex: Bradesco Saúde Home Care"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder, color: theme.textPrimary }]}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                onPress={handleCreatePatient}
                activeOpacity={0.8}
                style={[styles.savePatientBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.savePatientBtnText}>Salvar e Geocodificar Domicílio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterRow: {
    marginTop: -2,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  patientCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
  },
  patientSub: {
    fontSize: 11,
    marginTop: 2,
  },
  patientPlan: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addressText: {
    fontSize: 12,
    lineHeight: 16,
  },
  coordsText: {
    fontSize: 10,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 13,
  },
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  savePatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  savePatientBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
