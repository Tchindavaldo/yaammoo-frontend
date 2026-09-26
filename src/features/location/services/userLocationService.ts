import { Config } from "@/src/api/config";
import axios from "axios";

/** Moment de la capture, tel que stocké côté serveur (`user_locations.source`). */
export type LocationSource = "login" | "app_open" | "foreground" | "background";

export interface UserLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  /** m */
  altitude?: number;
  /** m/s */
  speed?: number;
  /** degrés, 0 = nord */
  heading?: number;
  city?: string;
  /** Département (Cameroun). */
  subregion?: string;
  region?: string;
  /** Quartier / arrondissement. */
  district?: string;
  street?: string;
  streetNumber?: string;
  /** Nom du lieu (bâtiment, repère). */
  placeName?: string;
  /** Adresse complète (Android). */
  formattedAddress?: string;
  postalCode?: string;
  country?: string;
  isoCountryCode?: string;
  /** Fuseau du lieu (iOS). */
  timezone?: string;
  source: LocationSource;
  platform?: "ios" | "android" | "web";
  capturedAt?: string;
}

/**
 * Enregistre la position de l'utilisateur connecté. Au premier plan, le Bearer
 * est ajouté par `setupHttp` ; la tâche arrière-plan, qui peut tourner sans
 * interface (donc sans `setupHttp`), passe son propre jeton `idToken`.
 * Historique côté backend : voir architecture/user-location.md.
 */
export const userLocationService = {
  async send(payload: UserLocationPayload, idToken?: string): Promise<void> {
    await axios.post(
      `${Config.apiUrl}/user/location`,
      payload,
      idToken ? { headers: { Authorization: `Bearer ${idToken}` } } : undefined,
    );
  },
};
