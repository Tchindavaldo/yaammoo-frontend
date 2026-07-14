import axios from 'axios';
import { Config } from '@/src/api/config';
import { Commande } from '@/src/types';

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
      console.error('Error fetching driver orders:', error);
      throw error;
    }
  },

  /**
   * Update an order status (driver). `driverId` is sent so the backend can
   * verify the assignment. Allowed statuses: `delivering`, `finished`.
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
      console.error('Error updating driver order status:', error);
      throw error;
    }
  },

  /**
   * A user applies to become a driver for one or more fastFoods.
   * Backend creates one pending application per fastFoodId.
   */
  async apply(userId: string, fastFoodIds: string[]): Promise<void> {
    try {
      await axios.post(`${Config.apiUrl}/driver/apply`, { userId, fastFoodIds });
    } catch (error) {
      console.error('Error applying as driver:', error);
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
      console.error('Error searching fastfoods:', error);
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
      console.error('Error fetching my driver applications:', error);
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
      console.error('Error fetching driver stores:', error);
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
      console.error('Error fetching driver applications:', error);
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
      console.error('Error fetching drivers:', error);
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
      console.error('Error removing driver:', error);
      throw error;
    }
  },

  /** Fastfood accepts/refuses an application. Accept → user becomes a driver. */
  async decideApplication(
    applicationId: string,
    decision: 'accepted' | 'refused',
  ): Promise<void> {
    try {
      await axios.put(`${Config.apiUrl}/driver/applications/${applicationId}`, {
        decision,
      });
    } catch (error) {
      console.error('Error deciding driver application:', error);
      throw error;
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
  status: 'pending' | 'accepted' | 'refused';
  createdAt?: string;
  updatedAt?: string;
  // Le backend enrichit avec le user (lookup par userId).
  user?: { uid?: string; infos?: UserInfos; driverId?: string; isDriver?: boolean };
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
