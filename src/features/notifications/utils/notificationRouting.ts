import { Notification } from "../context/NotificationContext";

export const getNotificationRoute = (notif: Partial<Notification> | null | undefined): string => {
  if (!notif) return "/(tabs)/notifications";
  // `route` porté par la notif (backend). Peut être partiel ("settings?section=…")
  // → on préfixe "/(tabs)/" si ce n'est pas déjà un chemin absolu.
  const rawRoute = (notif as any).route;
  if (rawRoute) {
    return rawRoute.startsWith("/") ? rawRoute : `/(tabs)/${rawRoute}`;
  }
  switch (notif.type) {
    case "order_new":
      return "/(tabs)/boutique";
    case "order_cancel_by_user":
    case "order_cancel_by_merchant":
      return "/(tabs)/notifications";
    case "order_status":
    case "order_delivering":
      return "/(tabs)/settings?section=finished";
    case "order_rank_top":
      return "/(tabs)/settings?section=pending";
    // Demande de livraison reçue (→ marchand) : ouvre le modal "Livreurs".
    case "driver_application":
      return "/(tabs)/settings?section=drivers";
    // Demande décidée (→ candidat) : ouvre le modal "Mes demandes".
    case "driver_application_decided":
    case "driver_removed":
      return "/(tabs)/settings?section=my-applications";
    case "bonus":
      return "/(tabs)/notifications";
    default:
      return "/(tabs)/notifications";
  }
};

export const getNotificationIcon = (type?: string): string => {
  switch (type) {
    case "order_new":
      return "cart-outline";
    case "order_status":
      return "checkmark-circle-outline";
    case "order_cancel_by_user":
    case "order_cancel_by_merchant":
      return "close-circle-outline";
    case "order_rank_top":
      return "trophy-outline";
    case "order_delivering":
      return "bicycle-outline";
    case "driver_application":
      return "person-add-outline";
    case "driver_application_decided":
      return "document-text-outline";
    case "driver_removed":
      return "person-remove-outline";
    case "bonus":
      return "gift-outline";
    default:
      return "notifications-outline";
  }
};
