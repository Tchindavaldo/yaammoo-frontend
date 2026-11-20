// Types et construction des donnees du sheet commande marchand (articles,
// utilisateur de livraison). Extrait de MerchantOrderBottomSheet (R4/R26),
// comportement inchange ; les types y sont reexportes.
import { Commande } from '@/src/types';
import { DS } from "@/src/theme/ds";
import { t as tr } from "@/src/i18n";
import { pickupLabel } from "@/src/features/checkout/utils/pickupHours";

export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
  type?: 'menu' | 'extra' | 'drink';
  /** Visuel du plat (type `menu` uniquement) : affiché à la place de l'icône. */
  image?: string;
};

export type DeliveryUser = {
  initials: string;
  name: string;
  addr: string;
  avColor: string;
  avTextColor: string;
  badgeColor: string;
  orderCount: number;
  rating: number;
  phone: string;
  creneau: string;
  duration: string;
  note: string;
  voiceNoteUri: string;
  zone: string;
  deliveryPrice: number;
  orders: OrderItem[];
};

// ─── Couleurs avatar ──────────────────────────────────────────────────────────
const COLORS = [
  { bg: '#EAF3DE', text: '#4B7C16', badge: '#7CB342' },
  { bg: DS.accentCream, text: '#A04000', badge: '#E67E22' },
  { bg: '#D6EAF8', text: '#1B4F72', badge: '#3498DB' },
  { bg: '#E8DAEF', text: '#512E5F', badge: '#8E44AD' },
];

// ─── Construit la liste des articles d'une commande ───────────────────────────
export function buildItems(order: Commande): OrderItem[] {
  const items: OrderItem[] = [];

  // Menu principal
  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice =
    order.menu?.prices?.[priceIdx]?.price ||
    order.menu?.prices?.[0]?.price ||
    (order.menu as any)?.prix1 ||
    0;
  items.push({
    name: order.menu?.titre || order.menu?.name || tr("Menu principal"),
    qty: order.quantity || 1,
    price: `${menuPrice * (order.quantity || 1)} XAF`,
    unitPrice: menuPrice,
    hasQty: true,
    type: 'menu',
    image: (order.menu as any)?.coverImage || (order.menu as any)?.image,
  });

  // Extras — uniquement ceux sélectionnés (status === true)
  (order.extra || []).forEach((ex: any) => {
    if (ex.status === true && ex.name && ex.name !== 'Aucun' && ex.name !== 'Aucune') {
      const p = ex.prix || ex.price || 0;
      items.push({ name: ex.name, qty: 1, price: `${p} XAF`, unitPrice: p, hasQty: false, type: 'extra' });
    }
  });

  // Boissons — uniquement celles sélectionnées (status === true)
  (order.drink || []).forEach((dr: any) => {
    if (dr.status === true && dr.name && dr.name !== 'Aucune' && dr.name !== 'Aucun') {
      const p = dr.prix || dr.price || 0;
      const q = dr.quantite || 1;
      items.push({ name: dr.name, qty: q, price: `${p * q} XAF`, unitPrice: p, hasQty: q > 1, type: 'drink' });
    }
  });

  return items;
}

// ─── Construit le DeliveryUser à partir d'une Commande ───────────────────────
export function buildUser(order: Commande): DeliveryUser {
  const first = order.userData?.firstName || 'Client';
  const last = order.userData?.lastName || '';
  const initials = `${first[0]}${last ? last[0] : ''}`.toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return {
    initials,
    name: `${first} ${last}`.trim(),
    addr: order.delivery?.location || tr("Adresse non spécifiée"),
    avColor: theme.bg,
    avTextColor: theme.text,
    badgeColor: theme.badge,
    orderCount: (order as any).rank || 1,
    rating: 4,
    phone: order.delivery?.phone || order.userData?.phoneNumber?.toString() || tr("Non fourni"),
    // Retrait : "Sur place · sam. 15 nov. · 14:30" (jour + heure de passage).
    creneau: !order.delivery?.status
      ? pickupLabel(order.delivery?.date, order.delivery?.time)
      : order.delivery?.type === 'express'
        ? 'Express'
        : tr("Période ({{a}})", { a: order.delivery?.time || tr("Dès que possible") }),
    duration: !order.delivery?.status
      ? tr("Immédiat")
      : order.delivery?.type === 'express' ? '15-20 min' : '30-45 min',
    note: order.delivery?.note || tr("Aucune note de livraison."),
    voiceNoteUri: order.delivery?.voiceNoteUri || '',
    zone: (order.delivery as any)?.zone || '',
    deliveryPrice: Number((order.delivery as any)?.prix) || 0,
    orders: buildItems(order),
  };
}

