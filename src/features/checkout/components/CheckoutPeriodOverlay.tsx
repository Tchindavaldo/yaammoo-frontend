import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CheckoutPeriodOverlayProps {
  onClose: () => void;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
}

export const CheckoutPeriodOverlay: React.FC<CheckoutPeriodOverlayProps> = ({ onClose, selectedPeriod, onSelectPeriod }) => {
  const periods = ['9h', '12h30', '14h', '16h30', null, null];

  return (
    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="time-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Select delivery time</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.grid}>
              {periods.map((period, index) => {
                if (!period) {
                  return (
                    <View key={`empty-${index}`} style={[styles.gridBtn, styles.gridBtnDisabled]}>
                      <Ionicons name="remove-outline" size={20} color="#cbd5e1" />
                    </View>
                  );
                }
                const isActive = selectedPeriod === period;
                return (
                  <TouchableOpacity 
                    key={period} 
                    style={[styles.gridBtn, isActive ? styles.gridBtnActive : styles.gridBtnInactive]}
                    onPress={() => {
                      onSelectPeriod(period);
                      onClose();
                    }}
                  >
                    <Text style={[styles.gridBtnText, isActive ? styles.gridBtnTextActive : styles.gridBtnTextInactive]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.customBtn}>
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
              <Text style={styles.customBtnText}>Custom time</Text>
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
  contentContainer: {
    height: 240, // Same base height constraint as Location and Contact for consistency
    justifyContent: 'flex-start',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  gridBtn: {
    width: '31%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBtnActive: {
    backgroundColor: 'rgba(236, 73, 19, 0.05)',
  },
  gridBtnInactive: {
    backgroundColor: '#f8fafc',
  },
  gridBtnDisabled: {
    backgroundColor: '#f8fafc',
  },
  gridBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  gridBtnTextActive: {
    color: '#ec4913',
  },
  gridBtnTextInactive: {
    color: '#1e293b',
  },
  customBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  customBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});
