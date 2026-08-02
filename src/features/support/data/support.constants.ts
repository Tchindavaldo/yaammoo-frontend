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

