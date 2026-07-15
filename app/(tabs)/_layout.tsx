import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { Theme as Colors } from "@/src/theme";
import { useColorScheme } from "@/src/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // Hauteur de base de la navbar + safe area bottom
  const TAB_BAR_BASE_HEIGHT = 58;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

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
          backgroundColor: "rgba(255, 255, 255, 0.7)",
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
          paddingBottom: insets.bottom,
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
