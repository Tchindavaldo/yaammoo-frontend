import { Theme } from "@/src/theme";
import type {
  MerchantSupportStatus,
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

