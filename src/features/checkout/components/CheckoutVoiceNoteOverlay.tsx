import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';

const SHEET_HEIGHT = 384;

interface CheckoutVoiceNoteOverlayProps {
  onClose: () => void;
  onSave?: (uri: string) => void;
}

type RecordingStatus = 'idle' | 'recording' | 'recorded' | 'playing';

export const CheckoutVoiceNoteOverlay: React.FC<CheckoutVoiceNoteOverlayProps> = ({ onClose, onSave }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerInterval = useRef<any>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop recording and unload sound on unmount
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (sound) {
        sound.unloadAsync();
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
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

      timerInterval.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }
  }, [status]);

  async function startRecording() {
    try {
      const { status: permissionStatus } = await Audio.requestPermissionsAsync();
      if (permissionStatus !== 'granted') {
        alert('Permission to access microphone is required!');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setStatus('recording');
      setTimer(0);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setStatus('recorded');
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  async function playSound() {
    if (!recordingUri) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setStatus('playing');
    } catch (err) {
      console.error('Failed to play sound', err);
    }
  }

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        setStatus('recorded');
        setPlaybackProgress(1);
      } else {
        setPlaybackProgress(status.positionMillis / status.durationMillis);
      }
    }
  };

  async function togglePlay() {
    if (status === 'playing') {
      await sound?.pauseAsync();
      setStatus('recorded');
    } else {
      if (sound) {
        if (playbackProgress >= 1) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        setStatus('playing');
      } else {
        await playSound();
      }
    }
  }

  async function deleteRecording() {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setRecordingUri(null);
    setTimer(0);
    setPlaybackProgress(0);
    setStatus('idle');
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
              <Ionicons name="mic-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Delivery Instruction</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            {status === 'idle' && (
              <View style={styles.idleState}>
                <TouchableOpacity style={styles.micCircleBig} onPress={startRecording}>
                  <Ionicons name="mic" size={36} color="white" />
                </TouchableOpacity>
                <Text style={styles.instructionText}>Tap to start recording voice instruction</Text>
              </View>
            )}

            {status === 'recording' && (
              <View style={styles.recordingState}>
                <View style={styles.recordingHeader}>
                  <Animated.View 
                    style={[
                      styles.recordPulse, 
                      { transform: [{ scale: pulseAnim }], opacity: 0.2 }
                    ]} 
                  />
                  <View style={styles.micCircleSmall}>
                    <Ionicons name="mic" size={24} color="white" />
                  </View>
                </View>

                <View style={styles.timerWrapper}>
                  <Text style={styles.timerLarge}>{formatTime(timer)}</Text>
                  <View style={styles.recordingBadge}>
                    <View style={styles.redDot} />
                    <Text style={styles.recordingLabel}>RECORDING</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.stopCircle} onPress={stopRecording}>
                  <Ionicons name="square" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}

            {(status === 'recorded' || status === 'playing') && (
              <View style={styles.recordedState}>
               

                {/* Progress Bar (Top) */}
                <View style={[styles.playerMain, { marginBottom: 20 }]}>
                  <View style={styles.progressBarWrapper}>
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${playbackProgress * 100}%` }
                        ]} 
                      />
                    </View>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeText}>
                        {formatTime(Math.floor((playbackProgress * timer)))}
                      </Text>
                      <Text style={styles.timeTextTotal}>{formatTime(timer)}</Text>
                    </View>
                  </View>
                </View>

                {/* Actions (Bottom) */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.playBtnLarge} onPress={togglePlay}>
                    <Ionicons name={status === 'playing' ? "pause" : "play"} size={28} color="#ec4913" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.deleteBtnLarge} onPress={deleteRecording}>
                    <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.validateBtn} onPress={() => {
                  if (onSave && recordingUri) onSave(recordingUri);
                  onClose();
                }}>
                  <Text style={styles.validateBtnText}>Save Instruction</Text>
                </TouchableOpacity>
              </View>
            )}
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
    padding: 20,
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
    marginBottom: 20,
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
    height: 240,
    justifyContent: 'center',
  },
  idleState: {
    alignItems: 'center',
    gap: 20,
  },
  micCircleBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ec4913',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  instructionText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  recordingState: {
    alignItems: 'center',
  },
  recordingHeader: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ec4913',
  },
  micCircleSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ec4913',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timerWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: -1,
  },
  recordingBadge: {
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
  stopCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordedState: {
    flex: 1,
    paddingTop: 10,
  },
  recordedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recordedType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerMain: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
  },
  progressBarWrapper: {
    gap: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ec4913',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  timeTextTotal: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
  },
  playBtnLarge: {
    width: 56,
    height: 56,
    backgroundColor: '#f8fafc',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteBtnLarge: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validateBtn: {
    width: '100%',
    height: 50,
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
  validateBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
