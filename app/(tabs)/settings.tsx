import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Switch,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingItem } from '@/src/features/profile/components/SettingItem';
import { Theme } from '@/src/theme';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useAuthGate } from '@/src/features/auth/context/AuthGateContext';
import { GuestGate } from '@/src/features/auth/components/GuestGate';
import { auth } from '@/src/services/firebase';
import { signOut } from 'firebase/auth';
import { EditBoutiquePanel } from '@/src/features/merchant/components/EditBoutiquePanel';
import { MenuManageModal } from '@/src/features/merchant/components/MenuManageModal';
import { WalletManageModal } from '@/src/features/merchant/components/WalletManageModal';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { getDeviceId } from '@/src/features/notifications/services/deviceId';
import { useFastFoods } from '@/src/features/restaurants/hooks/useFastFoods';
import { UserOrdersModal } from '@/src/features/orders/components/UserOrdersModal';
import { UserWalletModal } from '@/src/features/wallet/components/UserWalletModal';
import { useLocalSearchParams } from 'expo-router';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

export default function SettingsScreen() {
  const { user, userData, setUserData, deleteAccount } = useAuth();
  const { isSignedIn } = useAuthGate();
  // Mode review Apple : masque les items liés au paiement / portefeuille.
  const { appleReviewMode } = useFastFoods();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [editBoutiqueVisible, setEditBoutiqueVisible] = useState(false);
  const [menuManageVisible, setMenuManageVisible] = useState(false);
  const [walletManageVisible, setWalletManageVisible] = useState(false);
  // Section « Mes activités » (user + marchand) : commandes + portefeuille.
  const [userOrdersVisible, setUserOrdersVisible] = useState(false);
  const [userWalletVisible, setUserWalletVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const REQUIRED_CONFIRM = 'SUPPRIMER';
  const insets = useSafeAreaInsets();

  // Mode invité : après déconnexion/suppression, settings n'est PLUS démonté
  // (l'invité reste dans les tabs, on affiche juste le GuestGate via le
  // early-return). Le loader de logout/delete était laissé actif « jusqu'au
  // démontage » → il restait bloqué et le modal réapparaissait à la
  // reconnexion. On réinitialise donc ces états dès qu'on n'est plus connecté.
  useEffect(() => {
    if (!isSignedIn) {
      setLogoutVisible(false);
      setIsLoggingOut(false);
      setDeleteVisible(false);
      setIsDeleting(false);
      setDeleteConfirmText('');
      setDeleteError(null);
    }
  }, [isSignedIn]);

  // Deep-link : notifications / home « Mes commandes » → ouvre le modal commandes.
  const { section } = useLocalSearchParams<{ section?: string }>();
  useEffect(() => {
    if (section === 'pending' || section === 'active' || section === 'finished') {
      setUserOrdersVisible(true);
    }
  }, [section]);

  // Ouvre le modal custom de confirmation de déconnexion.
  const handleLogout = () => setLogoutVisible(true);

  const cancelLogout = () => {
    if (isLoggingOut) return;
    setLogoutVisible(false);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    // Best-effort: désenregistre ce device des push avant de signer out
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) {
        const deviceId = await getDeviceId();
        await axios.post(
          `${Config.apiUrl}/user/push-token/remove`,
          { deviceId },
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            },
          },
        );
        console.log('🗑️ [Settings] push-token/remove OK pour ce device');
      }
    } catch (e: any) {
      console.warn('⚠️ [Settings] push-token/remove échoué (on continue le logout):', e?.message);
    }

    // Le retour vers (auth) est piloté par le guard Stack.Protected dans
    // app/_layout.tsx. signOut → onAuthStateChanged → userData=null → le groupe
    // (auth) se monte automatiquement et l'écran settings se DÉMONTE.
    // On ne ferme PAS le modal et on ne remet PAS isLoggingOut à false : le
    // loader tourne jusqu'au démontage (comme au login). Fermer le modal ici
    // ferait voir "settings nu" une frame avant la redirection.
    await signOut(auth);
    setUserData(null);
  };

  const handleComingSoon = (label: string) => {
    if (Platform.OS === 'web') {
      window.alert(`La section "${label}" sera disponible dans une prochaine version.`);
    } else {
      Alert.alert('Bientôt disponible', `La section "${label}" sera disponible dans une prochaine version.`);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setDeleteVisible(true);
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setDeleteVisible(false);
    setDeleteConfirmText('');
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    // Le bouton "Supprimer" est déjà disabled tant que le texte ≠ REQUIRED_CONFIRM,
    // donc pas de re-validation ici (et plus d'Alert native).
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // deleteAccount() fait signOut + setUserData(null) → le guard Stack.Protected
      // (app/_layout.tsx) bascule automatiquement vers (auth) et DÉMONTE settings.
      // On ne ferme PAS le modal et on ne coupe PAS le loader sur succès : il
      // tourne jusqu'au démontage (comme le logout). Pas d'Alert bloquante avant
      // la redirection. Sur succès, les lignes après sont injoignables (démontage).
      await deleteAccount();
    } catch (error: any) {
      setIsDeleting(false);
      // Erreur affichée INLINE dans le modal (pas d'Alert native).
      setDeleteError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Impossible de supprimer le compte. Réessayez ou contactez le support.',
      );
    }
  };

  // Invité : le profil est lié au compte → on demande la connexion.
  if (!isSignedIn) {
    return (
      <GuestGate
        icon="person-circle-outline"
        title="Votre profil"
        subtitle="Connectez-vous pour gérer votre compte, vos commandes et vos paramètres."
      >
        {null}
      </GuestGate>
    );
  }

  const firebaseName = user?.displayName || "";
  const initiales = (userData?.infos.prenom || userData?.infos.nom || firebaseName)?.charAt(0)?.toUpperCase() || 'U';
  const nomComplet = [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(' ') || firebaseName || 'Utilisateur';
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || '';

  return (
    <View style={styles.container}>
      {/* Header Profil Fixe et Flouté */}
      <BlurView intensity={80} tint="light" style={[styles.profileCard, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initiales}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{nomComplet}</Text>
          <Text style={styles.userContact} numberOfLines={1} ellipsizeMode="tail">{contact}</Text>
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
      </BlurView>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 100, paddingBottom: 40 }}
      >
        {/* Mes activités (user ET marchand : un marchand passe aussi des commandes) */}
        <SectionHeader title="Mes activités" />
        <View style={styles.section}>
          <SettingItem
            icon="receipt-outline"
            title="État des commandes"
            onPress={() => setUserOrdersVisible(true)}
          />
          {!appleReviewMode && (
            <SettingItem
              icon="wallet-outline"
              title="Portefeuille"
              onPress={() => setUserWalletVisible(true)}
            />
          )}
        </View>

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
          {!appleReviewMode && (
            <SettingItem
              icon="card-outline"
              title="Paiement"
              onPress={() => handleComingSoon('Paiement')}
            />
          )}
          <SettingItem
            icon="gift-outline"
            title="Bonus et parrainage"
            onPress={() => handleComingSoon('Bonus et parrainage')}
          />
        </View>

        {/* Boutique - only show for merchants */}
        {userData?.isMarchand && userData?.fastFoodId && (
          <>
            <SectionHeader title="Boutique" />
            <View style={styles.section}>
              <SettingItem
                icon="storefront-outline"
                title="Gérer ma boutique"
                onPress={() => setEditBoutiqueVisible(true)}
              />
              <SettingItem
                icon="restaurant-outline"
                title="Gestion menu"
                onPress={() => setMenuManageVisible(true)}
              />
              {!appleReviewMode && (
                <SettingItem
                  icon="wallet-outline"
                  title="Portefeuille"
                  onPress={() => setWalletManageVisible(true)}
                />
              )}
            </View>
          </>
        )}

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

        {/* Zone de danger */}
        <SectionHeader title="Zone de danger" />
        <View style={[styles.section, { borderWidth: 1, borderColor: Theme.colors.danger + '30' }]}>
          <SettingItem
            icon="trash-outline"
            title="Supprimer mon compte"
            color={Theme.colors.danger}
            onPress={handleDeleteAccount}
          />
        </View>

        {/* App version */}
        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>Yaammoo v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2025 Yaammoo. Tous droits réservés.</Text>
        </View>
      </ScrollView>

      {/* Edit Boutique Modal */}
      <EditBoutiquePanel
        visible={editBoutiqueVisible}
        onClose={() => setEditBoutiqueVisible(false)}
        onSuccess={() => {
          // Refresh if needed
        }}
      />

      {/* Gestion menu / Portefeuille (modals plein écran) */}
      <MenuManageModal
        visible={menuManageVisible}
        onClose={() => setMenuManageVisible(false)}
      />
      <WalletManageModal
        visible={walletManageVisible}
        onClose={() => setWalletManageVisible(false)}
      />

      {/* Mes activités : commandes + portefeuille user (plein écran) */}
      <UserOrdersModal
        visible={userOrdersVisible}
        onClose={() => setUserOrdersVisible(false)}
      />
      <UserWalletModal
        visible={userWalletVisible}
        onClose={() => setUserWalletVisible(false)}
      />

      {/* Modal Suppression de compte */}
      <Modal
        visible={deleteVisible}
        transparent
        // "none" : même raison que le modal de déconnexion. Sur succès, le modal
        // est arraché par le démontage de settings (redirection auto vers (auth)) ;
        // un fondu de fermeture révélerait "settings nu". Le loader reste plein
        // jusqu'au démontage, puis le fondu de navigation enchaîne.
        animationType="none"
        onRequestClose={cancelDelete}
        statusBarTranslucent
      >
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="warning" size={32} color={Theme.colors.danger} />
            </View>
            <Text style={styles.deleteTitle}>Supprimer mon compte</Text>
            <Text style={styles.deleteMessage}>
              Cette action est <Text style={{ fontWeight: '700' }}>définitive et irréversible</Text>.{'\n\n'}
              Toutes vos données seront supprimées :{'\n'}
              • Votre profil et identifiants{'\n'}
              • Vos commandes et transactions{'\n'}
              • Vos bonus et notifications{'\n'}
              {userData?.isMarchand ? '• Votre boutique et menus\n' : ''}
              {'\n'}Pour confirmer, tapez{' '}
              <Text style={{ fontWeight: '700', color: Theme.colors.danger }}>{REQUIRED_CONFIRM}</Text>{' '}
              ci-dessous.
            </Text>

            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={(t) => {
                setDeleteConfirmText(t);
                if (deleteError) setDeleteError(null);
              }}
              placeholder={REQUIRED_CONFIRM}
              placeholderTextColor={Theme.colors.gray[300]}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isDeleting}
            />

            {deleteError ? (
              <Text style={styles.deleteErrorText}>{deleteError}</Text>
            ) : null}

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteBtn, styles.deleteBtnCancel]}
                onPress={cancelDelete}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteBtn,
                  styles.deleteBtnDanger,
                  deleteConfirmText.trim().toUpperCase() !== REQUIRED_CONFIRM && { opacity: 0.5 },
                ]}
                onPress={confirmDelete}
                disabled={
                  isDeleting ||
                  deleteConfirmText.trim().toUpperCase() !== REQUIRED_CONFIRM
                }
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteBtnDangerText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Déconnexion */}
      <Modal
        visible={logoutVisible}
        transparent
        // "none" : pas d'animation de fermeture propre au Modal. Au logout, on ne
        // ferme jamais ce modal (le démontage de settings l'arrache) ; avec "fade",
        // Android joue quand même un fondu de fermeture qui révèle "settings nu"
        // avant la transition de navigation vers (auth). Avec "none", le modal
        // reste plein (loader visible) jusqu'au démontage, puis le fondu de
        // navigation enchaîne directement → pas d'étape intermédiaire.
        animationType="none"
        onRequestClose={cancelLogout}
        statusBarTranslucent
      >
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteCard}>
            <View style={[styles.deleteIconWrap, { backgroundColor: Theme.colors.danger + '15' }]}>
              <Ionicons name="exit-outline" size={32} color={Theme.colors.danger} />
            </View>
            <Text style={styles.deleteTitle}>Déconnexion</Text>
            <Text style={styles.deleteMessage}>
              Êtes-vous sûr de vouloir vous déconnecter ?
            </Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteBtn, styles.deleteBtnCancel]}
                onPress={cancelLogout}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, styles.deleteBtnDanger]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteBtnDangerText}>Déconnecter</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: Theme.spacing.lg,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    gap: Theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
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
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  deleteIconWrap: {
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.dark,
    textAlign: 'center',
    marginBottom: 6,
  },
  deleteMessage: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: 'left',
    marginBottom: 18,
    lineHeight: 20,
  },
  deleteInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Theme.colors.dark,
    fontWeight: '600',
    marginBottom: 18,
    backgroundColor: Theme.colors.gray[100],
    textAlign: 'center',
    letterSpacing: 2,
  },
  deleteErrorText: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnCancel: {
    backgroundColor: Theme.colors.gray[100],
  },
  deleteBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.dark,
  },
  deleteBtnDanger: {
    backgroundColor: Theme.colors.danger,
  },
  deleteBtnDangerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
