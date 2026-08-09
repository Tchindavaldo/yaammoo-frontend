import { deliveryGroupKey } from "@/src/features/checkout/utils/cartDeliveryTotal";

type AnyOrder = Record<string, any>;

export interface CartOrderEntry {
  order: AnyOrder;
  /** Titre du menu commandé. */
  titre: string;
  quantite: number;
  /** Total de la commande (livraison incluse, comme `order.total`). */
  prix: number;
}

export interface CartZoneGroup {
  /** Clé de regroupement : type + zone + heure. */
  key: string;
  /** Type de livraison : "express", "time", ou "aucune" (retrait). */
  type: string;
  /** Lieu de livraison, "Retrait en boutique" si aucune livraison. */
  zone: string;
  /** Heure du créneau, null en express ou en retrait. */
  heure: string | null;
  entries: CartOrderEntry[];
  /** Somme des commandes du groupe, livraison mutualisée (comptée une fois). */
  total: number;
  /** Total hors frais de livraison (`total - livraison`). */
  articles: number;
  /** Frais de livraison réellement facturés au groupe. */
  livraison: number;
}

const deliveryOf = (order: AnyOrder): AnyOrder | null =>
  order?.delivery || order?.livraison || null;

const titreOf = (order: AnyOrder): string =>
  order?.menu?.titre || order?.menu?.name || "Commande";

/**
 * Regroupe les commandes du panier par TYPE de livraison + ZONE + heure, sans
 * distinguer la boutique ni la date : toutes les commandes livrées de la même
 * façon au même endroit tombent dans un seul tableau.
 *
 * ⚠️ Ce regroupement est un regroupement d'AFFICHAGE. Il est volontairement plus
 * large que `deliveryGroupKey` (checkout/utils/cartDeliveryTotal), qui inclut en
 * plus `fastFoodId` et la date parce qu'il décrit un déplacement de livreur
 * facturable. Le total de chaque groupe est donc calculé en mutualisant SUR LA
 * CLÉ DE FACTURATION à l'intérieur du groupe, pour que la somme des groupes
 * reste égale à `computeCartTotal` (le montant envoyé au backend).
 *
 * Groupes triés du plus petit au plus grand nombre de commandes, puis par zone,
 * pour un affichage stable (même convention que `groupZonesByLieu`).
 */
export const groupCartOrdersByZone = (orders: AnyOrder[]): CartZoneGroup[] => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const groups: CartZoneGroup[] = [];
  const byKey = new Map<string, CartZoneGroup>();

  orders.forEach((order) => {
    const d = deliveryOf(order);
    const hasDelivery = !!d && d.status && d.type && d.type !== "aucune";

    const type = hasDelivery ? String(d.type) : "aucune";
    const zone = hasDelivery
      ? d.zone || d.expressLieu || d.location || "Zone non renseignée"
      : "Retrait en boutique";
    const heure =
      hasDelivery && type !== "express" ? d.time || d.hour || null : null;

    const key = `${type}|${zone}|${heure || ""}`;

    let group = byKey.get(key);
    if (!group) {
      group = { key, type, zone, heure, entries: [], total: 0, articles: 0, livraison: 0 };
      byKey.set(key, group);
      groups.push(group);
    }

    group.entries.push({
      order,
      titre: titreOf(order),
      quantite: Number(order?.quantite ?? order?.quantity) || 1,
      prix: Number(order?.total) || 0,
    });
  });

  groups.forEach((g) => {
    const { total, articles, livraison } = groupTotal(g.entries);
    g.total = total;
    g.articles = articles;
    g.livraison = livraison;
  });

  return groups.sort(
    (a, b) => a.entries.length - b.entries.length || a.zone.localeCompare(b.zone),
  );
};

/**
 * Total d'un groupe d'affichage : Σ des `total` moins les livraisons comptées en
 * double. Le `total` d'une commande inclut déjà sa propre livraison, donc pour
 * chaque course réellement mutualisable (même `deliveryGroupKey`, donc même
 * boutique/date) on retire les `N − 1` en trop. Même règle que `computeCartTotal`.
 *
 * Renvoie aussi `livraison` = les frais réellement facturés (une course par
 * groupe de facturation), et `articles` = le total hors livraison. Ces deux
 * valeurs alimentent le pied de tableau ; `articles + livraison === total`.
 */
const groupTotal = (
  entries: CartOrderEntry[],
): { total: number; articles: number; livraison: number } => {
  let total = 0;
  const courses = new Map<string, AnyOrder[]>();

  for (const e of entries) {
    total += e.prix;
    // Livraison offerte : aucun frais dans son total, rien à mutualiser.
    if (e.order?.bonusCode) continue;
    const key = deliveryGroupKey(e.order);
    if (!key) continue;
    const list = courses.get(key);
    if (list) list.push(e.order);
    else courses.set(key, [e.order]);
  }

  let livraison = 0;
  for (const list of courses.values()) {
    const prix = Number(deliveryOf(list[0])?.prix) || 0;
    // Une seule course facturée par groupe : on retire les N − 1 en trop.
    total -= (list.length - 1) * prix;
    livraison += prix;
  }

  total = Math.max(0, total);
  return { total, articles: Math.max(0, total - livraison), livraison };
};
