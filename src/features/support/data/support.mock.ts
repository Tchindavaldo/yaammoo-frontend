import { Theme } from "@/src/theme";
import type {
  SupportThread,
  SupportThreadStatus,
  SupportTopic,
  SupportTopicDescriptor,
} from "../types/support.types";

/** Nom affiché quand le fil s'adresse au support yaammoo. */
export const SUPPORT_DEFAULT_NAME = "yaammoo";

/** Titre d'un fil : la boutique concernée, sinon yaammoo. */
export const getThreadName = (thread: SupportThread): string =>
  thread.fastFood?.nom ?? SUPPORT_DEFAULT_NAME;

/** Libellé affiché pour le statut d'un fil. */
export const SUPPORT_STATUS_LABEL: Record<SupportThreadStatus, string> = {
  open: "En cours",
  pending: "En attente",
  closed: "Résolu",
};

/** Sujets proposés en chips en haut d'un nouveau chat. */
export const SUPPORT_TOPICS: SupportTopicDescriptor[] = [
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

export const getTopicDescriptor = (
  topic: SupportTopic
): SupportTopicDescriptor =>
  SUPPORT_TOPICS.find((t) => t.id === topic) ?? SUPPORT_TOPICS[0];

/**
 * Données de démonstration — design seulement. Remplacées par les endpoints
 * backend une fois le contrat fourni.
 */
export const SUPPORT_THREADS_MOCK: SupportThread[] = [
  {
    id: "t1",
    topic: "probleme",
    fastFood: { id: "ff1", nom: "Chez Mama Nathalie" },
    title: "Commande non livrée",
    status: "open",
    unreadCount: 2,
    updatedAt: "2026-08-02T09:12:00.000Z",
    lastMessage: "Nous avons relancé le livreur, vous êtes recontacté sous 10 min.",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Bonjour, ma commande d'hier soir n'est jamais arrivée.",
        createdAt: "2026-08-02T08:40:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Bonjour, désolé pour la gêne. Pouvez-vous me confirmer le numéro de commande ?",
        createdAt: "2026-08-02T08:52:00.000Z",
      },
      {
        id: "m3",
        author: "user",
        text: "C'est la commande #A-2481.",
        createdAt: "2026-08-02T09:01:00.000Z",
      },
      {
        id: "m4",
        author: "support",
        text: "Nous avons relancé le livreur, vous êtes recontacté sous 10 min.",
        createdAt: "2026-08-02T09:12:00.000Z",
      },
    ],
  },
  {
    id: "t2",
    topic: "question",
    fastFood: { id: "ff2", nom: "Le Grill du Coin" },
    title: "Frais de livraison express",
    status: "closed",
    unreadCount: 0,
    updatedAt: "2026-07-28T17:05:00.000Z",
    lastMessage: "Parfait, merci beaucoup !",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Comment sont calculés les frais en zone express ?",
        createdAt: "2026-07-28T16:44:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Ils dépendent de la zone de la boutique et de la distance. Le détail s'affiche avant le paiement.",
        createdAt: "2026-07-28T16:58:00.000Z",
      },
      {
        id: "m3",
        author: "user",
        text: "Parfait, merci beaucoup !",
        createdAt: "2026-07-28T17:05:00.000Z",
      },
    ],
  },
  {
    id: "t3",
    topic: "suggestion",
    fastFood: null,
    title: "Ajouter les favoris",
    status: "pending",
    unreadCount: 0,
    updatedAt: "2026-07-19T11:30:00.000Z",
    lastMessage: "Merci, la suggestion est transmise à l'équipe produit.",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Ce serait pratique de pouvoir mettre des plats en favoris.",
        createdAt: "2026-07-19T11:12:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Merci, la suggestion est transmise à l'équipe produit.",
        createdAt: "2026-07-19T11:30:00.000Z",
      },
    ],
  },
];
