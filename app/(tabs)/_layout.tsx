import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { ProfileNameSheet } from "@/src/features/profile/components/ProfileNameSheet";
import { ProfileNameProvider } from "@/src/features/profile/hooks/useProfileNameSheet";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import {
  AppBlurView as BlurView,
  isNativeBlurAvailable,
} from "@/src/components/AppBlurView";
import { StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Theme as Colors } from "@/src/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useBottomSafeArea } from "@/src/hooks/usePageBottomInset";
import {
  TAB_BAR_ITEM_HEIGHT,
  TAB_BAR_PADDING_TOP,
  useTabBarHeight,
} from "@/src/hooks/useTabBarHeight";
import { DS } from "@/src/theme/ds";
export default function TabLayout() {
  const colorScheme = useColorScheme();

  /**
   * Safe-area basse reservee sous la navbar : source unique (R19), la meme
   * que `useTabBarHeight`, les pages entieres et les sheets.
   */
  const bottomInset = useBottomSafeArea();
  // Base visible (marge haute + onglets, sans padding bas) + bande safe-area.
  const tabBarHeight = useTabBarHeight();

  return (
    <ProfileNameProvider>
      {/* Flou Android (SDK 57) : la tab bar floute l'ecran d'onglet ACTIF,
          chaque ecran etant enveloppe dans sa propre cible (`screenLayout`). */}
      <BlurScope>
      <View style={{ flex: 1 }}>
        <Tabs
          screenLayout={({ navigation, children }) => (
            <TabScreenBlurTarget navigation={navigation}>
              {children}
            </TabScreenBlurTarget>
          )}
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
            tabBarStyle: {
              height: tabBarHeight,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              backgroundColor: isNativeBlurAvailable
                ? "rgba(255, 255, 255, 0.7)"
                : "#ffffff",
              borderTopWidth: 0,
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: bottomInset,
              paddingTop: TAB_BAR_PADDING_TOP,
            },
            tabBarItemStyle: {
              height: TAB_BAR_ITEM_HEIGHT,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarLabel: "Accueil",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "grid" : "grid-outline"}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="cart"
            options={{
              tabBarLabel: "Panier",
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
              tabBarLabel: "Commandes",
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
              href: null,
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
              tabBarLabel: "Notifications",
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
              tabBarLabel: "Profil",
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
      </View>
      </BlurScope>
    </ProfileNameProvider>
  );
}

/**
 * Cible du flou de la tab bar pour UN ecran d'onglet. Les onglets restent
 * montes en arriere-plan : seule la cible de l'ecran focalise est active.
 */
function TabScreenBlurTarget({
  navigation,
  children,
}: {
  navigation: {
    isFocused: () => boolean;
    addListener: (event: "focus" | "blur", cb: () => void) => () => void;
  };
  children: React.ReactElement;
}) {
  const [focused, setFocused] = useState(() => navigation.isFocused());
  useEffect(() => {
    const offFocus = navigation.addListener("focus", () => setFocused(true));
    const offBlur = navigation.addListener("blur", () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return (
    <BlurTarget active={focused} style={{ flex: 1 }}>
      {children}
    </BlurTarget>
  );
}
