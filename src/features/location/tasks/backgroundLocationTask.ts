import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { User } from "firebase/auth";
import { AppState, Platform } from "react-native";
import { auth } from "@/src/services/firebase";
import { driverLocationService } from "../services/driverLocationService";
import { requestForegroundLocation } from "../services/locationPermission";
import { userLocationService } from "../services/userLocationService";
import {
  buildDriverPositionPayload,
  buildLocationPayload,
} from "../utils/buildLocationPayload";
import {
  DELIVERY_MIN_SEND_MS,
  getTrackingMode,
  setTrackingMode,
  TrackingMode,
  trackingOptions,
  USER_MIN_INTERVAL_MS,
} from "./trackingModes";

/**
 * Localisation app fermée ou en arrière-plan : position de l'utilisateur
 * (mode `normal`, permission « Toujours », iOS seulement) et, pour un livreur
 * en course, position du livreur (mode `delivery`, iOS et Android). Voir
 * `trackingModes.ts`.
 *
 * Ce module est importé par le point d'entrée `index.js`, AVANT expo-router :
 * Android exécute la tâche sans monter l'interface, une définition placée dans
 * un écran ne serait jamais chargée et la tâche tournerait à vide.
 */
export const BACKGROUND_LOCATION_TASK = "yaammoo-background-location";

/** Dernier envoi réussi de la position utilisateur par la tâche (ms). */
const LAST_SENT_KEY = "user_location_bg_last_sent";
/** Dernier envoi réussi de la position livreur (ms). */
const DRIVER_LAST_SENT_KEY = "driver_location_last_sent";

/** Expo Go n'a pas la localisation arrière-plan ; le web non plus. */
export const backgroundLocationSupported =
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * Suivi utilisateur app fermée (mode `normal`, permission « Toujours ») : iOS
 * seulement. Android n'a plus `ACCESS_BACKGROUND_LOCATION` (refusée par Google
 * Play) ; seul le mode livraison y tourne, en service de premier plan.
 * ⚠️ Sur Android, `getBackgroundPermissionsAsync` lève une exception sans
 * cette permission au manifeste : ne l'appeler que si ce flag est vrai.
 */
export const userBackgroundSupported =
  backgroundLocationSupported && Platform.OS === "ios";

type LocationTaskData = { locations?: Location.LocationObject[] };

const elapsedSince = async (key: string) =>
  Date.now() - (Number(await AsyncStorage.getItem(key)) || 0);

/** Livreur en course : position poussée aux clients, au plus toutes les 8 s. */
const sendDriverPosition = async (
  position: Location.LocationObject,
  user: User,
) => {
  if ((await elapsedSince(DRIVER_LAST_SENT_KEY)) < DELIVERY_MIN_SEND_MS) return;
  const { activeDeliveries } = await driverLocationService.send(
    buildDriverPositionPayload(position),
    await user.getIdToken(),
  );
  await AsyncStorage.setItem(DRIVER_LAST_SENT_KEY, String(Date.now()));
  // Courses closes ailleurs (marchand, autre appareil) : fin du mode livraison.
  if (activeDeliveries === 0) await stopDeliveryTracking();
};

/** Position de l'utilisateur (historique), au plus toutes les 15 min. */
const sendUserPosition = async (
  position: Location.LocationObject,
  user: User,
) => {
  if ((await elapsedSince(LAST_SENT_KEY)) < USER_MIN_INTERVAL_MS) return;
  const source =
    AppState.currentState === "active" ? "foreground" : "background";
  const payload = await buildLocationPayload(position, source);
  await userLocationService.send(payload, await user.getIdToken());
  await AsyncStorage.setItem(LAST_SENT_KEY, String(Date.now()));
};

if (Platform.OS !== "web") {
  TaskManager.defineTask<LocationTaskData>(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }) => {
      const locations = data?.locations ?? [];
      const position = locations[locations.length - 1];
      if (error || !position) return;
      try {
        // Lancement à froid : la session Firebase est restaurée depuis
        // AsyncStorage avant de lire l'utilisateur.
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
          // Déconnecté : plus personne à suivre.
          await stopBackgroundLocation();
          return;
        }
        if ((await getTrackingMode()) === "delivery") {
          await sendDriverPosition(position, user).catch((e) =>
            console.warn("Position livreur impossible:", e),
          );
        } else if (!userBackgroundSupported) {
          // Android : suivi utilisateur d'une version antérieure, plus permis.
          await stopLegacyUserTracking();
          return;
        }
        await sendUserPosition(position, user);
      } catch (e) {
        console.warn("Localisation arrière-plan impossible:", e);
      }
    },
  );
}

const isStarted = () =>
  Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

/** (Re)lance la tâche avec les réglages du mode demandé. */
const restartIn = async (mode: TrackingMode) => {
  if (await isStarted()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
  await setTrackingMode(mode);
  await Location.startLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
    trackingOptions(mode),
  );
};

/**
 * Lance le suivi utilisateur (idempotent, iOS). Exige la permission
 * « Toujours ». Une course en cours garde la main : le mode livraison n'est
 * pas rétrogradé.
 */
export const startBackgroundLocation = async () => {
  if (!userBackgroundSupported) return;
  if (await isStarted()) return;
  await restartIn("normal");
};

/**
 * Android : arrête un suivi utilisateur lancé par une version antérieure
 * (avec « Toujours »). Une course en cours (mode livraison) n'est pas touchée.
 */
export const stopLegacyUserTracking = async () => {
  if (!backgroundLocationSupported || userBackgroundSupported) return;
  if ((await getTrackingMode()) === "delivery") return;
  if (await isStarted()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};

/** Arrête tout suivi (déconnexion). */
export const stopBackgroundLocation = async () => {
  if (!backgroundLocationSupported) return;
  await setTrackingMode("normal");
  if (await isStarted()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};

/**
 * Livreur : passe la tâche en mode livraison (idempotent). À appeler app
 * ouverte (Android refuse de démarrer un service de premier plan sinon).
 * Demande la permission « Pendant l'utilisation » si l'OS le permet encore,
 * précédée de l'écran de divulgation (Android).
 * @returns false si la localisation est refusée ou indisponible.
 */
export const startDeliveryTracking = async (): Promise<boolean> => {
  if (!backgroundLocationSupported) return false;
  if ((await requestForegroundLocation("delivery")) !== "granted") return false;
  if ((await getTrackingMode()) === "delivery" && (await isStarted())) {
    return true;
  }
  await restartIn("delivery");
  return true;
};

/**
 * Fin des courses : retour au suivi utilisateur si « Toujours » est accordé
 * (iOS), arrêt sinon. Sans effet hors mode livraison.
 */
export const stopDeliveryTracking = async () => {
  if (!backgroundLocationSupported) return;
  if ((await getTrackingMode()) !== "delivery") return;
  const status = userBackgroundSupported
    ? (await Location.getBackgroundPermissionsAsync()).status
    : "denied";
  if (status === "granted") {
    await restartIn("normal");
    return;
  }
  await setTrackingMode("normal");
  if (await isStarted()) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};
