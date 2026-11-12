"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { showToast } from "@/src/services/globalToast";
import { APP_VERSION } from "@/src/api/version";
import { currentOtaLabel } from "@/src/services/otaTelemetry";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { UserBonusSheet } from "@/src/features/bonus/components/UserBonusSheet";
import { DeleteAccountModal } from "@/src/features/profile/components/DeleteAccountModal";
import { LogoutModal } from "@/src/features/profile/components/LogoutModal";
import { LanguageSheet } from "@/src/features/profile/components/LanguageSheet";
import { SettingGrid } from "@/src/features/profile/components/SettingGrid";
import { SettingGridItem } from "@/src/features/profile/components/SettingGridItem";
import { ProfileListGroup, ProfileListRow } from "@/src/features/profile/components/ProfileListGroup";
import { SettingsHeaderProfile } from "@/src/features/profile/components/SettingsHeaderProfile";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { CreateShopBanner } from "@/src/features/profile/components/CreateShopBanner";
import { useNotificationSwitch } from "@/src/features/profile/hooks/useNotificationSwitch";
import { useSettingsSubScreens } from "@/src/features/profile/hooks/useSettingsSubScreens";
import { useSettingsTabBarStyle } from "@/src/features/profile/hooks/useSettingsTabBarStyle";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { Theme } from "@/src/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { LANGUAGES, getLanguage, t, useLanguage } from "@/src/i18n";

// Sections desactivees pour l'instant (repasser a true pour les reafficher).
// Une section dont aucun item n'est affiche est masquee avec son titre.
const SHOW_ACTIVITIES = false;
const SHOW_DELIVERY = true;

export default function SettingsScreen() {
  useLanguage();
  const { userData } = useAuth();
  // isDriver dérivé de driverId (pas de userData.isDriver qui peut être
  // incohérent selon le cache côté web).
  const isDriver = !!(userData as any)?.driverId;
  const { isSignedIn } = useAuthGate();
  // Mode review Apple : masque les items liés au paiement / portefeuille.
  const { appleReviewMode } = useFastFoods();
  const { notifEnabled, handleNotifToggle } = useNotificationSwitch();
  const [darkMode, setDarkMode] = useState(false);
  const [languageVisible, setLanguageVisible] = useState(false);
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

  // Deep-link « Mes demandes » (notif candidat) : page entière `app/account`.
  useEffect(() => {
    if (!visible.driverMyApps) return;
    router.push("/account/driver-applications");
    close("driverMyApps");
  }, [visible.driverMyApps, router, close]);

  useSettingsTabBarStyle(visible.userBonus);

  const handleComingSoon = (label: string) => {
    if (Platform.OS === "web") {
      window.alert(
        t("La section \"{{a}}\" sera disponible dans une prochaine version.", { a: t(label) }),
      );
    } else {
      showToast(t("La section \"{{a}}\" sera disponible dans une prochaine version.", { a: t(label) }), "info");
    }
  };

  // Invité : le profil est lié au compte → on demande la connexion.
  if (!isSignedIn) {
    return (
      <GuestGate
        icon="person-circle-outline"
        title={t("Votre profil")}
        subtitle={t("Connectez-vous pour gérer votre compte, vos commandes et vos paramètres.")}
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
          onAddAccount={() => handleComingSoon(t("Ajouter un compte"))}
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
        {/* Sans boutique : bandeau de creation en haut du profil. */}
        {!isMerchant && (
          <CreateShopBanner onPress={() => router.push("/shop/create")} />
        )}

        {/* Mes activités (user ET marchand : un marchand passe aussi des commandes) */}
        <SettingGrid title={t("Mes activités")}>
          {/* Les commandes du client sont l'onglet « Commandes » de la navbar :
              sans boutique, la tuile propose d'en créer une. */}
          {SHOW_ACTIVITIES && !isMerchant && (
            <SettingGridItem
              icon="storefront-outline"
              title={t("Créer ma boutique")}
              onPress={() => router.push("/(tabs)/boutique")}
            />
          )}
          {SHOW_ACTIVITIES && !appleReviewMode && (
            <SettingGridItem
              icon="wallet-outline"
              title={t("Portefeuille")}
              onPress={() => router.push("/account/wallet")}
            />
          )}
        </SettingGrid>

        {/* Compte, Préférences, Aide : listes groupees (maquette P1). */}
        <ProfileListGroup title={t("Compte")}>
          <ProfileListRow icon="person-outline" title={t("Mon profil")} onPress={() => handleComingSoon(t("Mon profil"))} />
          <ProfileListRow icon="key-outline" title={t("Sécurité")} onPress={() => handleComingSoon("Sécurité")} />
          <ProfileListRow icon="gift-outline" title={t("Bonus")} onPress={() => open("userBonus")} />
        </ProfileListGroup>

        {/* Livraison (tout user) : devenir livreur, ou gérer ses livraisons si déjà livreur */}
        {/* Masquee pour un marchand. */}
        {SHOW_DELIVERY && !isMerchant && (
        <SettingGrid title={t("Livraison")}>
          {/* Un livreur peut servir plusieurs boutiques → toujours pouvoir
              postuler ailleurs, même déjà livreur. */}
          {isDriver && (
            <SettingGridItem
              icon="bicycle-outline"
              title={t("Mes livraisons")}
              onPress={() => router.push("/account/driver-orders")}
            />
          )}
          <SettingGridItem
            icon="document-text-outline"
            title={t("Mes demandes")}
            onPress={() => router.push("/account/driver-applications")}
          />
          <SettingGridItem
            icon="add-circle-outline"
            title={isDriver ? t("Postuler à une boutique") : t("Devenir livreur")}
            onPress={() => router.push("/account/driver-apply")}
          />
        </SettingGrid>
        )}

        <ProfileListGroup title={t("Préférences")}>
          <ProfileListRow
            icon="notifications-outline"
            title="Notifications"
            hint={notifEnabled ? t("Activées") : t("Désactivées")}
            onPress={() => handleNotifToggle(!notifEnabled)}
          />
          <ProfileListRow
            icon="moon-outline"
            title={t("Mode sombre")}
            hint={darkMode ? t("Oui") : t("Non")}
            onPress={() => setDarkMode(!darkMode)}
          />
          <ProfileListRow
            icon="language-outline"
            title={t("Langue")}
            hint={LANGUAGES.find((l) => l.code === getLanguage())?.label}
            onPress={() => setLanguageVisible(true)}
          />
        </ProfileListGroup>

        <ProfileListGroup title={t("Aide")}>
          <ProfileListRow icon="help-circle-outline" title={t("Assistance")} onPress={() => handleComingSoon("Assistance")} />
          <ProfileListRow icon="chatbox-outline" title={t("Signaler un problème")} onPress={() => handleComingSoon(t("Signaler un problème"))} />
          <ProfileListRow icon="flag-outline" title={t("Faire une suggestion")} onPress={() => handleComingSoon(t("Faire une suggestion"))} />
          <ProfileListRow icon="call-outline" title={t("Contactez-nous")} onPress={() => router.push("/account/support")} />
        </ProfileListGroup>

        {/* Legal */}
        <SettingGrid title={t("Légal")}>
          <SettingGridItem
            icon="document-text-outline"
            title={t("Politique & Conditions")}
            onPress={() => handleComingSoon(t("Politique & Conditions"))}
          />
          <SettingGridItem
            icon="lock-closed-outline"
            title={t("Confidentialité")}
            onPress={() => handleComingSoon("Confidentialité")}
          />
        </SettingGrid>

        {/* Zone de danger */}
        <SettingGrid title={t("Zone de danger")}>
          <SettingGridItem
            icon="trash-outline"
            title={t("Supprimer mon compte")}
            tone="danger"
            onPress={() => open("deleteAccount")}
          />
        </SettingGrid>

        {/* App version — reflete TOUJOURS `app.json` (via `APP_VERSION`), jamais
            une valeur en dur a remettre a jour manuellement. Annee courante idem. */}
        <View style={styles.versionBlock}>
          <Text style={styles.versionText}>Yaammoo v{APP_VERSION}</Text>
          {/* Identifie l'OTA reçue : message de publication + date. */}
          <Text style={styles.versionSubtext}>{currentOtaLabel()}</Text>
          <Text style={styles.versionSubtext}>
            © {new Date().getFullYear()} {t("Yaammoo. Tous droits réservés.")}
          </Text>
        </View>
      </ScrollView>
      </BlurTarget>
      </BlurScope>
      </BlurTarget>

      {/* Boutique (`app/shop/*`) et compte (`app/account/*` : portefeuille,
          support, livraison) sont des routes entières, sans navbar. */}

      {/* Bonus et parrainage (bottom sheet) */}
      <UserBonusSheet
        visible={visible.userBonus}
        onClose={() => close("userBonus")}
      />

      </BlurScope>

      {/* Modals de confirmation (hors BlurScope) : suppression, déconnexion */}
      <DeleteAccountModal
        visible={visible.deleteAccount}
        onClose={() => close("deleteAccount")}
      />
      <LogoutModal visible={visible.logout} onClose={() => close("logout")} />
      <LanguageSheet visible={languageVisible} onClose={() => setLanguageVisible(false)} />
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
