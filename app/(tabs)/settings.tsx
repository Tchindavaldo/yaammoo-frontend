import { APP_VERSION } from "@/src/api/version";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { UserBonusSheet } from "@/src/features/bonus/components/UserBonusSheet";
import { DriverApplyModal } from "@/src/features/driver/components/DriverApplyModal";
import { DriverMyApplicationsModal } from "@/src/features/driver/components/DriverMyApplicationsModal";
import { DriverOrdersModal } from "@/src/features/driver/components/DriverOrdersModal";
import { DeleteAccountModal } from "@/src/features/profile/components/DeleteAccountModal";
import { LogoutModal } from "@/src/features/profile/components/LogoutModal";
import { SettingGrid } from "@/src/features/profile/components/SettingGrid";
import { SettingGridItem } from "@/src/features/profile/components/SettingGridItem";
import { SettingGridSwitch } from "@/src/features/profile/components/SettingGridSwitch";
import { SettingsHeaderProfile } from "@/src/features/profile/components/SettingsHeaderProfile";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { useNotificationSwitch } from "@/src/features/profile/hooks/useNotificationSwitch";
import { useSettingsSubScreens } from "@/src/features/profile/hooks/useSettingsSubScreens";
import { useSettingsTabBarStyle } from "@/src/features/profile/hooks/useSettingsTabBarStyle";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { SupportChatSheet } from "@/src/features/support/components/SupportChatSheet";
import { UserWalletModal } from "@/src/features/wallet/components/UserWalletModal";
import { Theme } from "@/src/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";

// Sections desactivees pour l'instant (repasser a true pour les reafficher).
// Une section dont aucun item n'est affiche est masquee avec son titre.
const SHOW_ACTIVITIES = false;
const SHOW_DELIVERY = true;

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
  const { visible, open, close, staffTab } = useSettingsSubScreens(isSignedIn);
  const insets = useSafeAreaInsets();
  // Hauteur reelle du TabHeader (mesuree) : decale le contenu en dessous.
  const [headerHeight, setHeaderHeight] = useState(insets.top + 150);
  const tabBarHeight = useTabBarHeight();
  const router = useRouter();
  const isMerchant = !!(userData?.isMarchand && userData?.fastFoodId);

  // Personnel = page entière `app/shop/staff` (tuile ou deep-link) : on y
  // redirige puis on referme le drapeau local.
  useEffect(() => {
    if (!visible.staffManage) return;
    router.push({ pathname: "/shop/staff", params: { section: staffTab } });
    close("staffManage");
  }, [visible.staffManage, staffTab, router, close]);

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
      <TabHeader onHeightChange={setHeaderHeight}>
        <SettingsHeaderProfile
          onAddAccount={() => handleComingSoon("Ajouter un compte")}
        />
      </TabHeader>

      <BlurTarget style={styles.content}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          // 8 + marginTop 8 du titre de section = 16 sous le header, comme
          // l'en-tete de jour de Notifications.
          paddingTop: headerHeight + 8,
          // La navbar flotte sur le bas : la fin de page s'arrete juste
          // au-dessus d'elle, sans marge en plus (R19).
          paddingBottom: tabBarHeight + 8,
          paddingHorizontal: 16,
        }}
      >
        {/* Mes activités (user ET marchand : un marchand passe aussi des commandes) */}
        <SettingGrid title="Mes activités">
          {/* Les commandes du client sont l'onglet « Commandes » de la navbar :
              sans boutique, la tuile propose d'en créer une. */}
          {SHOW_ACTIVITIES && !isMerchant && (
            <SettingGridItem
              icon="storefront-outline"
              title="Créer ma boutique"
              onPress={() => router.push("/(tabs)/boutique")}
            />
          )}
          {SHOW_ACTIVITIES && !appleReviewMode && (
            <SettingGridItem
              icon="wallet-outline"
              title="Portefeuille"
              onPress={() => open("userWallet")}
            />
          )}
        </SettingGrid>

        {/* Compte */}
        <SettingGrid title="Compte">
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
        {isMerchant && (
          <>
            <SettingGrid title="Boutique">
              {/* Commandes reçues par la boutique (page marchand). */}
              <SettingGridItem
                icon="receipt-outline"
                title="Commandes"
                onPress={() => router.push("/shop/orders")}
              />
              <SettingGridItem
                icon="storefront-outline"
                title="Information"
                onPress={() => router.push("/shop/edit")}
              />
              <SettingGridItem
                icon="restaurant-outline"
                title="Gestion menu"
                onPress={() => router.push("/shop/menu")}
              />
              <SettingGridItem
                icon="people-outline"
                title="Personnel"
                onPress={() => open("staffManage")}
              />
              <SettingGridItem
                icon="chatbubbles-outline"
                title="Messages"
                onPress={() => router.push("/shop/messages")}
              />
              <SettingGridItem
                icon="megaphone-outline"
                title="Notifications"
                onPress={() => router.push("/shop/notifications")}
              />
              {!appleReviewMode && (
                <SettingGridItem
                  icon="wallet-outline"
                  title="Portefeuille boutique"
                  onPress={() => router.push("/shop/wallet")}
                />
              )}
            </SettingGrid>
          </>
        )}

        {/* Livraison (tout user) : devenir livreur, ou gérer ses livraisons si déjà livreur */}
        {/* Masquee pour un marchand. */}
        {SHOW_DELIVERY && !isMerchant && (
        <SettingGrid title="Livraison">
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
        )}

        {/* Préférences */}
        {/* 1 colonne : une tuile par ligne, icone et libelle cote a cote. */}
        <SettingGrid title="Préférences" columns={1}>
          <SettingGridSwitch
            icon="notifications-outline"
            title="Notifications"
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

        {/* Aide */}
        <SettingGrid title="Aide">
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
            onPress={() => open("supportChat")}
          />
        </SettingGrid>

        {/* Legal */}
        <SettingGrid title="Légal">
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

        {/* Zone de danger */}
        <SettingGrid title="Zone de danger">
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

      {/* Boutique : gérer, menu, messages, notifications, portefeuille sont des
          routes entières `app/shop/*` (hors (tabs), sans navbar). */}

      {/* Mes activités : commandes + portefeuille user (plein écran) */}
      <UserWalletModal
        visible={visible.userWallet}
        onClose={() => close("userWallet")}
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
  versionBlock: {
    alignItems: "center",
    padding: Theme.spacing.xl,
    paddingBottom: 0,
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
