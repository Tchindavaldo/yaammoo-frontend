import axios from "axios";
import { Config } from "@/src/api/config";
import { Commande } from "@/src/types";
import { auth } from "@/src/services/firebase";

/** En-têtes avec le token Firebase (endpoints protégés). */
async function authHeaders() {
  const idToken = await auth.currentUser?.getIdToken();
  return {
    "ngrok-skip-browser-warning": "true",
    Authorization: `Bearer ${idToken}`,
  };
}

/**
 * Driver API calls.
 *
 * A driver only sees orders a fastFood delegated to them (per-order:
 * `Commande.driverId`). Exposed via `/order/driver/:driverId`. Status
 * transitions reuse `PUT /order`; the backend verifies the driver is assigned
 * to the order before accepting.
 */
export const driverService = {
  /** Orders delegated to this driver (ready / in progress / done). */
  async getOrders(driverId: string): Promise<Commande[]> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/order/driver/${driverId}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching driver orders:", error);
      throw error;
    }
  },

  /**
   * Update an order status (driver). `driverId` is sent so the backend can
   * verify the assignment. Allowed statuses: `delivering`, `delivered`.
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    driverId: string,
  ): Promise<void> {
    try {
      await axios.put(`${Config.apiUrl}/order`, {
        id: orderId,
        status,
        driverId,
      });
    } catch (error) {
      console.error("Error updating driver order status:", error);
      throw error;
    }
  },

  /**
   * A user applies to become a driver for one or more fastFoods.
   * Backend creates one pending application per fastFoodId.
   */
  async apply(userId: string, fastFoodIds: string[]): Promise<void> {
    try {
      await axios.post(`${Config.apiUrl}/driver/apply`, {
        userId,
        fastFoodIds,
      });
    } catch (error) {
      console.error("Error applying as driver:", error);
      throw error;
    }
  },

  /**
   * Server-side fastfood search (name). Used by the apply modal so it does not
   * depend on the home's locally loaded list.
   */
  async searchFastFoods(query: string): Promise<StoreOption[]> {
    try {
      const response = await axios.get(`${Config.apiUrl}/fastfood/search`, {
        params: { q: query },
      });
      return response.data.data || [];
    } catch (error) {
      console.error("Error searching fastfoods:", error);
      throw error;
    }
  },

  /** All applications sent by a user (any status), for "Mes demandes". */
  async getMyApplications(userId: string): Promise<DriverApplication[]> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/driver/my-applications/${userId}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching my driver applications:", error);
      throw error;
    }
  },

  /** Fastfoods this driver delivers for (for the "Mes livraisons" filter). */
  async getMyStores(driverId: string): Promise<StoreOption[]> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/driver/stores/${driverId}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching driver stores:", error);
      throw error;
    }
  },

  /** Pending applications received by a fastFood. */
  async getApplications(fastFoodId: string): Promise<DriverApplication[]> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/driver/applications/${fastFoodId}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching driver applications:", error);
      throw error;
    }
  },

  /** Drivers already assigned to a fastFood. */
  async getDrivers(fastFoodId: string): Promise<DriverInfo[]> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/driver/list/${fastFoodId}`,
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching drivers:", error);
      throw error;
    }
  },

  /** Fastfood removes a driver from its team (unassigns + clears driverId if last). */
  async removeDriver(driverId: string, fastFoodId: string): Promise<void> {
    try {
      await axios.delete(`${Config.apiUrl}/driver/${driverId}`, {
        params: { fastFoodId },
      });
    } catch (error) {
      console.error("Error removing driver:", error);
      throw error;
    }
  },

  /** Fastfood accepts/refuses an application. Accept → user becomes a driver. */
  async decideApplication(
    applicationId: string,
    decision: "accepted" | "refused",
  ): Promise<void> {
    try {
      await axios.put(`${Config.apiUrl}/driver/applications/${applicationId}`, {
        decision,
      });
    } catch (error) {
      console.error("Error deciding driver application:", error);
      throw error;
    }
  },

  /**
   * Infos d'un livreur (protégé). Le backend adapte le contenu au demandeur
   * (scope public / merchant / self) d'après le token. Voir DriverProfile.
   */
  async getDriverInfo(driverId: string): Promise<DriverProfile> {
    const response = await axios.get(`${Config.apiUrl}/driver/${driverId}`, {
      headers: await authHeaders(),
    });
    return { ...response.data.data, scope: response.data.scope };
  },

  /** Noter un livreur (client). value 1-5. Le backend émet driverRatingUpdated. */
  async rateDriver(
    driverId: string,
    orderId: string,
    value: number,
    comment?: string,
  ): Promise<void> {
    await axios.post(
      `${Config.apiUrl}/driver/${driverId}/rating`,
      { orderId, value, comment },
      { headers: await authHeaders() },
    );
  },

  /**
   * Infos/stats du MARCHAND quand il livre lui-même (pas de driverId).
   * Endpoint : GET /fastFood/:fastFoodId/delivery-stats
   *
   * Scope "self" (marchand propriétaire) → données de la boutique + stats globales.
   * Scope "client" (client ayant commandé ici) → canRate, hasRated, myStats.
   * Si le client est aussi le marchand (review), scope "self" est renvoyé.
   */
  async getMerchantDeliveryInfo(
    fastFoodId: string,
  ): Promise<DriverProfile | null> {
    try {
      const response = await axios.get(
        `${Config.apiUrl}/fastfood/${fastFoodId}/delivery-stats`,
        { headers: await authHeaders() },
      );
      const data = response.data.data;
      const scope = response.data.scope || "self";

      // Mapper les champs du endpoint vers DriverProfile (compatible avec le rendu existant)
      return {
        scope,
        uid: data.userId || data.fastFoodId,
        isDriver: false,
        displayName: data.name,
        photo: data.image,
        ratingAvg: data.ratingAvg,
        ratingCount: data.ratingCount,
        fastFoodId: data.fastFoodId,
        stats: data.stats,
        myStats: data.myStats,
        hasRated: data.hasRated,
        canRate: data.canRate,
      };
    } catch {
      return null;
    }
  },
};

export interface UserInfos {
  nom?: string;
  prenom?: string;
  email?: string;
  numero?: number;
  age?: number;
}

export interface DriverApplication {
  id: string;
  userId: string;
  fastFoodId: string;
  fastFoodName?: string;
  status: "pending" | "accepted" | "refused";
  createdAt?: string;
  updatedAt?: string;
  // Le backend enrichit avec le user (lookup par userId).
  user?: {
    uid?: string;
    infos?: UserInfos;
    driverId?: string;
    isDriver?: boolean;
  };
}

// GET /driver/list renvoie les livreurs À PLAT (pas imbriqué dans `user`).
export interface DriverInfo {
  uid: string;
  driverId: string;
  isDriver?: boolean;
  infos?: UserInfos;
}

export interface StoreOption {
  id: string;
  nom: string;
}

export interface DriverStats {
  delivered: number;
  inProgress: number;
  pending: number;
  total: number;
}

/** Réponse de GET /driver/:id — contenu selon le scope (public/merchant/self). */
export interface DriverProfile {
  scope: "public" | "merchant" | "self";
  uid: string;
  isDriver: boolean;
  nom?: string;
  prenom?: string;
  displayName?: string;
  photo?: string;
  ratingAvg?: number;
  ratingCount?: number;
  stores?: { fastFoodId: string }[];
  fastFoodId?: string; // scope merchant
  stats?: DriverStats; // scope merchant / self
  // scope public : contexte de la relation user ↔ livreur
  myStats?: DriverStats; // mes commandes avec ce livreur
  hasRated?: boolean; // ai-je déjà noté ce livreur
  canRate?: boolean; // livré ≥1 fois ET pas encore noté
}
