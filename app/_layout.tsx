import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider } from '@/src/features/auth/context/AuthContext';
import { useSocketEvents } from '@/src/services/useSocketEvents';
import { useNotificationSetup } from '@/src/features/notifications/hooks/useNotificationSetup';
import { useEffect } from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppInitializer() {
  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  useEffect(() => {
    setupNotifications();
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <AppInitializer />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
