import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/src/features/auth/context/AuthContext";
import { OrderProvider } from "@/src/features/orders/context/OrderContext";
import { MerchantProvider } from "@/src/features/merchant/context/MerchantContext";
import { FastFoodProvider } from "@/src/features/restaurants/context/FastFoodContext";
import { NotificationProvider } from "@/src/features/notifications/context/NotificationContext";
import { useSocketEvents } from "@/src/services/useSocketEvents";
import { useNotificationSetup } from "@/src/features/notifications/hooks/useNotificationSetup";
import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";

// Le splash natif reste affiché tant qu'on ne l'a pas explicitement caché.
SplashScreen.preventAutoHideAsync();

// Masque les notifications LogBox (toast d'erreur en bas) en dev.
LogBox.ignoreAllLogs();

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { user, userData, loading } = useAuth();
  const notifSetupDone = useRef(false);

  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  // Connecté = Firebase user présent ET profil chargé.
  const isSignedIn = !!user && !!userData;
  // L'auth est résolue quand Firebase a fini de répondre (loading false).
  const authResolved = !loading;

  // Setup notifications une seule fois, en arrière-plan, après connexion.
  useEffect(() => {
    if (isSignedIn && !notifSetupDone.current) {
      notifSetupDone.current = true;
      setupNotifications().catch((error) => {
        console.error("Erreur lors de l'initialisation des notifications:", error);
      });
    }
  }, [isSignedIn, setupNotifications]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Tant que l'auth n'est pas résolue, aucun groupe n'est monté : le splash
            natif couvre l'écran. On ne monte le bon groupe qu'une fois l'état connu. */}
        <Stack.Protected guard={authResolved && isSignedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={authResolved && !isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <MerchantProvider>
            <FastFoodProvider>
              <AppContent />
            </FastFoodProvider>
          </MerchantProvider>
        </NotificationProvider>
      </OrderProvider>
    </AuthProvider>
  );
}
