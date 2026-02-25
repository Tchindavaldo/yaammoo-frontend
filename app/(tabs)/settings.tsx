import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingItem } from '@/src/features/profile/components/SettingItem';
import { Theme } from '@/src/theme';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { auth } from '@/src/services/firebase';
import { signOut } from 'firebase/auth';

import { useRouter } from 'expo-router';

// ... (in SettingsScreen)
const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

export default function SettingsScreen() {
  const { userData, setUserData } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const performLogout = async () => {
      await signOut(auth);
      setUserData(null);
      router.replace('/(auth)');
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Déconnecter',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const handleComingSoon = (label: string) => {
    if (Platform.OS === 'web') {
      window.alert(`La section "${label}" sera disponible dans une prochaine version.`);
    } else {
      Alert.alert('Bientôt disponible', `La section "${label}" sera disponible dans une prochaine version.`);
    }
  };

  const initiales = userData?.infos.nom?.charAt(0)?.toUpperCase() || 'U';
  const nomComplet = [userData?.infos.nom, userData?.infos.prenom].filter(Boolean).join(' ') || 'Utilisateur';
  const contact = userData?.infos.email || userData?.infos.numero?.toString() || '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Profil */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initiales}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{nomComplet}</Text>
          <Text style={styles.userContact}>{contact}</Text>
          {userData?.isMarchand && (
            <View style={styles.merchantBadge}>
              <Ionicons name="storefront-outline" size={12} color="white" />
              <Text style={styles.merchantBadgeText}>Marchand</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.editProfileBtn} onPress={() => handleComingSoon('Édition du profil')}>
          <Ionicons name="create-outline" size={18} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Compte */}
        <SectionHeader title="Compte" />
        <View style={styles.section}>
          <SettingItem
            icon="person-outline"
            title="Mon profil"
            onPress={() => handleComingSoon('Mon profil')}
          />
          <SettingItem
            icon="key-outline"
            title="Sécurité"
            onPress={() => handleComingSoon('Sécurité')}
          />
          <SettingItem
            icon="card-outline"
            title="Paiement"
            onPress={() => handleComingSoon('Paiement')}
          />
          <SettingItem
            icon="gift-outline"
            title="Bonus et parrainage"
            onPress={() => handleComingSoon('Bonus et parrainage')}
          />
        </View>

        {/* Préférences */}
        <SectionHeader title="Préférences" />
        <View style={styles.section}>
          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <View style={[styles.switchIcon, { backgroundColor: Theme.colors.info + '15' }]}>
                <Ionicons name="notifications-outline" size={20} color={Theme.colors.info} />
              </View>
              <Text style={styles.switchLabel}>Notifications</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: Theme.colors.gray[200], true: Theme.colors.primary + '60' }}
              thumbColor={notifEnabled ? Theme.colors.primary : Theme.colors.gray[400]}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <View style={[styles.switchIcon, { backgroundColor: '#1c1c1e15' }]}>
                <Ionicons name="moon-outline" size={20} color="#1c1c1e" />
              </View>
              <Text style={styles.switchLabel}>Mode sombre</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Theme.colors.gray[200], true: Theme.colors.primary + '60' }}
              thumbColor={darkMode ? Theme.colors.primary : Theme.colors.gray[400]}
            />
          </View>

          <SettingItem
            icon="language-outline"
            title="Langue"
            onPress={() => handleComingSoon('Langue')}
          />
        </View>

        {/* Aide & Legal */}
        <SectionHeader title="Aide & Légal" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="Assistance"
            onPress={() => handleComingSoon('Assistance')}
          />
          <SettingItem
            icon="chatbox-outline"
            title="Signaler un problème"
            onPress={() => handleComingSoon('Signaler un problème')}
          />
          <SettingItem
            icon="flag-outline"
            title="Faire une suggestion"
            onPress={() => handleComingSoon('Faire une suggestion')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Politique & Conditions"
            onPress={() => handleComingSoon('Politique & Conditions')}
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Confidentialité"
            onPress={() => handleComingSoon('Confidentialité')}
          />
          <SettingItem
            icon="call-outline"
            title="Contactez-nous"
            onPress={() => handleComingSoon('Contactez-nous')}
          />
        </View>

        {/* Sessions */}
        <SectionHeader title="Session" />
        <View style={styles.section}>
          <SettingItem
            icon="swap-horizontal-outline"
            title="Changer de compte"
            onPress={() => handleComingSoon('Changer de compte')}
          />
          <SettingItem
            icon="exit-outline"
            title="Déconnexion"
            color={Theme.colors.danger}
            onPress={handleLogout}
          />
        </View>

        {/* App version */}
        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>Yaammoo v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2025 Yaammoo. Tous droits réservés.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    gap: Theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    textAlign: 'center',
    lineHeight: 64,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.colors.success,
    borderWidth: 2,
    borderColor: Theme.colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  userContact: {
    fontSize: 13,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  merchantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    gap: 4,
  },
  merchantBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.gray[500],
    marginLeft: Theme.spacing.md,
    marginTop: 22,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  section: {
    overflow: 'hidden',
    borderRadius: Theme.borderRadius.lg,
    marginHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  switchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Theme.colors.dark,
  },
  versionBlock: {
    alignItems: 'center',
    padding: Theme.spacing.xl,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 13,
    color: Theme.colors.gray[400],
  },
  versionSubtext: {
    fontSize: 11,
    color: Theme.colors.gray[300],
    marginTop: 4,
  },
});
