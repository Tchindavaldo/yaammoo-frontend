import { storage } from "@/src/utils/storage";

/**
 * Reglages d'affichage du home pilotes par le serveur (table `settings_client`),
 * renvoyes par la PREMIERE page de `GET /fastFood/all` (`clientSettings`).
 *
 * - La premiere page part avec les reglages gardes au lancement precedent ; la
 *   reponse fixe ceux des pages suivantes, et est gardee pour le lancement
 *   d'apres.
 * - `HOME_CLIENT_SETTINGS_FALLBACK` est la valeur de SECOURS : premier
 *   lancement, backend sans `clientSettings`, cle absente ou invalide.
 *
 * L'etat vit dans `FastFoodContext` (`homeSettings`) ; ce fichier ne fait que
 * valider et garder.
 */
export type HomeClientSettings = {
  /** Boutiques par page (`limit` de `GET /fastFood/all`). */
  pageSize: number;
  /**
   * Avance du chargement de la liste native : la page suivante est demandee
   * quand le premier squelette arrive a cette distance (px) du bas de l'ecran.
   */
  prefetchDistance: number;
};

export const HOME_CLIENT_SETTINGS_FALLBACK: HomeClientSettings = {
  pageSize: 10,
  prefetchDistance: 1200,
};

/**
 * Plafond de `limit` IMPOSE par le backend (`GET /fastFood/all`). Demander plus
 * n'echoue pas : le serveur rabote silencieusement. Voir
 * `architecture/restaurants.md`.
 */
export const MAX_SERVER_LIMIT = 50;

const STORAGE_KEY = "home_client_settings";

const pageSizeOf = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 1
    ? Math.min(v, MAX_SERVER_LIMIT)
    : null;

const distanceOf = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

/**
 * Lit `clientSettings` (reponse serveur, ou copie gardee) champ par champ : une
 * valeur absente ou invalide prend celle de secours.
 */
export const parseHomeClientSettings = (raw: any): HomeClientSettings => ({
  pageSize:
    pageSizeOf(raw?.homePageSize) ?? HOME_CLIENT_SETTINGS_FALLBACK.pageSize,
  prefetchDistance:
    distanceOf(raw?.homePrefetchDistance) ??
    HOME_CLIENT_SETTINGS_FALLBACK.prefetchDistance,
});

/** Reglages gardes au lancement precedent, sinon ceux de secours. Ne rejette jamais. */
export const readStoredHomeClientSettings =
  async (): Promise<HomeClientSettings> => {
    try {
      return parseHomeClientSettings(await storage.get(STORAGE_KEY));
    } catch {
      return HOME_CLIENT_SETTINGS_FALLBACK;
    }
  };

/** Garde `clientSettings` tel que recu, pour le lancement suivant. */
export const storeHomeClientSettings = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return;
  storage.set(STORAGE_KEY, raw).catch(() => {});
};
