import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Menu } from '@/src/types';

interface AddMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (menu: Menu) => void;
  loading?: boolean;
}

export const AddMenuSheet: React.FC<AddMenuSheetProps> = ({ visible, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    titre: '',
    prix1: '',
    optionPrix1: 'Petit',
    prix2: '',
    optionPrix2: 'Moyen',
    prix3: '',
    optionPrix3: 'Grand',
    image: '',
    disponibilite: 'Disponible'
  });

  const handleSave = () => {
    const menu = new Menu(
      form.titre,
      Number(form.prix1),
      Number(form.prix2),
      Number(form.prix3),
      form.optionPrix1,
      form.optionPrix2,
      form.optionPrix3,
      form.image || require('@/assets/blur3.jpg'),
      form.disponibilite
    );
    onSave(menu);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nouveau Menu</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Theme.colors.gray[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.label}>Nom du menu</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Burger Spécial"
                value={form.titre}
                onChangeText={(t) => setForm({ ...form, titre: t })}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>Prix 1</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2000"
                  keyboardType="numeric"
                  value={form.prix1}
                  onChangeText={(t) => setForm({ ...form, prix1: t })}
                />
              </View>
              <View style={[styles.section, { flex: 2 }]}>
                <Text style={styles.label}>Option 1</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Petit"
                  value={form.optionPrix1}
                  onChangeText={(t) => setForm({ ...form, optionPrix1: t })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.label}>Prix 2</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3500"
                  keyboardType="numeric"
                  value={form.prix2}
                  onChangeText={(t) => setForm({ ...form, prix2: t })}
                />
              </View>
              <View style={[styles.section, { flex: 2 }]}>
                <Text style={styles.label}>Option 2</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Moyen"
                  value={form.optionPrix2}
                  onChangeText={(t) => setForm({ ...form, optionPrix2: t })}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Statut</Text>
              <View style={styles.statusRow}>
                {['Disponible', 'Rupture'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusBtn, form.disponibilite === s && styles.statusBtnActive]}
                    onPress={() => setForm({ ...form, disponibilite: s })}
                  >
                    <Text style={[styles.statusText, form.disponibilite === s && styles.statusTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
              onPress={handleSave}
              disabled={loading || !form.titre || !form.prix1}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveBtnText}>Créer le menu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: Theme.spacing.lg,
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    color: Theme.colors.gray[600],
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Theme.colors.gray[50],
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statusBtn: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    alignItems: 'center',
  },
  statusBtnActive: {
    backgroundColor: Theme.colors.success + '15',
    borderColor: Theme.colors.success,
  },
  statusText: {
    color: Theme.colors.gray[600],
  },
  statusTextActive: {
    color: Theme.colors.success,
    fontWeight: 'bold',
  },
  footer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
