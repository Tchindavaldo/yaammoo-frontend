import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import {
  LocationSource,
  UserLocationPayload,
  userLocationService,
} from "../services/userLocationService";

/** Dernier envoi réussi (ms), partagé entre sessions. */
const LAST_SENT_KEY = "user_location_last_sent";
/** Écart minimal entre deux captures hors connexion (ouverture, premier plan). */
const MIN_INTERVAL_MS = 30 * 60 * 1000;

const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);

/**
 * Position de l'utilisateur, envoyée au backend :
 * - à la connexion (`capture("login")`, appelée après la permission
 *   notifications) : la permission de localisation est demandée à ce moment,
 *   une seule fois — un refus n'est jamais redemandé ;
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

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude, accuracy } = position.coords;

      // Géocodage inverse du téléphone : ville, département, région. Peut
      // échouer hors ligne — les coordonnées partent quand même.
      let place: Location.LocationGeocodedAddress | undefined;
      try {
        [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      } catch (error) {
        console.warn("Géocodage inverse impossible:", error);
      }

      const payload: UserLocationPayload = {
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        city: clean(place?.city),
        subregion: clean(place?.subregion),
        region: clean(place?.region),
        district: clean(place?.district),
        street: clean(place?.street),
        postalCode: clean(place?.postalCode),
        country: clean(place?.country),
        isoCountryCode: clean(place?.isoCountryCode),
        source,
        platform: Platform.OS === "ios" ? "ios" : "android",
        capturedAt: new Date(position.timestamp).toISOString(),
      };
      await userLocationService.send(payload);
      await AsyncStorage.setItem(LAST_SENT_KEY, String(Date.now()));
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

  return { capture };
};
