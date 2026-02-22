import React, { useState } from 'react';
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleCreate = async () => {
    if (!name || !number) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const userId = userData?.infos?.uid;
      const response = await axios.post(`${Config.apiUrl}/fast-food/add`, {
        nom: name,
        openTime: formatTime(openTime),
        closeTime: formatTime(closeTime),
        userId,
        numero: number,
        image: '' 
      });

      if (response.data && response.data.success) {
        Alert.alert('Succès', 'Votre boutique a été créée !');
        if (userData) {
          const updatedUser = { ...userData, fastFoodId: response.data.data.id };
          setUserData(updatedUser);
        }
      } else {
        Alert.alert('Erreur', 'Impossible de créer la boutique');
      }
    } catch (error) {
      console.error('Error creating boutique:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la création');
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
          <Text style={styles.titre}>Creer votre boutique et{"\n"}recever vos cammande</Text>
          <Text style={styles.description}>
            Gerer facillement vos comades vos livraisons{"\n"}vos transactions avec votre Boutique
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

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={['#911818', '#4a0606', '#000000']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      >
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={() => setShowCreateCard(false)} 
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.cardContainer}
        >
          <View style={styles.cardWrapper}>
            {/* The actual card from rudafood */}
            <BlurView intensity={70} tint="dark" style={styles.glassCard}>
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
                        placeholder="Entrer le  nom de votre boutique"
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
                        placeholder="Entrer le numero de paiment (Orange Money)"
                        placeholderTextColor="#999"
                    />
                </View>

                {/* Buttons row */}
                <View style={[styles.actionRow, { justifyContent: 'flex-end' }]}>
                  <TouchableOpacity 
                    style={styles.chipBtn} 
                    onPress={() => setShowCreateCard(false)}
                  >
                    <Ionicons name="options" size={14} color="white" />
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
                        <Ionicons name="options" size={14} color="white" />
                        <Text style={styles.chipText}>Creer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>

            {/* Back card gradient simulation - Red to White transition */}
            <View style={styles.cardBack} />
          </View>
        </KeyboardAvoidingView>

        {/* --- GLOBAL TIME PICKERS (Outside layout to prevent displacement) --- */}
        
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
      </LinearGradient>
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
  dismissArea: {
    flex: 1,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
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
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderRadius: 30,
    zIndex: 10,
    padding: 20,
  },
  cardBack: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'red', // Approx gradient with red bg
    width: '100%',
    height: '100%',
    borderRadius: 30,
    opacity: 0.3,
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
});
