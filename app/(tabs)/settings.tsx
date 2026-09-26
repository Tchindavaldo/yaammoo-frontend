import { APP_VERSION } from "@/src/api/version";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
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
import { UserOrdersModal } from "@/src/features/orders/components/UserOrdersModal";
import { DeleteAccountModal } from "@/src/features/profile/components/DeleteAccountModal";
import { LogoutModal } from "@/src/features/profile/components/LogoutModal";
import { SettingGrid } from "@/src/features/profile/components/SettingGrid";
import { SettingGridItem } from "@/src/features/profile/components/SettingGridItem";
import { SettingGridSwitch } from "@/src/features/profile/components/SettingGridSwitch";
import { SettingsProfileCard } from "@/src/features/profile/components/SettingsProfileCard";
import { useNotificationSwitch } from "@/src/features/profile/hooks/useNotificationSwitch";
import { useSettingsSubScreens } from "@/src/features/profile/hooks/useSettingsSubScreens";
import { useSettingsTabBarStyle } from "@/src/features/profile/hooks/useSettingsTabBarStyle";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { SupportChatSheet } from "@/src/features/support/components/SupportChatSheet";
import { UserWalletModal } from "@/src/features/wallet/components/UserWalletModal";
import { Theme } from "@/src/theme";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

export default function SettingsScreen() {
  const { userData } = useAuth();
  // isDriver dérivé de driverId (pas de userData.isDriver qui peut être
  // incohérent selon le cache côté web).
  const isDriver = !!(userData as any)?.driverId;
  const { isSignedIn } = useAuthGate();
  // Mode review Apple : masque les items liés au paiement / portefeuille.
  const { appleReviewMode } = useFastFoods();
  const { notifEnabled, handleNotifToggle } = useNotificationSwitch();
  const [darkMode, setDarkMode] = useState(false);
  // Sous-pages (modals / sheets) : deep-link, reset au tap onglet et au logout.
  const { visible, open, close } = useSettingsSubScreens(isSignedIn);
  const insets = useSafeAreaInsets();

  useSettingsTabBarStyle(visible.userBonus);

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

  return (
    <View style={styles.container}>
      {/* Flou Android (SDK 57), deux niveaux :
          - zone externe : les en-tetes des modales plein ecran (fond
            transparent) floutent TOUT l'ecran Settings ;
          - zone interne : la carte profil floute la liste qui defile dessous. */}
      <BlurScope>
      <BlurTarget style={styles.container}>
      <BlurScope>
      {/* Header Profil Fixe et Flouté */}
      <SettingsProfileCard
        onEditPress={() => handleComingSoon("Édition du profil")}
      />

      <BlurTarget style={styles.content}>
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
            onPress={() => open("userOrders")}
          />
          {!appleReviewMode && (
            <SettingGridItem
              icon="wallet-outline"
              title="Portefeuille"
              tone="accent"
              onPress={() => open("userWallet")}
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
          <SettingGridItem
            icon="gift-outline"
            title="Bonus"
            onPress={() => open("userBonus")}
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
                onPress={() => open("editBoutique")}
              />
              <SettingGridItem
                icon="restaurant-outline"
                title="Gestion menu"
                onPress={() => open("menuManage")}
              />
              <SettingGridItem
                icon="bicycle-outline"
                title="Livreurs"
                onPress={() => open("driverManage")}
              />
              <SettingGridItem
                icon="chatbubbles-outline"
                title="Messages"
                onPress={() => open("merchantSupport")}
              />
              {!appleReviewMode && (
                <SettingGridItem
                  icon="wallet-outline"
                  title="Portefeuille boutique"
                  onPress={() => open("walletManage")}
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
              onPress={() => open("driverOrders")}
            />
          )}
          <SettingGridItem
            icon="document-text-outline"
            title="Mes demandes"
            onPress={() => open("driverMyApps")}
          />
          <SettingGridItem
            icon="add-circle-outline"
            title={isDriver ? "Postuler à une boutique" : "Devenir livreur"}
            onPress={() => open("driverApply")}
          />
        </SettingGrid>

        {/* Préférences */}
        <SectionHeader title="Préférences" />
        {/* 1 colonne : une tuile par ligne, icone et libelle cote a cote. */}
        <SettingGrid columns={1}>
          <SettingGridSwitch
            icon="notifications-outline"
            title="Notifications"
            tone="accent"
            value={notifEnabled}
            onValueChange={handleNotifToggle}
          />
          <SettingGridSwitch
            icon="moon-outline"
            title="Mode sombre"
            tone="accent"
            value={darkMode}
            onValueChange={setDarkMode}
          />
          <SettingGridItem
            icon="language-outline"
            title="Langue"
            tone="accent"
            hint="Français"
            onPress={() => handleComingSoon("Langue")}
          />
        </SettingGrid>

        {/* Aide */}
        <SectionHeader title="Aide" />
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
            icon="call-outline"
            title="Contactez-nous"
            tone="accent"
            onPress={() => open("supportChat")}
          />
        </SettingGrid>

        {/* Legal */}
        <SectionHeader title="Légal" />
        <SettingGrid>
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
            onPress={() => open("logout")}
          />
        </SettingGrid>

        {/* Zone de danger */}
        <SectionHeader title="Zone de danger" />
        <SettingGrid>
          <SettingGridItem
            icon="trash-outline"
            title="Supprimer mon compte"
            tone="danger"
            onPress={() => open("deleteAccount")}
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
      </BlurTarget>
      </BlurScope>
      </BlurTarget>

      {/* Edit Boutique Modal */}
      <EditBoutiquePanel
        visible={visible.editBoutique}
        onClose={() => close("editBoutique")}
        onSuccess={() => {
          // Refresh if needed
        }}
      />

      {/* Gestion menu / Portefeuille (modals plein écran) */}
      <MenuManageModal
        visible={visible.menuManage}
        onClose={() => close("menuManage")}
      />
      <WalletManageModal
        visible={visible.walletManage}
        onClose={() => close("walletManage")}
      />

      {/* Mes activités : commandes + portefeuille user (plein écran) */}
      <UserOrdersModal
        visible={visible.userOrders}
        onClose={() => close("userOrders")}
      />
      <UserWalletModal
        visible={visible.userWallet}
        onClose={() => close("userWallet")}
      />

      {/* Boutique : discussions recues des clients */}
      <MerchantSupportModal
        visible={visible.merchantSupport}
        onClose={() => close("merchantSupport")}
      />

      {/* Contactez-nous : chat support */}
      <SupportChatSheet
        visible={visible.supportChat}
        onClose={() => close("supportChat")}
      />

      {/* Bonus et parrainage (bottom sheet) */}
      <UserBonusSheet
        visible={visible.userBonus}
        onClose={() => close("userBonus")}
      />

      {/* Livraison (user) : postuler / gérer ses livraisons */}
      <DriverApplyModal
        visible={visible.driverApply}
        onClose={() => close("driverApply")}
      />
      <DriverOrdersModal
        visible={visible.driverOrders}
        onClose={() => close("driverOrders")}
      />
      <DriverMyApplicationsModal
        visible={visible.driverMyApps}
        onClose={() => close("driverMyApps")}
      />

      {/* Boutique : gérer demandes + livreurs */}
      <DriverManageModal
        visible={visible.driverManage}
        onClose={() => close("driverManage")}
      />
      </BlurScope>

      {/* Modals de confirmation (hors BlurScope) : suppression, déconnexion */}
      <DeleteAccountModal
        visible={visible.deleteAccount}
        onClose={() => close("deleteAccount")}
      />
      <LogoutModal visible={visible.logout} onClose={() => close("logout")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
});
