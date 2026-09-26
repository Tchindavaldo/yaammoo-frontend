import { Config } from "@/src/api/config";
import axios from "axios";
import type {
  BroadcastAudience,
  BroadcastItem,
  BroadcastPlan,
  BroadcastState,
} from "../types/broadcast.types";

const BASE = () => `${Config.apiUrl}/notification/broadcast`;
const AUDIENCES: BroadcastAudience[] = ["customers", "city", "all"];

/** Plan appliqué tant que le backend n'a pas répondu (même valeurs que son repli). */
export const FREE_PLAN: BroadcastPlan = {
  key: "free",
  label: "Gratuit",
  dayLimit: 3,
  weekLimit: 10,
  audiences: AUDIENCES,
};

const isAudience = (a: unknown): a is BroadcastAudience =>
  AUDIENCES.includes(a as BroadcastAudience);

const normalizePlan = (raw: any): BroadcastPlan => ({
  key: typeof raw?.key === "string" ? raw.key : FREE_PLAN.key,
  label: typeof raw?.label === "string" && raw.label ? raw.label : FREE_PLAN.label,
  dayLimit: Number(raw?.dayLimit) >= 0 ? Number(raw.dayLimit) : FREE_PLAN.dayLimit,
  weekLimit: Number(raw?.weekLimit) >= 0 ? Number(raw.weekLimit) : FREE_PLAN.weekLimit,
  audiences: Array.isArray(raw?.audiences) ? raw.audiences.filter(isAudience) : FREE_PLAN.audiences,
});

const normalizeItem = (raw: any): BroadcastItem | null => {
  if (!raw?.id || !raw?.title || !raw?.sentAt) return null;
  return {
    id: String(raw.id),
    title: String(raw.title),
    body: raw.body ? String(raw.body) : undefined,
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
    audience: isAudience(raw.audience) ? raw.audience : "customers",
    city: raw.city ? String(raw.city) : undefined,
    recipientsCount: Number(raw.recipientsCount) || 0,
    sentAt: String(raw.sentAt),
  };
};

/** Message d'erreur du backend (quota atteint, audience hors plan…), sinon générique. */
export const broadcastErrorMessage = (error: any, fallback: string): string => {
  const msg = error?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : fallback;
};

/**
 * API des notifications envoyées par la boutique. Le quota est appliqué par le
 * backend (refus 429) : le client ne fait que l'afficher.
 */
export const broadcastService = {
  /** Plan, villes desservies et envois, du plus récent au plus ancien. */
  async getState(fastFoodId: string): Promise<BroadcastState> {
    const res = await axios.get(`${BASE()}/${fastFoodId}`);
    const data = res.data?.data || {};
    const items = Array.isArray(data.items)
      ? (data.items.map(normalizeItem).filter(Boolean) as BroadcastItem[])
      : [];
    const cities = Array.isArray(data.cities)
      ? data.cities.filter((c: unknown) => typeof c === "string" && c)
      : [];
    return { plan: normalizePlan(data.plan), cities, items };
  },

  /** Envoie une notification à l'audience choisie. */
  async send(
    fastFoodId: string,
    payload: {
      title: string;
      body?: string;
      imageUrl?: string;
      audience: BroadcastAudience;
      city?: string;
    },
  ): Promise<BroadcastItem> {
    const res = await axios.post(`${BASE()}/${fastFoodId}`, payload);
    const item = normalizeItem(res.data?.data);
    if (!item) throw new Error("Réponse d'envoi invalide");
    return item;
  },
};
