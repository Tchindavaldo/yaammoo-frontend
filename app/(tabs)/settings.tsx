import { Config } from "@/src/api/config";
import { APP_VERSION } from "@/src/api/version";
import {
  AppBlurView as BlurView,
  isNativeBlurAvailable,
} from "@/src/components/AppBlurView";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { UserBonusSheet } from "@/src/features/bonus/components/UserBonusSheet";
import { DriverApplyModal } from "@/src/features/driver/components/DriverApplyModal";
import { DriverManageModal } from "@/src/features/driver/components/DriverManageModal";
import { DriverMyApplicationsModal } from "@/src/features/driver/components/DriverMyApplicationsModal";
import { DriverOrdersModal } from "@/src/features/driver/components/DriverOrdersModal";
import { EditBoutiquePanel } from "@/src/features/merchant/components/EditBoutiquePanel";
import { MenuManageModal } from "@/src/features/merchant/components/MenuManageModal";
import { MerchantSupportModal } from "@/src/features/merchant/components/support/MerchantSupportModal";
import { WalletManageModal } from "@/src/features/merchant/components/WalletManageModal";
import { useNotificationSetup } from "@/src/features/notifications/hooks/useNotificationSetup";
import { getDeviceId } from "@/src/features/notifications/services/deviceId";
import { UserOrdersModal } from "@/src/features/orders/components/UserOrdersModal";
import { SettingGrid } from "@/src/features/profile/components/SettingGrid";
import { SettingGridItem } from "@/src/features/profile/components/SettingGridItem";
import { SettingGridSwitch } from "@/src/features/profile/components/SettingGridSwitch";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { SupportChatSheet } from "@/src/features/support/components/SupportChatSheet";
import { UserWalletModal } from "@/src/features/wallet/components/UserWalletModal";
import { TAB_BAR_INSET_RATIO } from "@/src/hooks/useTabBarHeight";
import { auth } from "@/src/services/firebase";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as Notifications from "expo-notifications";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

export default function SettingsScreen() {
  const { user, userData, setUserData, deleteAccount } = useAuth();
  // isDriver dérivé de driverId (pas de userData.isDriver qui peut être
  // incohérent selon le cache côté web).
  const isDriver = !!(userData as any)?.driverId;
  const { isSignedIn } = useAuthGate();
  // Mode review Apple : masque les items liés au paiement / portefeuille.
  const { appleReviewMode } = useFastFoods();
  // Reflète l'état RÉEL : permission OS native (lue au montage), pas un
  // simple booléen local. Le OFF (révocation) ne peut pas être fait par code
  // (iOS/Android l'interdisent) : au tap OFF le switch reste visuel, non
  // fonctionnel. Le ON relance le même flux qu'au premier lancement de l'app
  // (permission + sync du token en BD).
  const [notifEnabled, setNotifEnabled] = useState(false);
  const { setup: setupNotifications } = useNotificationSetup();
  const [darkMode, setDarkMode] = useState(false);
  const [editBoutiqueVisible, setEditBoutiqueVisible] = useState(false);
  const [menuManageVisible, setMenuManageVisible] = useState(false);
  const [walletManageVisible, setWalletManageVisible] = useState(false);
  // Section « Mes activités » (user + marchand) : commandes + portefeuille.
  const [userOrdersVisible, setUserOrdersVisible] = useState(false);
  const [userWalletVisible, setUserWalletVisible] = useState(false);
  // Bonus (Settings → Bonus et parrainage) : bottom sheet.
  const [userBonusVisible, setUserBonusVisible] = useState(false);
  // Contactez-nous (Settings) : sheet chat support.
  const [supportChatVisible, setSupportChatVisible] = useState(false);
  // Boutique -> Messages : discussions recues par la boutique.
  const [merchantSupportVisible, setMerchantSupportVisible] = useState(false);
  // Section « Livraison » (user) + item « Livreurs » (boutique).
  const [driverApplyVisible, setDriverApplyVisible] = useState(false);
  const [driverOrdersVisible, setDriverOrdersVisible] = useState(false);
  const [driverManageVisible, setDriverManageVisible] = useState(false);
  const [driverMyAppsVisible, setDriverMyAppsVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const REQUIRED_CONFIRM = "SUPPRIMER";
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Page Bonus V2 (fond blanc pur) : l'ombre montante de la tab bar crée une
  // bande grise disgracieuse. On la retire tant que la modale V2 est ouverte,
  // puis on restaure le style par défaut à la fermeture (navbar inchangée sinon).
  useEffect(() => {
    // MEME calcul que `app/(tabs)/_layout.tsx` / `useTabBarHeight` : la navbar
    // ne doit pas changer de hauteur d'un onglet a l'autre.
    const bottomInset = insets.bottom * TAB_BAR_INSET_RATIO;
    const base = {
      height: 58 + bottomInset,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      // MEME regle que `_layout.tsx` : sans flou natif (Android < 12), un fond
      // semi-transparent laisse voir le contenu au travers -> blanc opaque.
      backgroundColor: isNativeBlurAvailable
        ? "rgba(255, 255, 255, 0.7)"
        : "#ffffff",
      borderTopWidth: 0,
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: bottomInset,
      paddingTop: 8,
    };
    navigation.setOptions({
      tabBarStyle: userBonusVisible
        ? {
            ...base,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
          }
        : {
            ...base,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
    });
  }, [userBonusVisible, navigation, insets.bottom]);

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
      setDeleteConfirmText("");
      setDeleteError(null);
    }
  }, [isSignedIn]);

  // État réel du switch Notifications : ON seulement si la permission OS est
  // accordée ET qu'un token de CE device est déjà synced en BD
  // (userData.pushTokens). Un refus au premier lancement (permission refusée
  // → jamais de token envoyé) affiche donc bien OFF, et le tap relance la
  // demande native. Re-lu à chaque focus de l'écran (retour depuis les
  // réglages système après un changement de permission).
  useEffect(() => {
    let cancelled = false;
    const readState = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled) setNotifEnabled(false);
        return;
      }
      const deviceId = await getDeviceId();
      const pushTokens =
        ((userData as any)?.pushTokens as
          | Array<{ deviceId: string }>
          | undefined) || [];
      const hasTokenSynced = pushTokens.some((t) => t?.deviceId === deviceId);
      if (!cancelled) setNotifEnabled(hasTokenSynced);
    };
    readState();
    const unsub = navigation.addListener("focus", readState);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [navigation, userData]);

  const handleNotifToggle = async (next: boolean) => {
    if (!next) {
      // Pas de révocation possible par code : état visuel seulement.
      setNotifEnabled(false);
      return;
    }
    // ON = même flux que le premier lancement (permission native + sync BD).
    await setupNotifications();
    const { status } = await Notifications.getPermissionsAsync();
    setNotifEnabled(status === "granted");
  };

  // Deep-link : notifications / home « Mes commandes » → ouvre le modal commandes.
  const { section } = useLocalSearchParams<{ section?: string }>();
  useEffect(() => {
    if (
      section === "pending" ||
      section === "active" ||
      section === "finished"
    ) {
      setUserOrdersVisible(true);
    } else if (section === "drivers") {
      // Notif « demande de livraison » (marchand) → modal Livreurs.
      setDriverManageVisible(true);
    } else if (section === "my-applications") {
      // Notif « demande décidée » (candidat) → modal Mes demandes.
      setDriverMyAppsVisible(true);
    } else if (section === "bonus") {
      // Notif « bonus éligible » → modal Bonus.
      setUserBonusVisible(true);
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
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        console.log("🗑️ [Settings] push-token/remove OK pour ce device");
      }
    } catch (e: any) {
      console.warn(
        "⚠️ [Settings] push-token/remove échoué (on continue le logout):",
        e?.message,
      );
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
    if (Platform.OS === "web") {
      window.alert(
        `La section "${label}" sera disponible dans une prochaine version.`,
      );
    } else {
      Alert.alert(
        "Bientôt disponible",
        `La section "${label}" sera disponible dans une prochaine version.`,
      );
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText("");
    setDeleteError(null);
    setDeleteVisible(true);
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setDeleteVisible(false);
    setDeleteConfirmText("");
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
          "Impossible de supprimer le compte. Réessayez ou contactez le support.",
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
  const initiales =
    (userData?.infos.prenom || userData?.infos.nom || firebaseName)
      ?.charAt(0)
      ?.toUpperCase() || "U";
  const nomComplet =
    [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ") ||
    firebaseName ||
    "Utilisateur";
  const contact =
    userData?.infos.email ||
    user?.email ||
    userData?.infos.numero?.toString() ||
    "";

  return (
    <View style={styles.container}>
      {/* Header Profil Fixe et Flouté */}
      <BlurView
        intensity={80}
        tint="light"
        pointerEvents="auto"
        style={[styles.profileCard, { paddingTop: insets.top + 20 }]}
        fallbackStyle={styles.profileCardOpaque}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initiales}</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
            {nomComplet}
          </Text>
          <Text
            style={styles.userContact}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {contact}
          </Text>
          {userData?.isMarchand && (
            <View style={styles.merchantBadge}>
              <Ionicons name="storefront-outline" size={12} color="white" />
              <Text style={styles.merchantBadgeText}>Marchand</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => handleComingSoon("Édition du profil")}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={Theme.colors.primary}
          />
        </TouchableOpacity>
      </BlurView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 100,
          paddingBottom: 40,
          paddingHorizontal: 16,
        }}
      >
        {/* Mes activités (user ET marchand : un marchand passe aussi des commandes) */}
        <SectionHeader title="Mes activités" />
        <SettingGrid>
          <SettingGridItem
            icon="receipt-outline"
            title="État des commandes"
            tone="accent"
            onPress={() => setUserOrdersVisible(true)}
          />
          {!appleReviewMode && (
            <SettingGridItem
              icon="wallet-outline"
              title="Portefeuille"
              tone="accent"
              onPress={() => setUserWalletVisible(true)}
            />
          )}
        </SettingGrid>

        {/* Compte */}
        <SectionHeader title="Compte" />
        <SettingGrid>
          <SettingGridItem
            icon="person-outline"
            title="Mon profil"
            onPress={() => handleComingSoon("Mon profil")}
          />
          <SettingGridItem
            icon="key-outline"
            title="Sécurité"
            onPress={() => handleComingSoon("Sécurité")}
          />
          {!appleReviewMode && (
            <SettingGridItem
              icon="card-outline"
              title="Paiement"
              onPress={() => handleComingSoon("Paiement")}
            />
          )}
          <SettingGridItem
            icon="gift-outline"
            title="Bonus"
            onPress={() => setUserBonusVisible(true)}
          />
        </SettingGrid>

        {/* Boutique - only show for merchants (AVANT Livraison) */}
        {userData?.isMarchand && userData?.fastFoodId && (
          <>
            <SectionHeader title="Boutique" />
            <SettingGrid>
              <SettingGridItem
                icon="storefront-outline"
                title="Gérer ma boutique"
                onPress={() => setEditBoutiqueVisible(true)}
              />
              <SettingGridItem
                icon="restaurant-outline"
                title="Gestion menu"
                onPress={() => setMenuManageVisible(true)}
              />
              <SettingGridItem
                icon="bicycle-outline"
                title="Livreurs"
                onPress={() => setDriverManageVisible(true)}
              />
              <SettingGridItem
                icon="chatbubbles-outline"
                title="Messages"
                onPress={() => setMerchantSupportVisible(true)}
              />
              {!appleReviewMode && (
                <SettingGridItem
                  icon="wallet-outline"
                  title="Portefeuille boutique"
                  onPress={() => setWalletManageVisible(true)}
                />
              )}
            </SettingGrid>
          </>
        )}

        {/* Livraison (tout user) : devenir livreur, ou gérer ses livraisons si déjà livreur */}
        <SectionHeader title="Livraison" />
        <SettingGrid>
          {/* Un livreur peut servir plusieurs boutiques → toujours pouvoir
              postuler ailleurs, même déjà livreur. */}
          {isDriver && (
            <SettingGridItem
              icon="bicycle-outline"
              title="Mes livraisons"
              onPress={() => setDriverOrdersVisible(true)}
            />
          )}
          <SettingGridItem
            icon="document-text-outline"
            title="Mes demandes"
            onPress={() => setDriverMyAppsVisible(true)}
          />
          <SettingGridItem
            icon="add-circle-outline"
            title={isDriver ? "Postuler à une boutique" : "Devenir livreur"}
            onPress={() => setDriverApplyVisible(true)}
          />
        </SettingGrid>

        {/* Préférences */}
        <SectionHeader title="Préférences" />
        <SettingGrid>
          <SettingGridSwitch
            icon="notifications-outline"
            title="Notifications"
            tone="info"
            value={notifEnabled}
            onValueChange={handleNotifToggle}
          />
          <SettingGridSwitch
            icon="moon-outline"
            title="Mode sombre"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingGridItem
            icon="language-outline"
            title="Langue"
            hint="Français"
            onPress={() => handleComingSoon("Langue")}
          />
        </SettingGrid>

        {/* Aide & Legal */}
        <SectionHeader title="Aide & Légal" />
        <SettingGrid>
          <SettingGridItem
            icon="help-circle-outline"
            title="Assistance"
            onPress={() => handleComingSoon("Assistance")}
          />
          <SettingGridItem
            icon="chatbox-outline"
            title="Signaler un problème"
            onPress={() => handleComingSoon("Signaler un problème")}
          />
          <SettingGridItem
            icon="flag-outline"
            title="Faire une suggestion"
            onPress={() => handleComingSoon("Faire une suggestion")}
          />
          <SettingGridItem
            icon="document-text-outline"
            title="Politique & Conditions"
            onPress={() => handleComingSoon("Politique & Conditions")}
          />
          <SettingGridItem
            icon="lock-closed-outline"
            title="Confidentialité"
            onPress={() => handleComingSoon("Confidentialité")}
          />
          <SettingGridItem
            icon="call-outline"
            title="Contactez-nous"
            tone="accent"
            onPress={() => setSupportChatVisible(true)}
          />
        </SettingGrid>

        {/* Sessions */}
        <SectionHeader title="Session" />
        <SettingGrid>
          <SettingGridItem
            icon="swap-horizontal-outline"
            title="Changer de compte"
            onPress={() => handleComingSoon("Changer de compte")}
          />
          <SettingGridItem
            icon="exit-outline"
            title="Déconnexion"
            tone="danger"
            onPress={handleLogout}
          />
        </SettingGrid>

        {/* Zone de danger */}
        <SectionHeader title="Zone de danger" />
        <SettingGrid>
          <SettingGridItem
            icon="trash-outline"
            title="Supprimer mon compte"
            tone="danger"
            onPress={handleDeleteAccount}
          />
        </SettingGrid>

        {/* App version — reflete TOUJOURS `app.json` (via `APP_VERSION`), jamais
            une valeur en dur a remettre a jour manuellement. Annee courante idem. */}
        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>Yaammoo v{APP_VERSION}</Text>
          <Text style={styles.versionSubtext}>
            © {new Date().getFullYear()} Yaammoo. Tous droits réservés.
          </Text>
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

      {/* Boutique : discussions recues des clients */}
      <MerchantSupportModal
        visible={merchantSupportVisible}
        onClose={() => setMerchantSupportVisible(false)}
      />

      {/* Contactez-nous : chat support */}
      <SupportChatSheet
        visible={supportChatVisible}
        onClose={() => setSupportChatVisible(false)}
      />

      {/* Bonus et parrainage (bottom sheet) */}
      <UserBonusSheet
        visible={userBonusVisible}
        onClose={() => setUserBonusVisible(false)}
      />

      {/* Livraison (user) : postuler / gérer ses livraisons */}
      <DriverApplyModal
        visible={driverApplyVisible}
        onClose={() => setDriverApplyVisible(false)}
      />
      <DriverOrdersModal
        visible={driverOrdersVisible}
        onClose={() => setDriverOrdersVisible(false)}
      />
      <DriverMyApplicationsModal
        visible={driverMyAppsVisible}
        onClose={() => setDriverMyAppsVisible(false)}
      />

      {/* Boutique : gérer demandes + livreurs */}
      <DriverManageModal
        visible={driverManageVisible}
        onClose={() => setDriverManageVisible(false)}
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
              Cette action est{" "}
              <Text style={{ fontWeight: "700" }}>
                définitive et irréversible
              </Text>
              .{"\n\n"}
              Toutes vos données seront supprimées :{"\n"}• Votre profil et
              identifiants{"\n"}• Vos commandes et transactions{"\n"}• Vos bonus
              et notifications{"\n"}
              {userData?.isMarchand ? "• Votre boutique et menus\n" : ""}
              {"\n"}Pour confirmer, tapez{" "}
              <Text style={{ fontWeight: "700", color: Theme.colors.danger }}>
                {REQUIRED_CONFIRM}
              </Text>{" "}
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
                  deleteConfirmText.trim().toUpperCase() !==
                    REQUIRED_CONFIRM && { opacity: 0.5 },
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
            <View
              style={[
                styles.deleteIconWrap,
                { backgroundColor: Theme.colors.danger + "15" },
              ]}
            >
              <Ionicons
                name="exit-outline"
                size={32}
                color={Theme.colors.danger}
              />
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
    backgroundColor: "#fff",
  },
  // Sans flou natif (Android < 12), fond opaque : le contenu qui scrolle
  // dessous ne doit pas transparaître.
  profileCardOpaque: {
    backgroundColor: "#ffffff",
  },
  profileCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: Theme.spacing.lg,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    gap: Theme.spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    textAlign: "center",
    lineHeight: 64,
  },
  onlineDot: {
    position: "absolute",
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
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  userContact: {
    fontSize: 13,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  merchantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    gap: 4,
  },
  merchantBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: Theme.colors.gray[600],
    marginLeft: 4,
    marginTop: 22,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  versionBlock: {
    alignItems: "center",
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  deleteCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  deleteIconWrap: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.danger + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.dark,
    textAlign: "center",
    marginBottom: 6,
  },
  deleteMessage: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "left",
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
    fontWeight: "600",
    marginBottom: 18,
    backgroundColor: Theme.colors.gray[100],
    textAlign: "center",
    letterSpacing: 2,
  },
  deleteErrorText: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -8,
    marginBottom: 16,
  },
  deleteActions: {
    flexDirection: "row",
    gap: 10,
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnCancel: {
    backgroundColor: Theme.colors.gray[100],
  },
  deleteBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: Theme.colors.dark,
  },
  deleteBtnDanger: {
    backgroundColor: Theme.colors.danger,
  },
  deleteBtnDangerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
