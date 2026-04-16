import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const SHEET_HEIGHT = 384;

interface CheckoutPeriodOverlayProps {
  onClose: () => void;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  availableHours?: string[];
  orderLeadTime?: number;
}

export const CheckoutPeriodOverlay: React.FC<CheckoutPeriodOverlayProps> = ({
  onClose,
  selectedPeriod,
  onSelectPeriod,
  availableHours = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'],
  orderLeadTime = 0
}) => {
  // Fonction pour vérifier si une heure est valide (pas dépassée par le délai de cutoff)
  const isHourValid = (hour: string): boolean => {
    if (orderLeadTime <= 0) return true; // Pas de restriction si délai est 0

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    const [hoursStr, minutesStr] = hour.split(':');
    const hourValue = parseInt(hoursStr, 10);
    const minuteValue = parseInt(minutesStr, 10);
    const hourTotalMinutes = hourValue * 60 + minuteValue;

    // L'heure est valide si : hourTime - orderLeadTime > currentTime
    const cutoffTime = hourTotalMinutes - orderLeadTime;
    return currentTotalMinutes < cutoffTime;
  };

  // Remplir avec des nulls pour garder la grille 2x3
  const periods = [...availableHours, ...Array(Math.max(0, 6 - availableHours.length)).fill(null)];

  return (
    <View style={styles.keyboardWrapper}>
      <BlurView 
        intensity={40} 
        tint="light" 
        style={[styles.blurOverlay, { height: SHEET_HEIGHT }]} 
      />
      <View style={styles.container}>
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
                const isValid = isHourValid(period);
                const isDisabled = !isValid;

                return (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.gridBtn,
                      isDisabled ? styles.gridBtnCutoff : (isActive ? styles.gridBtnActive : styles.gridBtnInactive)
                    ]}
                    disabled={isDisabled}
                    onPress={() => {
                      if (!isDisabled) onSelectPeriod(period);
                    }}
                  >
                    <Text style={[
                      styles.gridBtnText,
                      isDisabled ? styles.gridBtnTextCutoff : (isActive ? styles.gridBtnTextActive : styles.gridBtnTextInactive)
                    ]}>
                      {period}
                    </Text>
                    {isDisabled && (
                      <Text style={styles.gridBtnCutoffLabel}>Délai écoulé</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.customBtn}>
              <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
              <Text style={styles.customBtnText}>Custom time</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checkBtn} 
              onPress={onClose}
            >
              <Text style={styles.checkBtnText}>VALIDER</Text>
              <Ionicons name="arrow-forward-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  blurOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
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
  gridBtnCutoff: {
    backgroundColor: '#fee2e2',
    opacity: 0.6,
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
  gridBtnTextCutoff: {
    color: '#991b1b',
  },
  gridBtnCutoffLabel: {
    fontSize: 9,
    color: '#991b1b',
    marginTop: 2,
    fontWeight: '600',
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
  checkBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#ec4913',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
