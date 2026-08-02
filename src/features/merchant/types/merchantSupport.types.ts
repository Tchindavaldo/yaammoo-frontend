/** Objet d'une discussion, choisi par le client à l'ouverture du fil. */
export type MerchantSupportTopic =
  | "question"
  | "probleme"
  | "assistance"
  | "suggestion"
  | "discussion";

export interface MerchantSupportTopicDescriptor {
  id: MerchantSupportTopic;
  label: string;
  /** Nom d'icône Ionicons. */
  icon: string;
  color: string;
}

/** Côté marchand, `support` = la boutique, `user` = le client. */
export type MerchantSupportAuthor = "user" | "support";

export interface MerchantSupportMessage {
  id: string;
  author: MerchantSupportAuthor;
  text: string;
  /** ISO 8601. */
  createdAt: string;
}

export type MerchantSupportStatus = "open" | "pending" | "closed";

export interface MerchantSupportThread {
  id: string;
  topic: MerchantSupportTopic;
  /** Client à l'origine du fil : c'est lui qu'on affiche en titre. */
  client: { id: string; nom: string };
  /** Résumé de la demande. */
  title: string;
  status: MerchantSupportStatus;
  /** Non-lus côté boutique (`support_unread_count` backend). */
  unreadCount: number;
  /** ISO 8601 du dernier message. */
  updatedAt: string;
  lastMessage: string;
  messages: MerchantSupportMessage[];
}
