import { Config } from "@/src/api/config";
import axios from "axios";
import type {
  SupportMessage,
  SupportThread,
  SupportTopic,
} from "../types/support.types";

const BASE = () => `${Config.apiUrl}/support`;

/**
 * API du chat support (côté client).
 *
 * `fastFoodId` absent ou `null` = demande adressée à la plateforme yaammoo :
 * c'est le backend qui pose la règle, on la relaie telle quelle.
 */
export const supportService = {
  /** Fils du client, du plus récent au plus ancien (sans les messages). */
  async getThreads(userId: string): Promise<SupportThread[]> {
    const res = await axios.get(`${BASE()}/threads`, { params: { userId } });
    return res.data?.data || [];
  },

  /** Messages d'un fil, ordre chronologique. */
  async getMessages(threadId: string): Promise<SupportMessage[]> {
    const res = await axios.get(`${BASE()}/threads/${threadId}/messages`);
    return res.data?.data || [];
  },

  /** Crée un fil avec son premier message. */
  async createThread(payload: {
    userId: string;
    topic: SupportTopic;
    text: string;
    fastFoodId?: string | null;
  }): Promise<{ thread: SupportThread; message: SupportMessage }> {
    const res = await axios.post(`${BASE()}/threads`, payload);
    return res.data?.data;
  },

  /** Envoie un message dans un fil existant. */
  async sendMessage(
    threadId: string,
    payload: { userId: string; text: string }
  ): Promise<{ thread: SupportThread; message: SupportMessage }> {
    const res = await axios.post(
      `${BASE()}/threads/${threadId}/messages`,
      payload
    );
    return res.data?.data;
  },

  /** Remet à zéro les non-lus du client sur ce fil. */
  async markRead(threadId: string): Promise<void> {
    await axios.patch(`${BASE()}/threads/${threadId}/read`, null, {
      params: { side: "user" },
    });
  },
};
