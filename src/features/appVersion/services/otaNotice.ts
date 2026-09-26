import * as Updates from "expo-updates";

import { storage } from "@/src/utils/storage";

/**
 * Signaux de la carte de mise a jour OTA (`OtaUpdateCard`).
 *
 * - `downloaded` : une mise a jour vient d'etre telechargee alors que l'app
 *   est deja affichee. Elle ne s'appliquera qu'au prochain lancement
 *   (`useOtaUpdates` ne redemarre jamais une app deja peinte).
 * - `applied` : ce lancement tourne sur une mise a jour que l'appareil n'avait
 *   encore jamais executee.
 *
 * Meme principe que `onNetworkStateChange` : un emetteur minimal, la carte
 * s'abonne une fois a la racine de l'app.
 */

type Listener = () => void;

const downloadedListeners = new Set<Listener>();
/** Telechargement survenu avant l'abonnement de la carte : rejoue a l'abonnement. */
let downloadedPending = false;

export const notifyUpdateDownloaded = () => {
  downloadedPending = true;
  downloadedListeners.forEach((l) => l());
};

export const onUpdateDownloaded = (listener: Listener) => {
  downloadedListeners.add(listener);
  if (downloadedPending) listener();
  return () => {
    downloadedListeners.delete(listener);
  };
};

/** Derniere update executee sur l'appareil ("embedded" = bundle du store). */
const LAST_UPDATE_KEY = "ota.lastRunUpdateId";
const EMBEDDED = "embedded";

/**
 * Vrai si ce lancement execute une mise a jour OTA jamais executee ici.
 * Memorise l'update courante : la reponse n'est vraie qu'UNE fois par update.
 * Un lancement sur le bundle du store n'est jamais une « mise a jour appliquee ».
 * Ne leve jamais : un stockage illisible vaut « rien a signaler ».
 */
export async function consumeUpdateApplied(): Promise<boolean> {
  const current = Updates.isEmbeddedLaunch ? EMBEDDED : (Updates.updateId ?? EMBEDDED);
  try {
    const last = await storage.get(LAST_UPDATE_KEY);
    await storage.set(LAST_UPDATE_KEY, current);
    return current !== EMBEDDED && last !== current;
  } catch {
    return false;
  }
}
