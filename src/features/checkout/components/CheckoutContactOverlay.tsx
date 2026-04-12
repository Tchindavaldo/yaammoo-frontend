import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CheckoutContactOverlayProps {
  onClose: () => void;
  phone: string;
}

export const CheckoutContactOverlay: React.FC<CheckoutContactOverlayProps> = ({ onClose, phone }) => {
  return (
    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Contact Number</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.textInput}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  defaultValue={phone}
                />
              </View>
              
              <TouchableOpacity style={styles.checkBtn} onPress={onClose}>
                <Ionicons name="checkmark" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Our courier will use this number to contact you upon arrival if there are any issues with your delivery.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputContainer: {
    height: 240, // As requested
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    height: 60,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1e293b',
    padding: 0,
  },
  checkBtn: {
    width: 60,
    height: 60,
    backgroundColor: '#ec4913',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  helperText: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
