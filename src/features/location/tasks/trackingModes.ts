import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { DS } from "@/src/theme/ds";

/**
 * Deux réglages pour UNE seule tâche arrière-plan (`backgroundLocationTask`) :
 *
 * - `normal`   : position de l'utilisateur (ciblage ville, marketing), rare,
 *                exige la permission « Toujours ».
 * - `delivery` : livreur en course, fréquent. Android : service de premier
 *                plan (notification permanente) ; iOS : indicateur bleu. Les
 *                deux suffisent avec la permission « Pendant l'utilisation ».
 *
 * Le mode est persisté : la tâche tourne sans interface (app fermée) et doit
 * savoir, à chaque position, si elle suit une course.
 */
export type TrackingMode = "normal" | "delivery";

const MODE_KEY = "location_tracking_mode";

/** Position de l'utilisateur : au plus toutes les 15 min (les deux modes). */
export const USER_MIN_INTERVAL_MS = 15 * 60 * 1000;
/** Mode normal : déplacement minimal (m) avant une nouvelle position. */
const USER_MIN_DISTANCE_M = 300;

/** Mode livraison : fréquence visée et écart minimal entre deux envois. */
const DELIVERY_INTERVAL_MS = 10 * 1000;
export const DELIVERY_MIN_SEND_MS = 8 * 1000;
const DELIVERY_MIN_DISTANCE_M = 15;

export const getTrackingMode = async (): Promise<TrackingMode> =>
  (await AsyncStorage.getItem(MODE_KEY)) === "delivery" ? "delivery" : "normal";

export const setTrackingMode = (mode: TrackingMode) =>
  AsyncStorage.setItem(MODE_KEY, mode);

export const trackingOptions = (
  mode: TrackingMode,
): Location.LocationTaskOptions =>
  mode === "delivery"
    ? {
        accuracy: Location.Accuracy.High,
        timeInterval: DELIVERY_INTERVAL_MS,
        distanceInterval: DELIVERY_MIN_DISTANCE_M,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.OtherNavigation,
        // iOS : avec « Pendant l'utilisation », le suivi continue en
        // arrière-plan tant que l'indicateur bleu est affiché.
        showsBackgroundLocationIndicator: true,
        // Android : service de premier plan (app.json
        // `isAndroidForegroundServiceEnabled: true`). Démarré app ouverte
        // seulement (bouton « Lancer »), l'OS l'interdit sinon.
        foregroundService: {
          notificationTitle: "Livraison en cours",
          notificationBody:
            "Votre position est partagée avec le client jusqu'à la fin de la course.",
          notificationColor: DS.accent,
          killServiceOnDestroy: false,
        },
      }
    : {
        accuracy: Location.Accuracy.Balanced,
        // Android : fréquence visée (l'OS la bride app fermée, sans service
        // de premier plan ni notification permanente).
        timeInterval: USER_MIN_INTERVAL_MS,
        distanceInterval: USER_MIN_DISTANCE_M,
        // iOS : une pause automatique ne reprend qu'au retour de l'app au
        // premier plan, le suivi s'arrêterait au premier arrêt.
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Other,
        showsBackgroundLocationIndicator: false,
      };
