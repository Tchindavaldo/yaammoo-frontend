import { Config } from "@/src/api/config";
import axios from "axios";

export interface DriverPositionPayload {
  latitude: number;
  longitude: number;
  /** m */
  accuracy?: number;
  /** m/s */
  speed?: number;
  /** degrés, 0 = nord */
  heading?: number;
  capturedAt?: string;
}

/**
 * Position du livreur en course (`POST /driver/location`), envoyée par la
 * tâche arrière-plan en mode livraison. Le backend la pousse aux clients des
 * commandes `delivering` du livreur (socket `driverLocationUpdated`).
 * `activeDeliveries: 0` = plus aucune course : l'app quitte le mode livraison.
 * La tâche peut tourner sans `setupHttp` : elle passe son propre jeton.
 */
export const driverLocationService = {
  async send(
    payload: DriverPositionPayload,
    idToken: string,
  ): Promise<{ activeDeliveries: number }> {
    const res = await axios.post(`${Config.apiUrl}/driver/location`, payload, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const n = Number(res.data?.data?.activeDeliveries);
    return { activeDeliveries: Number.isFinite(n) ? n : 0 };
  },
};
