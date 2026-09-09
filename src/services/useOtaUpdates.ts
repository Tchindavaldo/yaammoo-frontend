import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

import { isSplashHidden } from "@/src/hooks/useHideSplash";
import { tagCurrentUpdate, trackUpdateFetch } from "@/src/services/otaTelemetry";

/**
 * Mises a jour OTA (expo-updates).
 *
 * Sans ce hook, `expo-updates` telecharge bien la mise a jour au demarrage mais
 * ne l'applique qu'au lancement SUIVANT : l'utilisateur reste une session
 * entiere sur l'ancien code. On force donc l'application des qu'elle est prete.
 *
 * ⚠️ On ne redemarre JAMAIS une app deja peinte. Un `reloadAsync` apres le
 * splash rejoue tout le boot A NU (le splash natif est deja consomme) :
 * l'utilisateur voyait l'app se relancer, puis le get-started de `(auth)`
 * apparaitre avant la home, le temps que l'auth se re-resolve. Deux cas
 * seulement :
 *   - splash encore affiche → reload immediat, invisible pour l'utilisateur ;
 *   - app deja visible      → la mise a jour reste telechargee et s'appliquera
 *                             au prochain lancement.
 *
 * ⚠️ Ne fait rien en developpement : `__DEV__` court-circuite tout, sinon chaque
 * rechargement Metro declencherait une requete inutile.
 */

/**
 * Delai minimal entre deux verifications, pour ne pas interroger le serveur a
 * CHAQUE retour au premier plan (repondre a un SMS et revenir en declencherait
 * une). Ne freine jamais un telechargement en cours : `fetchUpdateAsync` va
 * jusqu'au bout et reprend ou il s'etait arrete a la tentative suivante.
 */
const CHECK_INTERVAL_MS = 60 * 1000;

export function useOtaUpdates() {
  const lastCheckRef = useRef(0);
  /** Une mise a jour est deja en cours de recuperation : ne pas en lancer une seconde. */
  const busyRef = useRef(false);
  /** Mise a jour deja telechargee : elle attend le prochain lancement, inutile de re-verifier. */
  const pendingRef = useRef(false);

  useEffect(() => {
    if (__DEV__) return;

    // Identifie l'update sur laquelle tourne CET appareil : c'est la seule
    // facon de savoir qui a recu quoi, aucune commande EAS ne le dit.
    tagCurrentUpdate();

    const check = async () => {
      if (busyRef.current || pendingRef.current) return;
      const now = Date.now();
      if (now - lastCheckRef.current < CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;
      busyRef.current = true;
      const startedAt = Date.now();
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        pendingRef.current = true;
        // Le splash a pu etre leve pendant le telechargement : on re-teste ICI,
        // juste avant de redemarrer, pas au debut du check.
        if (isSplashHidden()) {
          trackUpdateFetch("deferred", Date.now() - startedAt);
          return;
        }
        trackUpdateFetch("applied", Date.now() - startedAt);
        await Updates.reloadAsync();
      } catch (error) {
        // Reseau indisponible ou canal absent : l'app continue sur le bundle
        // embarque. Une mise a jour ratee ne doit jamais bloquer le demarrage.
        trackUpdateFetch("failed", Date.now() - startedAt, error);
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
