/** Sujet d'une discussion support, choisi en chip à l'ouverture d'un nouveau chat. */
export type SupportTopic =
  | "question"
  | "probleme"
  | "assistance"
  | "suggestion"
  | "discussion";

export interface SupportTopicDescriptor {
  id: SupportTopic;
  label: string;
  /** Nom d'icône Ionicons. */
  icon: string;
  color: string;
}

export type SupportMessageAuthor = "user" | "support";

export interface SupportMessage {
  id: string;
  author: SupportMessageAuthor;
  text: string;
  /** ISO 8601. */
  createdAt: string;
}

export type SupportThreadStatus = "open" | "pending" | "closed";

export interface SupportThread {
  id: string;
  topic: SupportTopic;
  /**
   * Interlocuteur du fil : une boutique, ou `null` pour le support yaammoo.
   * Son nom sert de titre (liste + header de la conversation).
   */
  fastFood: { id: string; nom: string } | null;
  /** Résumé de la demande, affiché sous le nom de l'interlocuteur. */
  title: string;
  status: SupportThreadStatus;
  unreadCount: number;
  /** ISO 8601 du dernier message. */
  updatedAt: string;
  lastMessage: string;
}
