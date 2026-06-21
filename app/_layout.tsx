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
import { WalletProvider } from "@/src/features/wallet/context/WalletContext";
import { MerchantWalletProvider } from "@/src/features/merchant/context/MerchantWalletContext";
import { FastFoodProvider } from "@/src/features/restaurants/context/FastFoodContext";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
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
  const { hasLoadedOnce: homeReady } = useFastFoods();
  const notifSetupDone = useRef(false);

  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  // Connecté = Firebase user présent ET profil chargé.
  const isSignedIn = !!user && !!userData;
  // L'auth est résolue quand Firebase a fini de répondre (loading false).
  const authResolved = !loading;

  // On n'entre dans la home que lorsque ses données ont fini de charger (1er
  // fetch terminé : données, vide ou erreur). Tant que ce n'est pas prêt, on
  // GARDE l'écran d'auth affiché (son loader tourne) → comme le splash attend
  // que la home soit prête avant de se cacher.
  const canEnterApp = authResolved && isSignedIn && homeReady;

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
      {/* animation "fade" : transition par fondu (comme le splash) entre (auth)
          et (tabs), au lieu du slide horizontal par défaut. */}
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        {/* Tant que l'auth n'est pas résolue, aucun groupe n'est monté : le splash
            natif couvre l'écran. On ne monte le bon groupe qu'une fois l'état connu. */}
        <Stack.Protected guard={canEnterApp}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        {/* (auth) reste monté tant que (tabs) n'est PAS prêt (canEnterApp false).
            On NE met PAS authResolved ici : sinon, pendant la re-vérification auth
            au login (loading=true → authResolved=false), les deux guards seraient
            faux en même temps → écran blanc. Au boot à froid, (auth) est monté mais
            le splash natif le couvre jusqu'à ce que la home (ou l'écran auth) appelle
            onLayoutRootView → pas de flash. */}
        <Stack.Protected guard={!canEnterApp}>
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
            <MerchantWalletProvider>
              <WalletProvider>
                <FastFoodProvider>
                  <AppContent />
                </FastFoodProvider>
              </WalletProvider>
            </MerchantWalletProvider>
          </MerchantProvider>
        </NotificationProvider>
      </OrderProvider>
    </AuthProvider>
  );
}
