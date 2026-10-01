import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";
import {
  onForegroundLocationStatus,
  requestForegroundLocation,
} from "../services/locationPermission";

export type LocationAccessState = "checking" | "granted" | "blocked";

/**
 * Statut de la localisation « Pendant l'utilisation » pour le bandeau du home
 * (`HomeLocationBanner`) : affiché tant qu'elle n'est pas accordée, sans
 * bloquer le home (Apple 5.1.1 : l'app doit rester utilisable sans).
 *
 * `enable()` relance la demande (écran de divulgation Android puis popup
 * système) tant que l'OS peut encore l'afficher ; refusée définitivement, il
 * ouvre les réglages de l'app. Statut relu au retour au premier plan (retour
 * des réglages) et après toute demande faite ailleurs (connexion, checkout).
 * Web : toujours `granted`.
 */
export const useLocationAccess = () => {
  const [state, setState] = useState<LocationAccessState>(
    Platform.OS === "web" ? "granted" : "checking",
  );
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const check = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const current = await Location.getForegroundPermissionsAsync();
      setCanAskAgain(current.canAskAgain);
      setState(current.status === "granted" ? "granted" : "blocked");
    } catch (error) {
      // Statut illisible : pas de bandeau sur une erreur technique.
      console.warn("Lecture de la permission de localisation impossible:", error);
      setState("granted");
    }
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    const off = onForegroundLocationStatus(() => void check());
    return () => {
      sub.remove();
      off();
    };
  }, [check]);

  const enable = useCallback(async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status !== "granted" && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      await requestForegroundLocation("nearby");
    } catch (error) {
      console.warn("Demande de localisation impossible:", error);
    } finally {
      setRequesting(false);
      void check();
    }
  }, [requesting, check]);

  return { state, canAskAgain, requesting, enable };
};
