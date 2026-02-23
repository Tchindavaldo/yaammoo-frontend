import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/services/firebase';
import { userFirestore } from '@/src/features/auth/services/userFirestore';

const { width, height } = Dimensions.get('window');

/**
 * RECTIFICATION REGISTER - FLOU INTENSE ET ALIGNEMENT BOUTONS
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { setUserData } = useAuth();

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [birth, setBirth] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMerchant, setIsMerchant] = useState(false);

  const [infos1ISCheck, setInfos1ISCheck] = useState(false);
  const [infos2ISCheck, setInfos2ISCheck] = useState(false);

  const [connect, setConnect] = useState(false);
  const [passwordIsShow, setPasswordIsShow] = useState(false);

  const nextStep = () => {
     if (!infos1ISCheck) {
         if (nom && prenom && birth) setInfos1ISCheck(true);
         else Alert.alert('Erreur', 'Veuillez remplir tous les champs');
     } else if (!infos2ISCheck) {
         if (tel && email && password) setInfos2ISCheck(true);
         else Alert.alert('Erreur', 'Veuillez remplir tous les champs');
     }
  };

  const backStep = () => {
    if (infos2ISCheck) setInfos2ISCheck(false);
    else if (infos1ISCheck) setInfos1ISCheck(false);
    else router.back();
  };

  const createUser = async () => {
    if (!infos2ISCheck) {
        nextStep();
        return;
    }
    setConnect(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Objet plat : uid à la racine, pas de champ cmd
      const newUser = {
        uid,
        infos: {
          nom,
          prenom,
          age: 0,
          numero: parseInt(tel),
          email,
          password: birth, // champ password stocke la date de naissance comme auparavant
        },
        isMarchand: isMerchant,
        statistique: 100,
        fastFoodId: '',
      };

      await userFirestore.saveUser(newUser as any, uid);
      setUserData(newUser as any);
      router.replace('/(tabs)');
    } catch (error: any) {
      setConnect(false);
      Alert.alert('Erreur', 'Impossible de créer le compte.');
    }
  };

  return (
    <View style={styles.el}>
       {/* Fond split (Rouge/Noir) */}
       <View style={styles.cardBack} />
       <View style={styles.cardBack2} />

       {/* card-black - EFFET BLUR INTENSE MULTI-COUCHE pour simuler 216px */}
       <View style={styles.cardOverlay}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.darkMask} />
       </View>

       <View style={styles.cardGrid}>
          <SafeAreaView style={{ flex: 1 }}>
             <KeyboardAvoidingView 
               behavior={Platform.OS === 'ios' ? 'padding' : undefined}
               style={{ flex: 1 }}
             >
                <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                   <View style={styles.ionGrid}>
                      
                      {/* Row 1: Welcome (Aligné gauche: left: 0) */}
                      <View style={styles.rowTitle}>
                        <Text style={styles.row1Label}>
                           <Text style={{ fontSize: 30, fontWeight: '300' }}>Welcome to</Text>{'\n'}
                           Rudavo{'\n'}
                           FastFood
                        </Text>
                      </View>

                      {/* Row 2: Inscription */}
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.labelConnexion}>Inscription</Text>
                        </View>
                        <View style={styles.colOtherConnectWrapper}>
                          <TouchableOpacity style={styles.socialIconBtn}>
                            <Ionicons name="logo-google" size={30} color="#a65757" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.socialIconBtn, { marginLeft: 15 }]} onPress={() => router.push('/(auth)/phone')}>
                            <Ionicons name="logo-whatsapp" size={30} color="#a65757" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Inputs (Alignés gauche ico1: 0) */}
                      {!infos1ISCheck && (
                        <View style={styles.formSection}>
                           <View style={styles.ionInputContainer}>
                              <Ionicons name="person" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre nom" placeholderTextColor="#a3a3a3" value={nom} onChangeText={setNom} />
                           </View>
                           <View style={[styles.ionInputContainer, { marginTop: 20 }]}>
                              <Ionicons name="lock-closed" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre prenom" placeholderTextColor="#a3a3a3" value={prenom} onChangeText={setPrenom} />
                           </View>
                           <View style={[styles.ionInputContainer, { marginTop: 10 }]}>
                              <Ionicons name="lock-closed" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre date de naissance" placeholderTextColor="#a3a3a3" value={birth} onChangeText={setBirth} />
                           </View>
                        </View>
                      )}

                      {infos1ISCheck && !infos2ISCheck && (
                        <View style={styles.formSection}>
                           <View style={styles.ionInputContainer}>
                              <Ionicons name="person" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre numero" placeholderTextColor="#a3a3a3" value={tel} onChangeText={setTel} keyboardType="phone-pad" />
                           </View>
                           <View style={[styles.ionInputContainer, { marginTop: 10 }]}>
                              <Ionicons name="person" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre mot de Email" placeholderTextColor="#a3a3a3" value={email} onChangeText={setEmail} keyboardType="email-address" />
                           </View>
                           <View style={[styles.ionInputContainer, { marginTop: 10 }]}>
                              <Ionicons name="lock-closed" size={20} color="#a65757" style={styles.ico1} />
                              <TextInput style={styles.ionInput} placeholder="Entrer votre mot de passe" placeholderTextColor="#a3a3a3" value={password} onChangeText={setPassword} secureTextEntry={!passwordIsShow} />
                              <TouchableOpacity onPress={() => setPasswordIsShow(!passwordIsShow)} style={styles.ico2}>
                                 <Ionicons name={passwordIsShow ? "eye-off" : "eye"} size={20} color="#a65757" />
                              </TouchableOpacity>
                           </View>
                        </View>
                      )}

                      {/* Step 3: Merchant */}
                      {infos1ISCheck && infos2ISCheck && (
                        <View style={styles.merchantSection}>
                          <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsMerchant(!isMerchant)}>
                            <View style={[styles.checkbox, isMerchant && styles.checkboxChecked]}>
                              {isMerchant && <Ionicons name="checkmark" size={16} color="white" />}
                            </View>
                            <Text style={styles.merchantLabel}>compte marchant</Text>
                          </TouchableOpacity>
                          <Text style={styles.merchantDesc}>veiller cocher cette case si vous posseder un Fast Food et souhaiter la digitaliser sur notre platform</Text>
                        </View>
                      )}

                      {/* Nav Buttons (RAREMENT ÉLOIGNÉS -> JUXTAPOSÉS) */}
                      <View style={styles.rowBtnNav}>
                        <TouchableOpacity style={styles.ionButton} onPress={backStep}>
                           <Ionicons name="arrow-back-outline" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.ionButton, { marginLeft: 15 }]} onPress={infos2ISCheck ? createUser : nextStep} disabled={connect}>
                           {connect ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="arrow-forward-outline" size={20} color="white" />}
                        </TouchableOpacity>
                      </View>

                      {/* Footer */}
                      <View style={styles.rowFooter}>
                         <Text style={{ color: 'white', fontSize: 13 }}>Vous avez deja un compte ? </Text>
                         <TouchableOpacity onPress={() => router.replace('/(auth)')}>
                            <View style={styles.ionChip}>
                               <Text style={styles.chipText}>Connecter-Vous</Text>
                            </View>
                         </TouchableOpacity>
                      </View>

                   </View>
                </ScrollView>
             </KeyboardAvoidingView>
          </SafeAreaView>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  el: { flex: 1, backgroundColor: 'black' },
  cardBack: { position: 'absolute', top: 0, width: '100%', height: '35%', backgroundColor: 'red' },
  cardBack2: { position: 'absolute', bottom: 0, width: '100%', height: '57%', backgroundColor: 'black' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  darkMask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.67)' },
  cardGrid: { ...StyleSheet.absoluteFillObject, zIndex: 5000, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  ionGrid: { paddingHorizontal: 15 },
  // Alignment
  rowTitle: { marginTop: 20, marginBottom: 20 },
  row1Label: { fontSize: 50, color: 'white', fontWeight: 'bold', lineHeight: 55 },
  row2: { flexDirection: 'row', alignItems: 'center', marginTop: 40, marginBottom: 10 },
  labelConnexion: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  colOtherConnectWrapper: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  socialIconBtn: { padding: 4 },
  // Form Icons
  formSection: { width: '100%' },
  ionInputContainer: { position: 'relative', justifyContent: 'center', width: '100%', height: 60 },
  ico1: { position: 'absolute', left: 0, zIndex: 101 }, // ALIGNÉ GAUCHE
  ico2: { position: 'absolute', right: 0, zIndex: 101, padding: 5 },
  ionInput: {
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.33)',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff59',
    borderRadius: 20,
    paddingLeft: 35,
    paddingRight: 40,
    color: 'white',
    fontSize: 16,
  },
  // Merchant
  merchantSection: { marginVertical: 30, paddingHorizontal: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 2, borderColor: 'darkred', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: 'darkred' },
  merchantLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  merchantDesc: { color: 'white', fontSize: 13 },
  // Nav Buttons (RAREMENT ÉLOIGNÉS)
  rowBtnNav: { flexDirection: 'row', alignItems: 'center', marginTop: 25, paddingHorizontal: 0 },
  ionButton: { width: 35, height: 35, borderRadius: 10, backgroundColor: 'darkred', justifyContent: 'center', alignItems: 'center' },
  // Footer
  rowFooter: { marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ionChip: {
    backgroundColor: 'darkred',
    borderRadius: 26,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: 'rgb(255, 157, 157)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 9,
    elevation: 8,
  },
  chipText: { fontSize: 10, color: 'white', fontWeight: 'bold' },
});
