"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Tabs, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { claimPendingShopLinkForOpen } from "@/src/features/search/utils/pendingShopLink";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { ProfileNameSheet } from "@/src/features/profile/components/ProfileNameSheet";
import { ProfileNameProvider } from "@/src/features/profile/hooks/useProfileNameSheet";
import { LegalProvider } from "@/src/features/legal/context/LegalContext";
import { LegalAcceptanceModal } from "@/src/features/legal/components/LegalAcceptanceModal";
import { MerchantAdhesionSheet } from "@/src/features/legal/components/MerchantAdhesionSheet";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Theme as Colors } from "@/src/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { TAB_BAR_ITEM_HEIGHT } from "@/src/hooks/useTabBarHeight";
import { useTabBarStyle } from "@/src/hooks/useTabBarStyle";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { useActivateFastFoods } from "@/src/features/restaurants/context/FastFoodContext";
import { canSeeOrders } from "@/src/features/staff/components/WorkOrdersScreen";
import { showToast } from "@/src/services/globalToast";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";

export default function TabLayout() {
  return <TabLayoutInner />;
}

function TabLayoutInner() {
  // Mode marchand : Panier et Commandes client masques ; Commandes = boutique,
  // Portefeuille = onglet. Mode client : navbar habituelle.
  // Mode travail (personnel / livreur) : Attente / En cours / Termine /
  // Notifications / Profil. Onglet hors permissions du role : toast, pas d'ouverture.
  const { isMerchantMode, isWorkMode: w, isDriverMode, can } = useMerchantMode();
  const m = isMerchantMode && !w;
  const guard = () => ({
    tabPress: (e: { preventDefault: () => void }) => {
      if (!w || isDriverMode || canSeeOrders(can)) return;
      e.preventDefault();
      showToast(t("Accès non permis : vous n'avez pas les droits d'accès à cette page"), "error");
    },
  });
  useLanguage();
  const colorScheme = useColorScheme();

  // Style unique de la navbar, partage avec les ecrans qui l'ajustent.
  const tabBarStyle = useTabBarStyle();

  // Arrivee dans le home : c'est ICI, et seulement ici, que part le premier
  // `GET /fastFood/all` (plus sous le splash ni sur l'ecran d'accueil). Pose
  // au niveau des onglets, pas du seul ecran home : un lancement ouvert sur un
  // autre onglet (notification) a aussi besoin du catalogue.
  const activateHome = useActivateFastFoods();
  useEffect(() => {
    activateHome();
  }, [activateHome]);

  // Lien QR boutique recu au demarrage a froid : ouvre la recherche des la home.
  const router = useRouter();
  useEffect(() => {
    // Le home ne leve pas le splash tant qu'un lien est en attente : la recherche
    // s'ouvre dessous et le leve. Repli : leve le splash si elle ne vient pas.
    const id = claimPendingShopLinkForOpen();
    if (!id) return;
    router.push({ pathname: "/search", params: { shopId: id } });
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <LegalProvider>
    <ProfileNameProvider>
      {/* Plus de cible de flou par ecran (`screenLayout`) : Android ne floute
          plus rien, la tab bar y est opaque (`useTabBarStyle`). */}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: DS.accent,
            tabBarInactiveTintColor: "#000000",
            headerShown: false,
            tabBarShowLabel: true,
            tabBarButton: HapticTab,
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "600",
              lineHeight: 13,
              marginTop: 2,
            },
            tabBarBackground: () => (
              <>
                <BlurView
                  tint="light"
                  intensity={80}
                  style={StyleSheet.absoluteFill}
                />
                <SafeAreaDebugBand />
              </>
            ),
            tabBarStyle,
            tabBarItemStyle: {
              height: TAB_BAR_ITEM_HEIGHT,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            listeners={guard()}
            options={{
              tabBarLabel: w ? t("Attente") : t("Accueil"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={w ? (focused ? "time" : "time-outline") : focused ? "grid" : "grid-outline"}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="cart"
            options={{
              href: m || w ? null : undefined,
              tabBarLabel: t("Panier"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "cart" : "cart-outline"}
                  color={color}
                />
              ),
            }}
          />
          {/* Onglet Commandes (commandes du client) pour tout le monde. La
              page Boutique (marchand) reste une route sans onglet (href null),
              ouverte depuis Profil → Boutique → « Commandes » ou « Créer ma
              boutique ». */}
          <Tabs.Screen
            name="orders"
            options={{
              href: m || w ? null : undefined,
              tabBarLabel: t("Commandes"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "receipt" : "receipt-outline"}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="boutique"
            options={{
              href: m ? undefined : null,
              tabBarLabel: t("Commandes"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons size={focused ? 22 : 20} name={focused ? "receipt" : "receipt-outline"} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="wallet"
            options={{
              href: m ? undefined : null,
              tabBarLabel: t("Portefeuille"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons size={focused ? 22 : 20} name={focused ? "wallet" : "wallet-outline"} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="work-progress"
            listeners={guard()}
            options={{
              href: w ? undefined : null,
              tabBarLabel: t("En cours"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons size={focused ? 22 : 20} name={focused ? "flame" : "flame-outline"} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="work-done"
            listeners={guard()}
            options={{
              href: w ? undefined : null,
              tabBarLabel: t("Terminé"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons size={focused ? 22 : 20} name={focused ? "checkmark-done-circle" : "checkmark-done-circle-outline"} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="driver"
            options={{
              // Retiré de la navbar (celle-ci était trop chargée). Le livreur accède
              // à ses livraisons via Settings → « Mes livraisons ». href null =
              // route conservée mais aucun onglet affiché.
              href: null,
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              tabBarLabel: t("Notifications"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "notifications" : "notifications-outline"}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              tabBarLabel: t("Profil"),
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "cog" : "cog-outline"}
                  color={color}
                />
              ),
            }}
          />
        </Tabs>
        {/* Au-dessus des onglets (tab bar comprise) : le flou couvre tout l'ecran. */}
        <ProfileNameSheet />
        {/* Conditions d'utilisation : bloquant tant que non acceptées. */}
        <LegalAcceptanceModal />
        {/* Annexe 3 : apres la creation de la boutique, obligatoire. */}
        <MerchantAdhesionSheet />
      </View>
    </ProfileNameProvider>
    </LegalProvider>
  );
}
