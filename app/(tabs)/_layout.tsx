import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Theme as Colors } from '@/src/theme';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'darkred',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarShowLabel: false, // In Ionic SCSS: ion-label { display: none }
        tabBarStyle: {
          height: 40, // Strict height from original SCSS line 3
          borderTopLeftRadius: 20, // Strict radius from original SCSS line 4
          borderTopRightRadius: 20,
          backgroundColor: 'white',
          borderTopWidth: 0,
          elevation: 5,
          position: 'absolute', // To allow the borderRadius effect over content
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <Ionicons size={14} name="grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarIcon: ({ color }) => <Ionicons size={14} name="cart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="boutique"
        options={{
          tabBarIcon: ({ color }) => <Ionicons size={14} name="storefront-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color }) => <Ionicons size={14} name="notifications-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <Ionicons size={14} name="cog-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
