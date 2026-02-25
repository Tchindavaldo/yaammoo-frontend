import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/src/features/auth/context/AuthContext";
import { useSocketEvents } from "@/src/services/useSocketEvents";
import { useNotificationSetup } from "@/src/features/notifications/hooks/useNotificationSetup";
import { useState, useEffect } from "react";
import { AppLoader } from "@/src/components/AppLoader";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppInitializer({ layoutMounted }: { layoutMounted: boolean }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [appReady, setAppReady] = useState(false);

  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  useEffect(() => {
    if (!layoutMounted) return;
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Rediriger vers login si non connecté et pas déjà dans auth
      setAppReady(false);
      router.replace("/(auth)");
    } else if (user && inAuthGroup && userData) {
      // Attendre que tout soit prêt avant de rediriger
      setAppReady(false);
    } else if (user && !inAuthGroup && userData && appReady) {
      // Tout est prêt, rester sur tabs
    }
  }, [user, userData, loading, segments, appReady, layoutMounted]);

  useEffect(() => {
    if (!layoutMounted) return;
    if (user && userData && !appReady) {
      setAppReady(true);
      if (segments[0] === "(auth)") {
        router.replace("/(tabs)");
      }
      // Setup notifications in background after navigation
      setupNotifications().catch((error) => {
        console.error("Erreur lors de l'initialisation des notifications:", error);
      });
    }
  }, [user, userData, setupNotifications, segments, appReady, layoutMounted]);

  if (loading || (user && !userData)) {
    return (
      <AppLoader visible={true} message="Initialisation de l'application..." />
    );
  }

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [layoutMounted, setLayoutMounted] = useState(false);

  useEffect(() => {
    setLayoutMounted(true);
  }, []);

  return (
    <AuthProvider>
      <AppInitializer layoutMounted={layoutMounted} />
      <ThemeProvider value={DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
