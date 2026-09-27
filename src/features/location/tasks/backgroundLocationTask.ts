import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { AppState, Platform } from "react-native";
import { auth } from "@/src/services/firebase";
import { userLocationService } from "../services/userLocationService";
import { buildLocationPayload } from "../utils/buildLocationPayload";

/**
 * Localisation app fermée ou en arrière-plan (permission « Toujours »).
 *
 * Ce module est importé par le point d'entrée `index.js`, AVANT expo-router :
 * Android exécute la tâche sans monter l'interface, une définition placée dans
 * un écran ne serait jamais chargée et la tâche tournerait à vide.
 */
export const BACKGROUND_LOCATION_TASK = "yaammoo-background-location";

/** Écart minimal entre deux envois de la tâche. */
const MIN_INTERVAL_MS = 15 * 60 * 1000;
/** Déplacement minimal (m) avant une nouvelle position. */
const MIN_DISTANCE_M = 300;
/** Dernier envoi réussi de la tâche (ms). */
const LAST_SENT_KEY = "user_location_bg_last_sent";

/** Expo Go n'a pas la localisation arrière-plan ; le web non plus. */
export const backgroundLocationSupported =
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type LocationTaskData = { locations?: Location.LocationObject[] };

if (Platform.OS !== "web") {
  TaskManager.defineTask<LocationTaskData>(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }) => {
      const locations = data?.locations ?? [];
      const position = locations[locations.length - 1];
      if (error || !position) return;
      try {
        const last = Number(await AsyncStorage.getItem(LAST_SENT_KEY));
        if (last && Date.now() - last < MIN_INTERVAL_MS) return;

        // Lancement à froid : la session Firebase est restaurée depuis
        // AsyncStorage avant de lire l'utilisateur.
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
          // Déconnecté : plus personne à suivre.
          await stopBackgroundLocation();
          return;
        }
        const token = await user.getIdToken();
        const source =
          AppState.currentState === "active" ? "foreground" : "background";
        const payload = await buildLocationPayload(position, source);
        await userLocationService.send(payload, token);
        await AsyncStorage.setItem(LAST_SENT_KEY, String(Date.now()));
      } catch (e) {
        console.warn("Localisation arrière-plan impossible:", e);
      }
    },
  );
}

/** Lance le suivi (idempotent). Exige la permission « Toujours ». */
export const startBackgroundLocation = async () => {
  if (!backgroundLocationSupported) return;
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    return;
  }
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    // Android : fréquence visée (l'OS la bride app fermée, sans service
    // de premier plan ni notification permanente).
    timeInterval: MIN_INTERVAL_MS,
    distanceInterval: MIN_DISTANCE_M,
    // iOS : une pause automatique ne reprend qu'au retour de l'app au
    // premier plan, le suivi s'arrêterait au premier arrêt.
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    showsBackgroundLocationIndicator: false,
  });
};

/** Arrête le suivi (déconnexion). */
export const stopBackgroundLocation = async () => {
  if (!backgroundLocationSupported) return;
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};
