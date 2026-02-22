import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/features/auth/context/AuthContext';
import { useSocketEvents } from '@/src/services/useSocketEvents';
import { useNotificationSetup } from '@/src/features/notifications/hooks/useNotificationSetup';
import { useEffect } from 'react';
import { AppLoader } from '@/src/components/AppLoader';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppInitializer() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Rediriger vers login si non connecté et pas déjà dans auth
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      // Rediriger vers l'app si connecté et dans auth
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  useEffect(() => {
    if (user) {
      setupNotifications();
    }
  }, [user]);

  if (loading) {
    return <AppLoader visible={true} message="Initialisation..." />;
  }

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
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

