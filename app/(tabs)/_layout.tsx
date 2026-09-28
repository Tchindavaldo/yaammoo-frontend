import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { ProfileNameSheet } from "@/src/features/profile/components/ProfileNameSheet";
import { ProfileNameProvider } from "@/src/features/profile/hooks/useProfileNameSheet";
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
export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Style unique de la navbar, partage avec les ecrans qui l'ajustent.
  const tabBarStyle = useTabBarStyle();

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
            tabBarStyle,
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
