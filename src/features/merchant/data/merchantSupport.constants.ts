import { Theme } from "@/src/theme";
import type {
  MerchantSupportStatus,
  MerchantSupportTopic,
  MerchantSupportTopicDescriptor,
} from "../types/merchantSupport.types";
import { t as tr } from "@/src/i18n";

/** Libellé affiché pour le statut d'un fil. */
export const MERCHANT_SUPPORT_STATUS_LABEL: Record<
  MerchantSupportStatus,
  string
> = {
  open: tr("En cours"),
  pending: tr("En attente"),
  closed: tr("Résolu"),
};

/** Objets de discussion, posés par le client (lecture seule côté marchand). */
export const MERCHANT_SUPPORT_TOPICS: MerchantSupportTopicDescriptor[] = [
  {
    id: "question",
    label: tr("Question"),
    icon: "help-circle-outline",
    color: Theme.colors.info,
  },
  {
    id: "probleme",
    label: tr("Problème"),
    icon: "alert-circle-outline",
    color: Theme.colors.danger,
  },
  {
    id: "assistance",
    label: tr("Assistance"),
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
    label: tr("Discussion"),
    icon: "chatbubbles-outline",
    color: Theme.colors.secondary,
  },
];

export const getMerchantTopicDescriptor = (
  topic: MerchantSupportTopic
): MerchantSupportTopicDescriptor =>
  MERCHANT_SUPPORT_TOPICS.find((t) => t.id === topic) ??
  MERCHANT_SUPPORT_TOPICS[0];

