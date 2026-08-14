import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
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
  const TAB_BAR_BASE_HEIGHT = 58;
  /**
   * Part de la safe area basse REELLEMENT reservee — ratio partage avec
   * `useTabBarHeight`, dont dependent tous les ecrans (Android en prend plus,
   * ses touches de navigation etant plus hautes).
   */
  const bottomInset = insets.bottom * TAB_BAR_INSET_RATIO;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "rgba(236,73,19,1.00)",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: HapticTab,
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
  );
}
