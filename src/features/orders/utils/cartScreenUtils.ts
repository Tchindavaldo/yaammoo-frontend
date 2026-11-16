// Utilitaires purs de l'ecran panier (`cart.tsx`), extraits pour R4.
import { Menu } from "@/src/types";
import { t } from "@/src/i18n";

/** Livraisons des commandes payees : message de la premiere incomplete, sinon null. */
export const validateCartDeliveries = (orders: any[]): string | null => {
  for (const order of orders) {
    const d = order.delivery as any;
    if (!d || !d.status || d.type === "aucune") continue;
    const menuName = (order.menu as any)?.name || (order.menu as any)?.titre || t("Commande");
    if (!d.location) return t("\"{{a}}\" : adresse de livraison requise", { a: menuName });
    if (!d.phone && !order.userData?.phoneNumber)
      return t("\"{{a}}\" : numéro de contact requis", { a: menuName });
    if (d.type === "time" && !d.time)
      return t("\"{{a}}\" : période de livraison requise", { a: menuName });
  }
  return null;
};

/**
 * Convertit la `Livraison` composée dans le sheet de livraison groupée vers
 * le format `delivery` d'une commande du panier (celui que lit
 * `sanitizeOrder` : `location` / `zone` / `time`, pas `address` /
 * `expressLieu` / `hour`).
 */
export const toOrderDelivery = (d: any) => {
  // Retrait : le numero de contact est exige par le backend ; le JOUR et
  // l'HEURE de retrait choisis sont transmis (sans eux, `sanitizeOrder`
  // retombait sur la date du jour).
  if (!d || d.type === "aucune")
    return {
      status: false,
      type: "aucune",
      ...(d?.phone && { phone: d.phone }),
      ...(d?.date && { date: d.date }),
      ...(d?.pickupTime && { time: d.pickupTime }),
    };
  const express = d.type === "express";
  return {
    status: true,
    // Le panier nomme "time" ce que le checkout appelle "standard".
    type: express ? "express" : "time",
    location: d.address || "",
    zone: express ? d.expressLieu || "" : d.address || "",
    phone: d.phone || "",
    prix: Number(express ? d.expressPrix : d.prix) || 0,
    ...(d.date && { date: d.date }),
    ...(!express && d.hour && { time: d.hour }),
    ...(d.voiceNoteUri && { voiceNoteUri: d.voiceNoteUri }),
    ...(d.note && { note: d.note }),
    ...(d.bonusCode && { bonusCode: d.bonusCode }),
  };
};

/** Menu reconstruit depuis une commande du panier, pour la reouvrir. */
export const synthesizeEditMenu = (order: any): Menu | null => {
  if (!order) return null;
  const p = order.menu.prices || [];
  return {
    id: order.menu.id,
    fastFoodId: order.fastFoodId,
    titre: order.menu.titre || order.menu.name || "",
    prix1: p[0]?.price || 0,
    prix2: p[1]?.price || 0,
    prix3: p[2]?.price || 0,
    optionPrix1: p[0]?.description || "Standard",
    optionPrix2: p[1]?.description || "Moyen",
    optionPrix3: p[2]?.description || "Grand",
    prices: p,
    image: order.menu.image || order.menu.coverImage || "",
    disponibilite: "active",
    images: order.menu.images || [order.menu.image || order.menu.coverImage || ""],
    extra: order.extra || [],
    drink: order.drink || [],
  } as Menu;
};
