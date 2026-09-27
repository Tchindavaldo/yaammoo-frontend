import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import {
  LocationSource,
  userLocationService,
} from "../services/userLocationService";
import {
  backgroundLocationSupported,
  startBackgroundLocation,
  stopBackgroundLocation,
} from "../tasks/backgroundLocationTask";
import { buildLocationPayload } from "../utils/buildLocationPayload";

/** Dernier envoi réussi (ms), partagé entre sessions. */
const LAST_SENT_KEY = "user_location_last_sent";
/** Écart minimal entre deux captures hors connexion (ouverture, premier plan). */
const MIN_INTERVAL_MS = 30 * 60 * 1000;
/** La permission « Toujours » n'est proposée qu'une fois, jamais redemandée. */
const BG_ASKED_KEY = "user_location_bg_asked";

/**
 * Suivi app fermée : permission « Toujours » demandée une seule fois (après
 * celle « Pendant l'utilisation »), puis tâche arrière-plan lancée. Relancée à
 * chaque connexion si déjà accordée (idempotent).
 */
const ensureBackgroundTracking = async () => {
  if (!backgroundLocationSupported) return;
  const current = await Location.getBackgroundPermissionsAsync();
  let status = current.status;
  if (
    status !== "granted" &&
    current.canAskAgain &&
    !(await AsyncStorage.getItem(BG_ASKED_KEY))
  ) {
    await AsyncStorage.setItem(BG_ASKED_KEY, "1");
    status = (await Location.requestBackgroundPermissionsAsync()).status;
  }
  if (status === "granted") await startBackgroundLocation();
};

/**
 * Position de l'utilisateur, envoyée au backend :
 * - à la connexion (`capture("login")`, appelée après la permission
 *   notifications) : la permission de localisation est demandée à ce moment,
 *   une seule fois — un refus n'est jamais redemandé. Puis la permission
 *   « Toujours » (suivi app fermée, voir `backgroundLocationTask`) ;
 * - au retour au premier plan, au plus toutes les 30 min.
 *
 * Silencieux : ni loader ni toast. Aucune fonction de l'app n'en dépend, un
 * échec (GPS lent, hors ligne, refus) n'a pas à interrompre l'utilisateur.
 */
export const useUserLocationSync = (isSignedIn: boolean) => {
  const running = useRef(false);

  const capture = useCallback(async (source: LocationSource) => {
    if (running.current || Platform.OS === "web") return;
    running.current = true;
    try {
      if (source !== "login") {
        const last = Number(await AsyncStorage.getItem(LAST_SENT_KEY));
        if (last && Date.now() - last < MIN_INTERVAL_MS) return;
      }

      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      // Demandée seulement à la connexion, et si l'OS le permet encore.
      if (status === "undetermined" && current.canAskAgain && source === "login") {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }
      if (status !== "granted") return;

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await userLocationService.send(
          await buildLocationPayload(position, source),
        );
        await AsyncStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      } finally {
        // Après la capture : la popup « Toujours » ne retarde pas l'envoi.
        if (source === "login") await ensureBackgroundTracking();
      }
    } catch (error) {
      console.warn("Capture de localisation impossible:", error);
    } finally {
      running.current = false;
    }
  }, []);

  // Retour au premier plan : nouvelle capture si la dernière a plus de 30 min.
  useEffect(() => {
    if (!isSignedIn) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void capture("foreground");
    });
    return () => sub.remove();
  }, [isSignedIn, capture]);

  // Déconnexion (connecté → non connecté) : fin du suivi app fermée. Pas au
  // démarrage, où `isSignedIn` vaut false le temps de charger la session.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (wasSignedIn.current && !isSignedIn) {
      stopBackgroundLocation().catch((error) =>
        console.warn("Arrêt du suivi de localisation impossible:", error),
      );
    }
    wasSignedIn.current = isSignedIn;
  }, [isSignedIn]);

  return { capture };
};
