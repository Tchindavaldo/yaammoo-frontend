import type { Notification } from "../context/NotificationContext";

/**
 * Notification destinee au MARCHAND (boutique) plutot qu'au client.
 * Source : `audience` pose par le backend. Notifications plus anciennes (sans
 * `audience`) : deduit du type.
 */
const LEGACY_MERCHANT_TYPES = new Set(["order_new", "order_cancel_by_user", "driver_application", "pricing_alert"]);

export function isMerchantNotification(n: Notification): boolean {
  if (n.audience) return n.audience === "merchant";
  if (n.route && /boutique/.test(String(n.route))) return true;
  return LEGACY_MERCHANT_TYPES.has(String(n.type ?? "").toLowerCase());
}
