// Retrait sur place COMMUN a un lot de commandes du panier : meme jour et meme
// heure pour toutes. Sert au recap du panier (« SUR PLACE · jour · heure ») et
// au pre-remplissage du parcours groupe.
type AnyOrder = Record<string, any>;

export interface CommonPickup {
  date: string;
  time: string;
  /** Contact commun, "" si les commandes en ont des differents. */
  phone: string;
}

const deliveryOf = (o: AnyOrder) => o?.delivery || o?.livraison || null;

/** `null` des qu'une commande est livree ou que jour / heure different. */
export const commonPickup = (orders: AnyOrder[]): CommonPickup | null => {
  if (!orders.length) return null;
  const ds = orders.map(deliveryOf);
  if (ds.some((d) => !d || (d.status && d.type && d.type !== "aucune"))) return null;
  const { date, time } = ds[0];
  if (!date || !time) return null;
  if (ds.some((d) => d.date !== date || d.time !== time)) return null;
  const phone = ds.every((d) => d.phone === ds[0].phone) ? String(ds[0].phone || "") : "";
  return { date, time, phone };
};
