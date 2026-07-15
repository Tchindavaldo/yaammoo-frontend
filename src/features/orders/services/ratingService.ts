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
};
