import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

/**
 * Mises a jour OTA (expo-updates).
 *
 * Sans ce hook, `expo-updates` telecharge bien la mise a jour au demarrage mais
 * ne l'applique qu'au lancement SUIVANT : l'utilisateur reste une session
 * entiere sur l'ancien code. On force donc l'application des qu'elle est prete.
 *
 * ⚠️ Ne fait rien en developpement (`Updates.isEmbeddedLaunch` est faux et il
 * n'y a aucun canal) : `__DEV__` court-circuite tout, sinon chaque rechargement
 * Metro declencherait une requete inutile.
 */

/** Delai minimal entre deux verifications, pour ne pas interroger a chaque retour au premier plan. */
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useOtaUpdates() {
  const lastCheckRef = useRef(0);
  /** Une mise a jour est deja en cours de recuperation : ne pas en lancer une seconde. */
  const busyRef = useRef(false);

  useEffect(() => {
    if (__DEV__) return;

    const check = async () => {
      if (busyRef.current) return;
      const now = Date.now();
      if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;
      busyRef.current = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        // ⚠️ `reloadAsync` redemarre le bundle JS : tout etat non persiste est
        // perdu. Acceptable ICI parce qu'on ne l'appelle qu'au retour au
        // premier plan ou au boot, jamais pendant que l'utilisateur agit.
        await Updates.reloadAsync();
      } catch {
        // Reseau indisponible ou canal absent : l'app continue sur le bundle
        // embarque. Une mise a jour ratee ne doit jamais bloquer le demarrage.
      } finally {
        busyRef.current = false;
      }
    };

    void check();

    const onChange = (state: AppStateStatus) => {
      if (state === "active") void check();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);
}
