import { Commande } from "@/src/types";

/**
 * Clé de groupage d'une commande — règle unique, partagée par la liste marchand
 * (`OrderManagePanel.groupBySlot`) et l'onglet Montant du bottom sheet.
 *
 * Deux commandes se groupent si elles partagent le même client, la même DATE et :
 *   - programmée : même créneau (`delivery.time`) + même zone
 *   - express    : même zone
 *   - sur place  : rien de plus
 *
 * La date fait partie de la clé : sans elle, un même client verrait ses commandes
 * de jours différents fusionner (tout l'historique dans un seul groupe).
 */
export function orderGroupKey(order: Commande): string {
  const d = (order as any).delivery;
  const userKey = order.userId || order.userData?.email || order.id;
  const date = orderDateISO(order);
  const zone = d?.zone || d?.location || "";

  if (d?.status === true && d?.type !== "express" && d?.time) {
    return `${userKey}__${date}__slot__${d.time}__${zone}`;
  }
  if (d?.status === true && d?.type === "express") {
    return `${userKey}__${date}__express__${zone}`;
  }
  return `${userKey}__${date}__surplace`;
}

/** Date de rattachement d'une commande (YYYY-MM-DD) : livraison, sinon création. */
export function orderDateISO(order: Commande): string {
  const dateStr = order.delivery?.date || (order as any).createdAt || "";
  if (!dateStr) return new Date().toISOString().substring(0, 10);
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().substring(0, 10);
    return d.toISOString().substring(0, 10);
  } catch {
    return new Date().toISOString().substring(0, 10);
  }
}
