/**
 * Notifications envoyées par la boutique à des clients
 * (Settings → Boutique → Notifications). Contrat : architecture/merchant-broadcast.md
 */

/** À qui écrire : clients de la boutique, utilisateurs d'une ville, tout le monde. */
export type BroadcastAudience = "customers" | "city" | "all";

/** Plan d'envoi de la boutique : quotas et audiences autorisées. */
export interface BroadcastPlan {
  key: string;
  /** Libellé affiché dans la puce du calendrier (ex. « Gratuit »). */
  label: string;
  dayLimit: number;
  weekLimit: number;
  audiences: BroadcastAudience[];
}

/** Une notification déjà envoyée. */
export interface BroadcastItem {
  id: string;
  title: string;
  body?: string;
  imageUrl?: string;
  audience: BroadcastAudience;
  /** Ville visée quand `audience = city`. */
  city?: string;
  /** Renseigné une fois la diffusion terminée (0 juste après l'envoi). */
  recipientsCount: number;
  /** Date d'envoi ISO. */
  sentAt: string;
}

/** Réponse de `GET /notification/broadcast/:fastFoodId`. */
export interface BroadcastState {
  plan: BroadcastPlan;
  /** Villes desservies par la boutique, proposées pour l'audience « ville ». */
  cities: string[];
  /** Du plus récent au plus ancien. */
  items: BroadcastItem[];
}

/** Saisie du composeur. `imageUri` : URL distante (photo de menu) ou URI locale (galerie). */
export interface BroadcastDraft {
  title: string;
  body: string;
  imageUri: string | null;
  audience: BroadcastAudience;
  city: string | null;
}

/** Quota dérivé de l'historique, recalculé à chaque minute. */
export interface BroadcastQuota {
  dayUsed: number;
  weekUsed: number;
  dayLeft: number;
  weekLeft: number;
  /** Envois par jour de la semaine en cours, lundi → dimanche. */
  perDay: number[];
  /** Index du jour courant dans `perDay` (0 = lundi). */
  todayIndex: number;
}
