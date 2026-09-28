import { Config } from "@/src/api/config";
import axios from "axios";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Dernière position du livreur en course. */
export interface DriverPosition extends LatLng {
  driverId?: string;
  /** m */
  accuracy?: number | null;
  /** m/s */
  speed?: number | null;
  /** degrés, 0 = nord */
  heading?: number | null;
  capturedAt: string;
}

export interface OrderTracking {
  orderId: string;
  status: string;
  driverId: string | null;
  driver: DriverPosition | null;
  /** Dernière position connue du client (la commande n'a qu'une adresse texte). */
  destination: (LatLng & { capturedAt?: string }) | null;
}

/**
 * État initial de l'onglet « Suivi » (`GET /driver/tracking/:orderId`) ; la
 * suite arrive par socket (`driverLocationUpdated`). Bearer via `setupHttp`.
 */
export const orderTrackingService = {
  async get(orderId: string): Promise<OrderTracking> {
    const res = await axios.get(
      `${Config.apiUrl}/driver/tracking/${encodeURIComponent(orderId)}`,
    );
    return res.data?.data as OrderTracking;
  },
};
