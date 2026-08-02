import { Theme } from "@/src/theme";
import type {
  MerchantSupportStatus,
  MerchantSupportThread,
  MerchantSupportTopic,
  MerchantSupportTopicDescriptor,
} from "../types/merchantSupport.types";

/** Libellé affiché pour le statut d'un fil. */
export const MERCHANT_SUPPORT_STATUS_LABEL: Record<
  MerchantSupportStatus,
  string
> = {
  open: "En cours",
  pending: "En attente",
  closed: "Résolu",
};

/** Objets de discussion, posés par le client (lecture seule côté marchand). */
export const MERCHANT_SUPPORT_TOPICS: MerchantSupportTopicDescriptor[] = [
  {
    id: "question",
    label: "Question",
    icon: "help-circle-outline",
    color: Theme.colors.info,
  },
  {
    id: "probleme",
    label: "Problème",
    icon: "alert-circle-outline",
    color: Theme.colors.danger,
  },
  {
    id: "assistance",
    label: "Assistance",
    icon: "hand-left-outline",
    color: Theme.colors.primary,
  },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: "bulb-outline",
    color: Theme.colors.warning,
  },
  {
    id: "discussion",
    label: "Discussion",
    icon: "chatbubbles-outline",
    color: Theme.colors.secondary,
  },
];

export const getMerchantTopicDescriptor = (
  topic: MerchantSupportTopic
): MerchantSupportTopicDescriptor =>
  MERCHANT_SUPPORT_TOPICS.find((t) => t.id === topic) ??
  MERCHANT_SUPPORT_TOPICS[0];

/**
 * Données de démonstration — design seulement. Remplacées par
 * `GET /support/threads?fastFoodId=` une fois la feature branchée.
 */
export const MERCHANT_SUPPORT_THREADS_MOCK: MerchantSupportThread[] = [
  {
    id: "mt1",
    topic: "probleme",
    client: { id: "u1", nom: "Aline Ndongo" },
    title: "Commande non livrée",
    status: "open",
    unreadCount: 2,
    updatedAt: "2026-08-02T09:12:00.000Z",
    lastMessage: "Bonjour, ma commande d'hier soir n'est jamais arrivée.",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Bonjour, ma commande d'hier soir n'est jamais arrivée.",
        createdAt: "2026-08-02T09:12:00.000Z",
      },
    ],
  },
  {
    id: "mt2",
    topic: "question",
    client: { id: "u2", nom: "Marc Etoa" },
    title: "Horaires du dimanche",
    status: "pending",
    unreadCount: 0,
    updatedAt: "2026-07-30T14:25:00.000Z",
    lastMessage: "Nous ouvrons à partir de 11h le dimanche.",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Bonjour, êtes-vous ouverts le dimanche matin ?",
        createdAt: "2026-07-30T14:02:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Nous ouvrons à partir de 11h le dimanche.",
        createdAt: "2026-07-30T14:25:00.000Z",
      },
    ],
  },
  {
    id: "mt3",
    topic: "suggestion",
    client: { id: "u3", nom: "Sandra Mbala" },
    title: "Plus de choix végétarien",
    status: "closed",
    unreadCount: 0,
    updatedAt: "2026-07-21T18:40:00.000Z",
    lastMessage: "Merci pour le retour, nous étudions la carte.",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Ce serait bien d'avoir plus de plats végétariens.",
        createdAt: "2026-07-21T18:12:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Merci pour le retour, nous étudions la carte.",
        createdAt: "2026-07-21T18:40:00.000Z",
      },
    ],
  },
];
