import { Commande } from "@/src/types";

/** Ligne de l'onglet « Commandes » du détail client (`OrderBottomSheet`). */
export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
  type?: string;
  /** Visuel du plat (type "menu") : remplit la case d'icône. */
  image?: string;
};

/**
 * Plat + extras cochés + boissons cochées d'une commande, dans l'ordre
 * d'affichage. Les placeholders « Aucun » / « Aucune » sont exclus.
 */
export const buildOrderItems = (order: Commande | null): OrderItem[] => {
  if (!order) return [];
  const extras = order.extra || [];
  const drinks = order.drink || [];
  const items: OrderItem[] = [];

  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice =
    order.menu?.prices?.[priceIdx]?.price || order.menu?.prices?.[0]?.price || 0;
  items.push({
    name: order.menu?.titre || order.menu?.name || "Menu principal",
    qty: order.quantity || 1,
    price: `${menuPrice * (order.quantity || 1)} F`,
    unitPrice: menuPrice,
    hasQty: true,
    type: "menu",
    image: (order.menu as any)?.coverImage || (order.menu as any)?.image,
  });

  extras.forEach((ex: any) => {
    if (ex.status === true && ex.name !== "Aucun") {
      const exPrice = ex.prix || ex.price || 0;
      items.push({
        name: ex.name,
        qty: 1,
        price: `${exPrice} F`,
        unitPrice: exPrice,
        hasQty: false,
        type: "extra",
      });
    }
  });

  drinks.forEach((dr: any) => {
    if (dr.status === true && dr.name !== "Aucune") {
      const drPrice = dr.prix || dr.price || 0;
      const drQty = dr.quantite || 1;
      items.push({
        name: dr.name,
        qty: drQty,
        price: `${drPrice * drQty} F`,
        unitPrice: drPrice,
        hasQty: true,
        type: "drink",
      });
    }
  });
  return items;
};
