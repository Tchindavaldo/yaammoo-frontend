import React from 'react';
import { StyleSheet, ScrollView, SafeAreaView, View, Text } from 'react-native';
import { SettingItem } from '@/src/features/profile/components/SettingItem';
import { Theme } from '@/src/theme';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { auth } from '@/src/services/firebase';
import { signOut } from 'firebase/auth';

export default function SettingsScreen() {
  const { userData, setUserData } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userData?.infos.nom?.charAt(0) || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{userData?.infos.nom || 'Utilisateur'}</Text>
            <Text style={styles.userEmail}>{userData?.infos.email || userData?.infos.numero}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <SettingItem icon="person-outline" title="Profil" />
        <SettingItem icon="card-outline" title="Paiements" />
        <SettingItem icon="gift-outline" title="Bonus et parrainage" />

        <Text style={styles.sectionTitle}>Préférences</Text>
        <SettingItem icon="notifications-outline" title="Notifications" />
        <SettingItem icon="language-outline" title="Langue" />
        <SettingItem icon="moon-outline" title="Mode sombre" />

        <Text style={styles.sectionTitle}>Aide & Légal</Text>
        <SettingItem icon="help-circle-outline" title="Assistance" />
        <SettingItem icon="document-text-outline" title="Conditions d'utilisation" />
        <SettingItem icon="exit-outline" title="Déconnexion" color={Theme.colors.danger} onPress={handleLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.light,
  },
  header: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[200],
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  avatarText: {
    color: Theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  userEmail: {
    fontSize: 14,
    color: Theme.colors.gray[600],
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.gray[500],
    marginLeft: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    textTransform: 'uppercase',
  },
});
