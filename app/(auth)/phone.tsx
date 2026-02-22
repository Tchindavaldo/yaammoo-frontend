import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePhoneAuth } from '@/src/features/auth/hooks/usePhoneAuth';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { userFirestore } from '@/src/features/auth/services/userFirestore';
import { Users, UsersInfos } from '@/src/types';

const { width, height } = Dimensions.get('window');

/**
 * EXACT MIGRATION OF auth-with-number.page.html / auth-with-number.page.scss
 */
export default function PhoneAuthScreen() {
  const router = useRouter();
  const { setUserData } = useAuth();
  const { loading, verifyCode } = usePhoneAuth();

  const [numero, setNumero] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [smsIsSend, setSmsIsSend] = useState(false);
  const [connect, setConnect] = useState(false);

  const connectUser = async () => {
    if (!smsIsSend) {
      if (numero !== '') {
        setSmsIsSend(true);
      } else {
        Alert.alert('Erreur', 'veuiller entrer le numero de telephone');
      }
    } else {
      if (verificationCode !== '') {
        setConnect(true);
        try {
          const firebaseUser = await verifyCode(verificationCode);
          if (firebaseUser) {
            // 1. Recherche PRO par UID
            let userFound = await userFirestore.getUser(firebaseUser.uid);

            if (!userFound) {
              // 2. Si pas trouvé, on crée le profil
              userFound = new Users(
                new UsersInfos('', '', 0, parseInt(numero), firebaseUser.uid, '', ''),
                false,
                100,
                []
              );
              await userFirestore.saveUser(userFound, firebaseUser.uid);
            }

            setUserData(userFound);
            router.replace('/(tabs)');
          }
        } catch (error: any) {
          setConnect(false);
          Alert.alert('Erreur', 'Code incorrect ou expiré');
        }
      } else {
        Alert.alert('Erreur', 'veuiller entrer le code envoyer');
      }
    }
  };

  return (
    <View style={styles.el}>
      <ImageBackground source={require('@/assets/blur3.jpg')} style={styles.cardBack} resizeMode="cover">
         <View style={styles.cardBlack}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
         </View>

         <View style={styles.cardGrid}>
            <SafeAreaView style={{ width: '100%' }}>
               <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={styles.ionGrid}>
                     
                     {/* Row 1: Title (row-title) */}
                     <View style={[styles.ionRow, styles.rowTitle]}>
                        <Text style={styles.titleText}>
                           {smsIsSend ? 'verification du code' : 'connexion via numero de telephone'}
                        </Text>
                     </View>

                     {/* Subtitle / Instructions */}
                     <View style={[styles.ionRow, { marginTop: 20 }]}>
                        <Text style={{ color: 'white', fontSize: 13 }}>
                           {smsIsSend ? 'code' : 'veuiller entrer votre numero de telephone et valider le captcha qui sera afficher'}
                        </Text>
                     </View>

                     {/* Row Input (nth-child(3) or (5/6)) */}
                     <View style={[styles.ionRow, { marginTop: 20 }]}>
                        <View style={styles.ionCol}>
                           <Ionicons name={smsIsSend ? "lock-closed" : "person"} size={20} color="#a65757" style={styles.ico1} />
                           {!smsIsSend ? (
                              <View style={styles.inputStack}>
                                 <Text style={styles.prefix}>+237</Text>
                                 <TextInput
                                    style={[styles.ionInput, { paddingLeft: 60 }]}
                                    placeholder="Entrer votre numero de telephone"
                                    placeholderTextColor="#a3a3a3"
                                    value={numero}
                                    onChangeText={setNumero}
                                    keyboardType="phone-pad"
                                 />
                              </View>
                           ) : (
                              <TextInput
                                 style={styles.ionInput}
                                 placeholder="Entrer le code envoyer au numero"
                                 placeholderTextColor="#a3a3a3"
                                 value={verificationCode}
                                 onChangeText={setVerificationCode}
                                 keyboardType="number-pad"
                              />
                           )}
                        </View>
                     </View>

                     {/* Action Row */}
                     <View style={[styles.ionRow, { marginTop: 9, justifyContent: 'center' }]}>
                        <TouchableOpacity style={styles.ionButton} onPress={connectUser} disabled={connect}>
                           {connect ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="arrow-forward-outline" size={20} color="white" />}
                        </TouchableOpacity>
                     </View>

                     {/* Back Button */}
                     <TouchableOpacity style={styles.fixedBack} onPress={() => router.replace('/(auth)')}>
                        <Ionicons name="arrow-back-outline" size={30} color="white" />
                     </TouchableOpacity>

                  </View>
               </KeyboardAvoidingView>
            </SafeAreaView>
         </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  el: { flex: 1 },
  cardBack: { flex: 1, width: width, height: height },
  cardBlack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.57)',
    zIndex: 10,
  },
  cardGrid: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    backgroundColor: 'transparent',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ionGrid: { width: '100%', paddingHorizontal: 15, zIndex: 500 },
  ionRow: { flexDirection: 'row' },
  ionCol: { flex: 1, position: 'relative', justifyContent: 'center' },
  rowTitle: { top: 25, right: 8, marginBottom: 20 },
  titleText: {
    color: '#a3a3a3',
    fontSize: width > 400 ? 48 : 35, // 3rem is ~48px
    fontWeight: '200',
    textTransform: 'lowercase',
  },
  ico1: { position: 'absolute', left: 15, zIndex: 101 },
  prefix: { position: 'absolute', left: 42, zIndex: 101, color: 'white', fontSize: 14 },
  ionInput: {
    height: 60,
    borderBottomWidth: 0.001,
    borderBottomColor: '#ffffff59',
    paddingLeft: 40,
    color: 'whitesmoke',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  ionButton: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: 'darkred',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedBack: { position: 'absolute', top: 10, left: 10, zIndex: 1000 },
  inputStack: { flex: 1, flexDirection: 'row', alignItems: 'center' },
});
