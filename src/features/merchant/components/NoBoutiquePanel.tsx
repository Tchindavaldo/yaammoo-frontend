import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

export const NoBoutiquePanel = () => {
  const { userData, setUserData } = useAuth();
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [openTime, setOpenTime] = useState(new Date());
  const [closeTime, setCloseTime] = useState(new Date());
  const [number, setNumber] = useState('');

  // Picker states
  const [showOpenPicker, setShowOpenPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const heroFadeAnim = useRef(new Animated.Value(0)).current; 
  const heroSlideAnim = useRef(new Animated.Value(-40)).current; 
  const chipsEntryAnim = useRef(new Animated.Value(0)).current; 
  const cardSlideAnim = useRef(new Animated.Value(250)).current; 
  const cardScaleAnim = useRef(new Animated.Value(0.96)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current; 

  // Toast Anim
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ message: '', type: 'success' });
  const toastAnimY = useRef(new Animated.Value(-100)).current;

  // Helpers
  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setToastConfig({ message, type });
    setToastVisible(true);
    Animated.sequence([
      Animated.spring(toastAnimY, { toValue: Platform.OS === 'ios' ? 60 : 40, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.delay(duration),
      Animated.timing(toastAnimY, { toValue: -100, duration: 300, useNativeDriver: true })
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const resetAnims = () => {
    heroFadeAnim.setValue(0);
    heroSlideAnim.setValue(-40);
    chipsEntryAnim.setValue(0);
    cardSlideAnim.setValue(250);
    cardScaleAnim.setValue(0.96);
    cardFadeAnim.setValue(0);
    fadeAnim.setValue(0);
  };

  const closeCard = () => {
    setIsEntering(false);
    setShowCreateCard(false);
    resetAnims();
  };

  // Pulsing icon (runs always)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Entry animations sequence
  useEffect(() => {
    if (showCreateCard) {
      setIsEntering(true);
      resetAnims();

      Animated.parallel([
        // Stage 1: Hero area
        Animated.parallel([
          Animated.timing(heroFadeAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(heroSlideAnim, {
            toValue: 0,
            tension: 20,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // Stage 2: Card (starts with a bit more delay)
        Animated.sequence([
          Animated.delay(250),
          Animated.parallel([
            Animated.timing(cardFadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(cardSlideAnim, {
              toValue: 0,
              tension: 18,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(cardScaleAnim, {
              toValue: 1,
              tension: 18,
              friction: 8,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Stage 3: Feature chips (appears later)
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(chipsEntryAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setIsEntering(false));
    }
  }, [showCreateCard]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleCreate = async () => {
    if (!name || !number) {
      showToast('Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    setLoading(true);
    try {
      const userId = (userData as any)?.uid;
      const response = await axios.post(`${Config.apiUrl}/fastFood`, {
        name,
        openTime: formatTime(openTime),
        closeTime: formatTime(closeTime),
        userId,
        number,
        image: '' 
      });

      if (response.data && response.data.success) {
        // Mise à jour immédiate → le parent boutique.tsx bascule instantanément vers l'interface marchande
        if (userData) {
          const updatedUser = { ...userData, fastFoodId: response.data.data.id, isMarchand: true };
          setUserData(updatedUser);
        }
        // Le toast s'affiche en parallèle (il sera visible pendant la transition)
        showToast('Votre boutique a été créée avec succès !', 'success', 2000);
      } else {
        showToast('Impossible de créer la boutique', 'error');
      }
    } catch (error: any) {
      console.error('Error creating boutique:', error);
      const errorMessage = error?.response?.data?.error || 'Une erreur est survenue lors de la création';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!showCreateCard) {
    return (
      <View style={styles.initialCtn}>
        {/* Image en haut */}
        <View style={styles.ctnImg}>
          <Ionicons name="fast-food" size={250} color="darkred" style={{ opacity: 0.1 }} />
        </View>

        {/* Titre et Description */}
        <View style={styles.textCtn}>
          <Text style={styles.titre}>Créez votre boutique et{"\n"}recevez vos commandes</Text>
          <Text style={styles.description}>
            Gérez facilement vos commandes, vos livraisons{"\n"}et vos transactions avec votre Boutique
          </Text>
        </View>

        {/* Bouton */}
        <View style={styles.ctnBtn}>
          <TouchableOpacity style={styles.mainBtn} onPress={() => setShowCreateCard(true)}>
            <Text style={styles.mainBtnText}>Continuer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const features = [
    { icon: 'receipt-outline', label: 'Commandes' },
    { icon: 'bicycle-outline', label: 'Livraisons' },
    { icon: 'cash-outline', label: 'Paiements' },
  ];

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['#911818', '#c0392b', '#e8d5d5']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Full-screen flex column: hero on top, card on bottom */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ===== TOP: Hero area ===== */}
        <Animated.View style={[
          styles.heroArea,
          { opacity: heroFadeAnim, transform: [{ translateY: heroSlideAnim }] }
        ]}>
          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}
            activeOpacity={1}
            onPress={closeCard}
          >
            {/* Decorative blobs */}
            <View style={styles.blobTopRight} />
            <View style={styles.blobBottomLeft} />

            {/* Animated icon — pulse */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 10 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="fast-food" size={52} color="#fff" />
              </View>
            </Animated.View>

            {/* Headline */}
            <Text style={styles.heroTitle}>Lancez votre Fast-Food</Text>
            <Text style={styles.heroSub}>Gérez vos commandes, livraisons et paiements{"\n"}depuis un seul endroit</Text>

            {/* Feature chips — staggered last */}
            <Animated.View style={[styles.chipsRow, { opacity: chipsEntryAnim }]}>
              {features.map((f) => (
                <View key={f.label} style={styles.featureChip}>
                  <Ionicons name={f.icon as any} size={15} color="#fff" />
                  <Text style={styles.featureChipText}>{f.label}</Text>
                </View>
              ))}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* ===== BOTTOM: Card — slides up from bottom ===== */}
        <Animated.View style={[
          styles.cardContainer,
          { 
            opacity: cardFadeAnim,
            transform: [
              { translateY: cardSlideAnim },
              { scale: cardScaleAnim }
            ] 
          }
        ]}>
          <View style={styles.cardWrapper}>
            <BlurView intensity={55} tint="dark" style={styles.glassCard}>
              {/* Premium red-to-dark gradient overlay */}
              <LinearGradient
                colors={['rgba(145,24,24,0.55)', 'rgba(60,10,10,0.30)', 'rgba(0,0,0,0.0)']}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <ScrollView contentContainerStyle={styles.cardGrid} showsVerticalScrollIndicator={false}>
                <View style={[styles.formRow, { alignItems: 'center' }]}>
                  {/* Left avatar placeholder */}
                  <View style={styles.avatarCol}>
                    <View style={styles.avatarPlaceholder} />
                  </View>

                  {/* Inputs col */}
                  <View style={styles.inputsCol}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.floatingLabel}>Nom Boutique</Text>
                      <TextInput
                        style={[styles.glassInput, { borderRadius: 20 }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Entrer le nom de votre boutique"
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={[styles.formRow, { marginTop: 10 }]}>
                      <View style={{ flex: 1, marginRight: 5 }}>
                        <Text style={styles.floatingLabel}>Ouverture</Text>
                        <TouchableOpacity
                          style={[styles.glassInput, styles.timeInput, { borderRadius: 20 }]}
                          onPress={() => setShowOpenPicker(true)}
                        >
                          <Text style={styles.timeText}>{formatTime(openTime)}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flex: 1, marginLeft: 5 }}>
                        <Text style={styles.floatingLabel}>Fermeture</Text>
                        <TouchableOpacity
                          style={[styles.glassInput, styles.timeInput, { borderRadius: 20 }]}
                          onPress={() => setShowClosePicker(true)}
                        >
                          <Text style={styles.timeText}>{formatTime(closeTime)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Number input */}
                <View style={[styles.inputGroup, { marginTop: 15 }]}>
                  <Text style={styles.floatingLabel}>Numero (OM)</Text>
                  <TextInput
                    style={[styles.glassInput, { borderRadius: 20 }]}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    placeholder="Entrer le numero (Orange Money)"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Buttons row */}
                <View style={[styles.actionRow, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity
                    style={styles.chipBtn}
                    onPress={closeCard} // Use closeCard here
                    disabled={isEntering} // Disable interaction during animation
                  >
                    <Ionicons name="close-outline" size={14} color="white" />
                    <Text style={styles.chipText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chipBtn, { marginLeft: 10 }]}
                    onPress={handleCreate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-outline" size={14} color="white" />
                        <Text style={styles.chipText}>Creer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>

            {/* Subtle border-glow flare */}
            <View style={styles.cardBorder} />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* --- GLOBAL TIME PICKERS --- */}

      {/* Open Time Picker */}
      {showOpenPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} visible={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <BlurView intensity={90} tint="dark" style={styles.iosPickerContainer}>
                <TouchableOpacity style={styles.iosPickerDone} onPress={() => setShowOpenPicker(false)}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Terminer</Text>
                </TouchableOpacity>
                <DateTimePicker
                  value={openTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  textColor="white"
                  onChange={(e, d) => d && setOpenTime(d)}
                />
              </BlurView>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={openTime}
            mode="time"
            is24Hour={true}
            display="clock"
            onChange={(e, d) => {
              setShowOpenPicker(false);
              if (d) setOpenTime(d);
            }}
          />
        )
      )}

      {/* Close Time Picker */}
      {showClosePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} visible={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <BlurView intensity={90} tint="dark" style={styles.iosPickerContainer}>
                <TouchableOpacity style={styles.iosPickerDone} onPress={() => setShowClosePicker(false)}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Terminer</Text>
                </TouchableOpacity>
                <DateTimePicker
                  value={closeTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  textColor="white"
                  onChange={(e, d) => d && setCloseTime(d)}
                />
              </BlurView>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={closeTime}
            mode="time"
            is24Hour={true}
            display="clock"
            onChange={(e, d) => {
              setShowClosePicker(false);
              if (d) setCloseTime(d);
            }}
          />
        )
      )}

      {/* Global Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            toastConfig.type === 'error' ? styles.toastError : styles.toastSuccess,
            { transform: [{ translateY: toastAnimY }] },
          ]}
        >
          <Ionicons 
            name={toastConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
            size={24} 
            color="white" 
          />
          <Text style={styles.toastText}>{toastConfig.message}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Initial View Styles
  initialCtn: {
    flex: 1,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ctnImg: {
    alignItems: 'center',
    marginBottom: '20%',
  },
  textCtn: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titre: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#000000a6',
    fontWeight: '100',
    lineHeight: 20,
  },
  ctnBtn: {
    marginBottom: '13%',
  },
  mainBtn: {
    backgroundColor: 'hsl(0, 70%, 27%)',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  mainBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Create Card Styles (Glassmorphism)
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featureChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 90,
    paddingHorizontal: 8,
  },
  cardWrapper: {
    width: '96%',
    height: 340, // Adjusted for 90px avatar and spacing
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  glassCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 30,
    zIndex: 10,
    padding: 20,
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    zIndex: 5,
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(180,50,50,0.4)',
  },
  cardGrid: {
    flexGrow: 1,
  },
  formRow: {
    flexDirection: 'row',
  },
  avatarCol: {
    width: '30%', // Adjusted based on 3/12 ratio from original
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff3b',
  },
  inputsCol: {
    width: '70%',
    paddingLeft: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  floatingLabel: {
    color: 'white',
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 2,
  },
  glassInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 15,
    height: 50,
    color: 'white',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeInput: {
    justifyContent: 'center',
  },
  timeText: {
    color: 'white',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'darkred',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  chipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // iOS Picker Overlays
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPickerContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iosPickerDone: {
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    gap: 12,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: Theme.colors.success || '#28a745',
  },
  toastError: {
    backgroundColor: Theme.colors.danger || '#dc3545',
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
