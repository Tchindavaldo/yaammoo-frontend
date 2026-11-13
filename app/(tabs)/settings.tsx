"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { showToast } from "@/src/services/globalToast";
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
import { MerchantSwitchStrip } from "@/src/features/profile/components/MerchantSwitchStrip";
import { CreateShopStrip } from "@/src/features/profile/components/CreateShopStrip";
import { useNotificationSwitch } from "@/src/features/profile/hooks/useNotificationSwitch";
import { useSettingsSubScreens } from "@/src/features/profile/hooks/useSettingsSubScreens";
import { useSettingsTabBarStyle } from "@/src/features/profile/hooks/useSettingsTabBarStyle";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { LANGUAGES, getLanguage, t, useLanguage } from "@/src/i18n";

// Sections desactivees pour l'instant (repasser a true pour les reafficher).
// Une section dont aucun item n'est affiche est masquee avec son titre.
const SHOW_ACTIVITIES = false;
const SHOW_DELIVERY = false; // Livraison masquee pour l'instant

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
  const { isMerchantMode, setMerchantMode } = useMerchantMode();
  // Deux designs : « Signaler un problème » = bascule de mode seule dans sa
  // section apres Aide (par defaut) ; « Mon profil » = carte compacte.
  const [layout, setLayout] = useState<"section" | "strip">("section");
  const switchMode = () => {
    setMerchantMode(!isMerchantMode);
    router.navigate("/(tabs)");
  };

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
          onDeleteAccount={() => open("deleteAccount")}
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

        {/* Compte, Préférences, Aide : listes separees par un trait (variantes
            d'apercu, cf. `layout`). */}
        <ProfileListGroup>
          <ProfileListRow icon="person-outline" title={t("Mon profil")} onPress={() => setLayout("strip")} />
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

        <View style={styles.sectionLine} />
        <ProfileListGroup>
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

        <View style={styles.sectionLine} />
        <ProfileListGroup>
          <ProfileListRow icon="help-circle-outline" title={t("Assistance")} onPress={() => handleComingSoon("Assistance")} />
          <ProfileListRow icon="chatbox-outline" title={t("Signaler un problème")} onPress={() => setLayout("section")} />
          <ProfileListRow icon="flag-outline" title={t("Faire une suggestion")} onPress={() => handleComingSoon(t("Faire une suggestion"))} />
          <ProfileListRow icon="call-outline" title={t("Contactez-nous")} onPress={() => router.push("/account/support")} />
        </ProfileListGroup>

        {/* Bas de page : creer sa boutique (sans boutique), ou bascule de mode
            en carte (variante « card »). */}
        {!isMerchant && layout === "section" && (
          <>
            <View style={styles.sectionLine} />
            <ProfileListGroup>
              <ProfileListRow icon="storefront-outline" title={t("Créer ma boutique")} onPress={() => router.push("/shop/create")} />
            </ProfileListGroup>
          </>
        )}
        {!isMerchant && layout === "strip" && (
          <CreateShopStrip onPress={() => router.push("/shop/create")} />
        )}
        {isMerchant && layout === "section" && (
          <>
            <View style={styles.sectionLine} />
            <ProfileListGroup>
              <ProfileListRow
                icon="swap-horizontal"
                title={isMerchantMode ? t("Passer en mode client") : t("Passer en mode marchand")}
                onPress={switchMode}
              />
            </ProfileListGroup>
          </>
        )}
        {isMerchant && layout === "strip" && (
          <MerchantSwitchStrip isMerchantMode={isMerchantMode} onPress={switchMode} />
        )}

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
  // Un trait entre les sections.
  sectionLine: { height: 1, backgroundColor: DS.line, marginTop: 16 },
});
