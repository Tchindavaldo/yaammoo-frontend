import { Config } from "@/src/api/config";
import axios from "axios";

/** Moment de la capture, tel que stocké côté serveur (`user_locations.source`). */
export type LocationSource = "login" | "app_open" | "foreground" | "background";

export interface UserLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  /** Département (Cameroun). */
  subregion?: string;
  region?: string;
  /** Quartier / arrondissement. */
  district?: string;
  street?: string;
  postalCode?: string;
  country?: string;
  isoCountryCode?: string;
  source: LocationSource;
  platform?: "ios" | "android" | "web";
  capturedAt?: string;
}

/**
 * Enregistre la position de l'utilisateur connecté (Bearer ajouté par
 * `setupHttp`). Historique + dernière position côté backend :
 * voir architecture/user-location.md.
 */
export const userLocationService = {
  async send(payload: UserLocationPayload): Promise<void> {
    await axios.post(`${Config.apiUrl}/user/location`, payload);
  },
};
