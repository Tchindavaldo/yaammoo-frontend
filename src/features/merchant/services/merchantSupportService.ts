import { Config } from "@/src/api/config";
import axios from "axios";
import type {
  MerchantSupportMessage,
  MerchantSupportThread,
} from "../types/merchantSupport.types";

const BASE = () => `${Config.apiUrl}/support`;

/**
 * API des messages boutique. Mêmes endpoints que le chat client, mais lus du
 * point de vue de la boutique : `fastFoodId` en filtre, `author: 'support'` à
 * l'envoi, et `side=support` pour les non-lus.
 */
export const merchantSupportService = {
  /** Fils reçus par la boutique, du plus récent au plus ancien. */
  async getThreads(fastFoodId: string): Promise<MerchantSupportThread[]> {
    const res = await axios.get(`${BASE()}/threads`, { params: { fastFoodId } });
    return res.data?.data || [];
  },

  /** Messages d'un fil, ordre chronologique. */
  async getMessages(threadId: string): Promise<MerchantSupportMessage[]> {
    const res = await axios.get(`${BASE()}/threads/${threadId}/messages`);
    return res.data?.data || [];
  },

  /** Réponse de la boutique dans un fil existant. */
  async reply(
    threadId: string,
    payload: { userId: string; text: string }
  ): Promise<{ thread: MerchantSupportThread; message: MerchantSupportMessage }> {
    const res = await axios.post(`${BASE()}/threads/${threadId}/messages`, {
      ...payload,
      author: "support",
    });
    return res.data?.data;
  },

  /** Remet à zéro les non-lus côté boutique sur ce fil. */
  async markRead(threadId: string): Promise<void> {
    await axios.patch(`${BASE()}/threads/${threadId}/read`, null, {
      params: { side: "support" },
    });
  },
};
