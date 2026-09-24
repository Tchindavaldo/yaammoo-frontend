import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { ProfileNameSheet } from "@/src/features/profile/components/ProfileNameSheet";
import { ProfileNameProvider } from "@/src/features/profile/hooks/useProfileNameSheet";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppBlurView as BlurView,
  isNativeBlurAvailable,
} from "@/src/components/AppBlurView";
import { StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Theme as Colors } from "@/src/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { TAB_BAR_INSET_RATIO } from "@/src/hooks/useTabBarHeight";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // Hauteur de base de la navbar + safe area bottom
  const TAB_BAR_BASE_HEIGHT = 64;
  /**
   * Part de la safe area basse REELLEMENT reservee — ratio partage avec
   * `useTabBarHeight`, dont dependent tous les ecrans (Android en prend plus,
   * ses touches de navigation etant plus hautes).
   */
  const bottomInset = insets.bottom * TAB_BAR_INSET_RATIO;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;

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
            tabBarActiveTintColor: "rgba(236,73,19,1.00)",
            tabBarInactiveTintColor: "#000000",
            headerShown: false,
            tabBarShowLabel: true,
            tabBarButton: HapticTab,
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: "600",
              marginTop: 2,
            },
            tabBarBackground: () => (
              <BlurView
                tint="light"
                intensity={80}
                style={StyleSheet.absoluteFill}
              />
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
              paddingTop: 8,
            },
            tabBarItemStyle: {
              height: TAB_BAR_BASE_HEIGHT,
              justifyContent: "center",
              alignItems: "center",
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
          <Tabs.Screen
            name="boutique"
            options={{
              tabBarLabel: "Boutique",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  size={focused ? 22 : 20}
                  name={focused ? "storefront" : "storefront-outline"}
                  color={color}
                />
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
