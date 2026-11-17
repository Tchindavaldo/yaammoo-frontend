import { Notification } from "../context/NotificationContext";

/**
 * Route d'une notification. Commande client : `orderId` est ajouté pour que
 * l'onglet Commandes ouvre directement la fiche de CETTE commande, sur le
 * statut où elle se trouve réellement.
 */
export const getNotificationRoute = (notif: Partial<Notification> | null | undefined): string => {
  const route = baseRoute(notif);
  const orderId = (notif as any)?.orderId;
  if (orderId && route.startsWith("/(tabs)/orders")) {
    return `${route}${route.includes("?") ? "&" : "?"}orderId=${encodeURIComponent(orderId)}`;
  }
  return route;
};

/** Page Recherche pre-remplie (plat ou boutique). Jamais le home : y
 * selectionner une boutique depuis une notif cassait la liste. */
const searchRoute = (q: string) => `/search?q=${encodeURIComponent(q)}`;

const baseRoute = (notif: Partial<Notification> | null | undefined): string => {
  if (!notif) return "/(tabs)/notifications";
  // Notif liee a un plat ou une boutique : recherche sur le plat en priorite.
  const n = notif as any;
  const dish = n.menuName ?? n.dishName ?? n.menuTitle;
  if (dish) return searchRoute(String(dish));
  // `route` porté par la notif (backend). Peut être partiel ("settings?section=…")
  // → on préfixe "/(tabs)/" si ce n'est pas déjà un chemin absolu.
  const rawRoute = (notif as any).route;
  if (rawRoute) {
    // Les commandes client vivent désormais dans l'onglet « Commandes » : les
    // anciennes routes (settings / cart ?section=<statut>) y sont redirigées.
    const legacy = String(rawRoute).match(
      /(?:settings|cart)\?section=(pending|active|finished|delivered)/,
    );
    if (legacy) return `/(tabs)/orders?section=${legacy[1]}`;
    // Nouvelle commande (→ marchand) : page Commandes de la boutique (Profil),
    // pas l'onglet Commandes du client.
    if (/boutique/.test(String(rawRoute))) return "/(tabs)/boutique";
    // Ancienne route home `?shop=<nom>` : redirigee vers la page Recherche.
    const shop = String(rawRoute).match(/[?&]shop=([^&]+)/);
    if (shop) return searchRoute(decodeURIComponent(shop[1]));
    return rawRoute.startsWith("/") ? rawRoute : `/(tabs)/${rawRoute}`;
  }
  // Minuscules : le push `bonus.activation_changed` envoie `type: "Bonus"`.
  switch (String(notif.type ?? "").toLowerCase()) {
    case "order_new":
      return "/(tabs)/boutique";
    case "order_cancel_by_user":
    case "order_cancel_by_merchant":
      return "/(tabs)/notifications";
    case "order_status":
    case "order_delivering":
      return "/(tabs)/orders?section=finished";
    case "order_rank_top":
      return "/(tabs)/orders?section=pending";
    // Demande de livraison reçue (→ marchand) : ouvre le modal "Livreurs".
    case "driver_application":
      return "/shop/drivers";
    // Demande décidée (→ candidat) : ouvre le modal "Mes demandes".
    case "driver_application_decided":
    case "driver_removed":
      return "/(tabs)/settings?section=my-applications";
    // Bonus éligible / mis à jour → ouvre le modal Bonus (Settings).
    case "bonus":
      return "/(tabs)/settings?section=bonus";
    // Annonce d'une boutique → page Recherche sur le nom de la boutique.
    case "boutique_broadcast":
      return notif.shopName ? searchRoute(notif.shopName) : "/(tabs)/notifications";
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
    case "boutique_broadcast":
      return "megaphone-outline";
    default:
      return "notifications-outline";
  }
};
