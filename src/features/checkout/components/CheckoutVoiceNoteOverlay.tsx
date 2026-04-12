import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface CheckoutVoiceNoteOverlayProps {
  onClose: () => void;
}

export const CheckoutVoiceNoteOverlay: React.FC<CheckoutVoiceNoteOverlayProps> = ({ onClose }) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Timer
    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="mic-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Voice Note</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.micWrapper}>
              <Animated.View 
                style={[
                  styles.pulseRing, 
                  { transform: [{ scale: pulseAnim }], opacity: 0.2 }
                ]} 
              />
              <View style={styles.micCircle}>
                <Ionicons name="mic" size={32} color="white" />
              </View>
            </View>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(timer)}</Text>
              <View style={styles.recordingIndicator}>
                <View style={styles.redDot} />
                <Text style={styles.recordingLabel}>RECORDING</Text>
              </View>
            </View>

            <View style={styles.waveforms}>
              <View style={[styles.waveBar, { height: 12, backgroundColor: '#e2e8f0' }]} />
              <View style={[styles.waveBar, { height: 20, backgroundColor: '#cbd5e1' }]} />
              <View style={[styles.waveBar, { height: 32, backgroundColor: '#ec4913' }]} />
              <View style={[styles.waveBar, { height: 24, backgroundColor: '#ec4913' }]} />
              <View style={[styles.waveBar, { height: 16, backgroundColor: '#cbd5e1' }]} />
              <View style={[styles.waveBar, { height: 28, backgroundColor: '#ec4913' }]} />
              <View style={[styles.waveBar, { height: 20, backgroundColor: '#e2e8f0' }]} />
              <View style={[styles.waveBar, { height: 12, backgroundColor: '#f1f5f9' }]} />
            </View>
            
            <TouchableOpacity style={styles.stopBtn} onPress={onClose}>
              <Text style={styles.stopBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  },
  contentContainer: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ec4913',
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ec4913',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ec4913',
  },
  recordingLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  waveforms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    marginBottom: 32,
    opacity: 0.5,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  stopBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});
