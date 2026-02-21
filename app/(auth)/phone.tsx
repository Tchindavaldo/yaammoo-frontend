import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePhoneAuth } from '@/src/features/auth/hooks/usePhoneAuth';
import { AuthInput } from '@/src/features/auth/components/AuthInput';
import { AuthButton } from '@/src/features/auth/components/AuthButton';
import { Theme } from '@/src/theme';
import { userFirestore } from '@/src/features/auth/services/userFirestore';
import { generalDataService } from '@/src/features/auth/services/generalDataService';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { Users, UsersInfos } from '@/src/types';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { setUserData } = useAuth();
  const { loading, error, verifyCode, setError } = usePhoneAuth();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  const handleSendCode = async () => {
    if (!phone) {
      setError('Veuiller entrer le numero de telephone');
      return;
    }
    // Logic for sending code would go here. 
    // In Expo, this typically requires a Firebase Recaptcha setup.
    // For this migration, we assume the hook handles the ID.
    console.log('Sending code to:', phone);
    setSmsSent(true);
    // setVerificationId(res.verificationId)
  };

  const handleVerify = async () => {
    if (!code) {
      setError('Veuiller entrer le code envoyer');
      return;
    }

    const firebaseUser = await verifyCode(code);
    if (firebaseUser) {
      // Handle User database logic
      const generalData = await generalDataService.getUserData();
      if (generalData) {
        const existingUser = await userFirestore.findUserByPhoneAndUid(
          generalData.nbrTotalUser, 
          parseInt(phone), 
          firebaseUser.uid
        );

        if (existingUser) {
          setUserData(existingUser);
        } else {
          const newUser = new Users(
            new UsersInfos('', '', 0, parseInt(phone), firebaseUser.uid, '', ''),
            false,
            100,
            []
          );
          const newIdx = generalData.nbrTotalUser.toString();
          await userFirestore.saveUser(newUser, newIdx);
          await generalDataService.updateUserData({
            ...generalData,
            nbrTotalUser: generalData.nbrTotalUser + 1
          });
          setUserData(newUser);
        }
      }
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Theme.colors.dark} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {smsSent ? 'Vérification du code' : 'Connexion via numéro'}
            </Text>
            <Text style={styles.subtitle}>
              {smsSent 
                ? 'Entrer le code envoyer au numero' 
                : 'Veuiller entrer votre numero de telephone'}
            </Text>
          </View>

          <View style={styles.form}>
            {!smsSent ? (
              <AuthInput
                icon="call-outline"
                placeholder="Numéro de téléphone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="number-pad"
                prefix="+237"
              />
            ) : (
              <AuthInput
                icon="lock-closed-outline"
                placeholder="Code de vérification"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <AuthButton
              title={smsSent ? 'Vérifier' : 'Suivant'}
              onPress={smsSent ? handleVerify : handleSendCode}
              loading={loading}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: Theme.spacing.lg,
    flexGrow: 1,
  },
  backBtn: {
    marginBottom: Theme.spacing.xl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.gray[600],
  },
  form: {
    marginTop: Theme.spacing.lg,
  },
  button: {
    marginTop: Theme.spacing.md,
  },
  errorText: {
    color: Theme.colors.danger,
    marginBottom: Theme.spacing.md,
    fontSize: 14,
  },
});
