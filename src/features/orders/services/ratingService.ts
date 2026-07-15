import axios from "axios";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";

/** En-têtes avec le token Firebase (endpoints de notation protégés). */
async function authHeaders() {
  const idToken = await auth.currentUser?.getIdToken();
  return {
    "ngrok-skip-browser-warning": "true",
    Authorization: `Bearer ${idToken}`,
  };
}

export interface RatingReview {
  value: number;
  comment?: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
}

/** Ventilation par statut (scope self uniquement). */
export interface MenuStatsBucket {
  delivered: number;
  inProgress: number;
  pending: number;
}

/** Réponse de GET /menu/:menuId/stats — contenu selon le scope. */
export interface MenuStatsProfile {
  scope: "client" | "self" | string;
  menuId: string;
  fastFoodId: string;
  name: string;
  image?: string;
  ratingAvg?: number;
  ratingCount?: number; // nombre de votes du rating
  totalOrders?: number; // total du plat depuis sa création (popularité)
  myTotalOrders?: number; // mes commandes sur ce plat (scope client)
  stats?: MenuStatsBucket; // ventilation par statut (scope self)
  hasRated?: boolean;
  canRate?: boolean;
}

export const ratingService = {
  /** Noter un plat (menu). value 1-5. Le backend émet menuRatingUpdated. */
  async rateMenu(
    menuId: string,
    orderId: string,
    value: number,
    comment?: string,
  ): Promise<void> {
    await axios.post(
      `${Config.apiUrl}/menu/${menuId}/rating`,
      { orderId, value, comment },
      { headers: await authHeaders() },
    );
  },

  /**
   * Stats/contexte d'un plat pour l'user connecté.
   * GET /menu/:menuId/stats — protégé firebaseAuth. Renvoie ratingAvg/Count,
   * stats (popularité), myStats, hasRated, canRate. Voir MenuStatsProfile.
   */
  async getMenuStats(menuId: string): Promise<MenuStatsProfile | null> {
    try {
      const res = await axios.get(`${Config.apiUrl}/menu/${menuId}/stats`, {
        headers: await authHeaders(),
      });
      const data = res.data.data || {};
      return { ...data, scope: res.data.scope };
    } catch {
      return null;
    }
  },

  /** Liste des avis d'un plat. */
  async getMenuRatings(menuId: string): Promise<RatingReview[]> {
    const res = await axios.get(`${Config.apiUrl}/menu/${menuId}/ratings`, {
      headers: await authHeaders(),
    });
    return res.data.data || [];
  },

  /** Liste des avis d'un livreur. */
  async getDriverRatings(driverId: string): Promise<RatingReview[]> {
    const res = await axios.get(`${Config.apiUrl}/driver/${driverId}/ratings`, {
      headers: await authHeaders(),
    });
    return res.data.data || [];
  },

  /**
   * Note de l'user pour sa commande (menuRating + driverRating).
   * GET /rating/order/:orderId — protégé firebaseAuth.
   */
  async getOrderRating(
    orderId: string,
  ): Promise<{ menuRating?: RatingReview; driverRating?: RatingReview } | null> {
    try {
      const res = await axios.get(
        `${Config.apiUrl}/rating/order/${orderId}`,
        { headers: await authHeaders() },
      );
      return res.data.data || null;
    } catch {
      return null;
    }
  },
};
