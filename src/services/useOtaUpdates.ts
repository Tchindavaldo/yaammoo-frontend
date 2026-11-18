import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

import { notifyUpdateDownloaded } from "@/src/features/appVersion/services/otaNotice";
import {
  startFetchHeartbeat,
  tagCurrentUpdate,
  trackUpdateFetch,
} from "@/src/services/otaTelemetry";

/**
 * Mises a jour OTA (expo-updates).
 *
 * Sans ce hook, `expo-updates` telecharge bien la mise a jour au demarrage mais
 * ne l'applique qu'au lancement SUIVANT : l'utilisateur reste une session
 * entiere sur l'ancien code. On force donc l'application des qu'elle est prete.
 *
 * ⚠️ On ne redemarre JAMAIS l'app, ni au splash ni apres : un `reloadAsync`
 * creait un flash / loader au demarrage. La mise a jour est seulement
 * telechargee (sans jamais bloquer le splash) ; la carte « Mise a jour
 * telechargee » s'affiche sur la home et l'utilisateur relance l'app.
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
        // Heartbeat pendant le SEUL fetch : le check est immediat, lui n'a rien
        // a signaler. Si l'utilisateur quitte l'app en cours de route, le
        // dernier battement recu indique jusqu'ou le telechargement etait alle.
        const stopHeartbeat = startFetchHeartbeat();
        try {
          await Updates.fetchUpdateAsync();
        } finally {
          stopHeartbeat();
        }
        pendingRef.current = true;
        trackUpdateFetch("deferred", Date.now() - startedAt);
        // JAMAIS de reload, meme splash encore affiche : un reload au splash
        // creait un flash / loader. On telecharge seulement, puis la carte
        // « Mise a jour telechargee » s'affiche sur la home.
        notifyUpdateDownloaded();
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
