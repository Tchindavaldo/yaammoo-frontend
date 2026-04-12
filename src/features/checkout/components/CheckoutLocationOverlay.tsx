import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CheckoutLocationOverlayProps {
  onClose: () => void;
  address: string;
}

export const CheckoutLocationOverlay: React.FC<CheckoutLocationOverlayProps> = ({ onClose, address }) => {
  return (
    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{address || '221B Baker St, London'}</Text>
              <TextInput 
                style={styles.textInput}
                placeholder="Instructions (e.g. Leave at gate)"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.gpsBtn}>
              <Ionicons name="locate-outline" size={18} color="#334155" />
              <Text style={styles.gpsBtnText}>Send Live GPS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkBtn} onPress={onClose}>
              <Ionicons name="checkmark" size={22} color="white" />
            </TouchableOpacity>
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
  headerBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
    letterSpacing: 1,
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
    position: 'relative',
    height: 240,
  },
  addressBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
  },
  addressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    padding: 0,
  },
  gpsBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  checkBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: '#ec4913',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
