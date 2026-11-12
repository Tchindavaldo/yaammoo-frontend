import type { Notification } from "../context/NotificationContext";

/**
 * Notification destinee au MARCHAND (boutique) plutot qu'au client.
 * L'onglet Notifications n'affiche que celles du mode actif.
 */
const MERCHANT_TYPES = new Set(["order_new", "order_cancel_by_user", "driver_application"]);

export function isMerchantNotification(n: Notification): boolean {
  if (n.route && /boutique/.test(String(n.route))) return true;
  return MERCHANT_TYPES.has(String(n.type ?? "").toLowerCase());
}
