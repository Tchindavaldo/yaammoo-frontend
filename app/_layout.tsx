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
import { DriverProvider } from "@/src/features/driver/context/DriverContext";
import { WalletProvider } from "@/src/features/wallet/context/WalletContext";
import { MerchantWalletProvider } from "@/src/features/merchant/context/MerchantWalletContext";
import { FastFoodProvider } from "@/src/features/restaurants/context/FastFoodContext";
import { BonusProvider } from "@/src/features/bonus/context/BonusContext";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { NotificationProvider } from "@/src/features/notifications/context/NotificationContext";
import { AuthGateProvider } from "@/src/features/auth/context/AuthGateContext";
import { useSocketEvents } from "@/src/services/useSocketEvents";
import { useNotificationSetup } from "@/src/features/notifications/hooks/useNotificationSetup";
import { useEffect, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { isSplashHidden, onSplashHidden } from "@/src/hooks/useHideSplash";
import { initSentry, wrapWithSentry } from "@/src/services/sentry";
import { setupHttp } from "@/src/api/setupHttp";
import { prefetchBonusBackground } from "@/src/features/bonus/components/BonusPageBackground";

// Initialise le crash reporting le plus tôt possible (avant tout rendu),
// pour capturer aussi les crashs au démarrage. No-op tant que le DSN est vide.
initSentry();

// Configure les headers HTTP globaux (x-app-version, etc.) AVANT toute requête.
setupHttp();

// Le splash natif reste affiché tant qu'on ne l'a pas explicitement caché.
SplashScreen.preventAutoHideAsync();

// Décode le fond de la page Bonus pendant le splash : sans ça, sa première
// ouverture peint une frame vide le temps que le bitmap soit prêt.
prefetchBonusBackground();

// Masque les notifications LogBox (toast d'erreur en bas) en dev.
LogBox.ignoreAllLogs();

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { user, userData, loading } = useAuth();
  const { hasLoadedOnce: homeReady } = useFastFoods();
  // uid pour lequel le setup notif a déjà été fait (null = aucun). On mémorise
  // l'uid (et pas juste un booléen) pour re-déclencher le setup à CHAQUE nouvelle
  // connexion : reconnexion du même user OU changement de compte, sans fermer
  // l'app. Un simple ref booléen restait true après logout → le 2e login ne
  // relançait jamais le get token push / la synchro des états.
  const notifSetupUid = useRef<string | null>(null);

  useSocketEvents();
  const { setup: setupNotifications } = useNotificationSetup();

  // Connecté = Firebase user présent ET profil chargé.
  const isSignedIn = !!user && !!userData;
  // L'auth est résolue quand Firebase a fini de répondre (loading false).
  const authResolved = !loading;

  // Accès invité (Apple 5.1.1(v)) : on entre dans la home dès que l'auth est
  // résolue ET que les données ont fini de charger — CONNECTÉ OU NON. Les
  // invités parcourent home/boutique librement ; les actions liées à un compte
  // ouvrent la sheet d'auth via AuthGate. isSignedIn n'est PLUS une condition
  // d'entrée (sinon un invité reste bloqué sur le login).
  //
  // ⚠️ Anti-flash de l'écran Welcome au login (invité → connecté) : quand le
  // user se connecte via la sheet overlay, AuthContext repasse loading=true le
  // temps de re-vérifier le profil → authResolved=false → on quitterait (tabs)
  // pour (auth) puis on y reviendrait = flash. On garde donc les tabs montées
  // tant qu'un user Firebase est présent (login en cours), même si loading=true.
  // Au vrai logout, `user` devient null → on sort proprement vers (auth).
  const canEnterApp = homeReady && (authResolved || !!user);

  // Animation de bascule de groupe (auth ↔ tabs) :
  // - Au BOOT, on est monté directement dans le groupe cible pendant que le
  //   splash natif couvre l'écran. Aucune transition visible n'est souhaitée :
  //   un fondu ferait apparaître la cible par-dessus l'écran masqué → flash.
  // - APRÈS le boot (le splash s'est caché une fois), tout changement de groupe
  //   est une vraie transition utilisateur (login → home, logout → auth) : fade.
  // On suit le groupe affiché ; le fade ne s'active QUE pour un changement de
  // groupe survenant après que le splash a disparu.
  const [splashGone, setSplashGone] = useState(isSplashHidden);
  useEffect(() => onSplashHidden(() => setSplashGone(true)), []);
  const prevGroupRef = useRef<"tabs" | "auth" | null>(null);
  const currentGroup = canEnterApp ? "tabs" : "auth";
  const groupChanged =
    prevGroupRef.current !== null && prevGroupRef.current !== currentGroup;
  prevGroupRef.current = currentGroup;
  const screenAnimation = splashGone && groupChanged ? "fade" : "none";

  // Setup notifications (get token push + synchro états) après connexion.
  // Se rejoue à chaque nouvelle connexion : on compare l'uid connecté au dernier
  // uid pour lequel le setup a tourné. Au logout, isSignedIn repasse false → on
  // remet notifSetupUid à null pour que le prochain login le relance.
  useEffect(() => {
    if (isSignedIn && user && notifSetupUid.current !== user.uid) {
      notifSetupUid.current = user.uid;
      setupNotifications().catch((error) => {
        console.error("Erreur lors de l'initialisation des notifications:", error);
      });
    } else if (!isSignedIn) {
      notifSetupUid.current = null;
    }
  }, [isSignedIn, user, setupNotifications]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Tant que l'auth n'est pas résolue, aucun groupe n'est monté : le splash
            natif couvre l'écran. On ne monte le bon groupe qu'une fois l'état connu.
            screenAnimation = "none" sous le splash (boot), "fade" ensuite. */}
        <Stack.Protected guard={canEnterApp}>
          <Stack.Screen name="(tabs)" options={{ animation: screenAnimation }} />
        </Stack.Protected>
        {/* (auth) reste monté tant que (tabs) n'est PAS prêt (canEnterApp false).
            On NE met PAS authResolved ici : sinon, pendant la re-vérification auth
            au login (loading=true → authResolved=false), les deux guards seraient
            faux en même temps → écran blanc. Au boot à froid, (auth) est monté mais
            le splash natif le couvre jusqu'à ce que la home (ou l'écran auth) appelle
            onLayoutRootView → pas de flash. */}
        <Stack.Protected guard={!canEnterApp}>
          {/* Vers (auth) : "none" au boot (sous splash), "fade" sur déconnexion
              (transition douce vers le login). */}
          <Stack.Screen name="(auth)" options={{ animation: screenAnimation }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

function RootLayout() {
  return (
    <AuthProvider>
      <OrderProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <MerchantProvider>
            <DriverProvider>
              <MerchantWalletProvider>
                <WalletProvider>
                  <FastFoodProvider>
                    <BonusProvider>
                      <AuthGateProvider>
                        <AppContent />
                      </AuthGateProvider>
                    </BonusProvider>
                  </FastFoodProvider>
                </WalletProvider>
              </MerchantWalletProvider>
            </DriverProvider>
          </MerchantProvider>
        </NotificationProvider>
      </OrderProvider>
    </AuthProvider>
  );
}

// wrapWithSentry active la capture native + le suivi des touches avant le crash.
export default wrapWithSentry(RootLayout);
