/**
 * Calcul du total panier avec MUTUALISATION des frais de livraison.
 *
 * Le user ne doit pas payer plusieurs fois la même livraison : deux commandes
 * livrées au même endroit (et au même moment pour le mode période) ne
 * représentent qu'un seul déplacement du livreur.
 *
 * Règle de regroupement — une seule fois le prix de livraison par groupe :
 *  - express  → même fastFoodId + même zone
 *  - période  → même fastFoodId + même zone ET même période (date + heure)
 *
 * Les commandes dont la livraison est offerte (bonusCode) ne portent déjà pas
 * de frais dans leur `total` : elles sont naturellement neutres ici.
 */

type AnyOrder = Record<string, any>;

const deliveryOf = (order: AnyOrder): AnyOrder | null =>
  order?.delivery || order?.livraison || null;

/**
 * Clé d'unicité d'une livraison. `null` = pas de livraison facturable
 * (pas de livraison, ou prix nul).
 */
export const deliveryGroupKey = (order: AnyOrder): string | null => {
  const d = deliveryOf(order);
  if (!d || !d.status || !d.type || d.type === "aucune") return null;
  if (!(Number(d.prix) > 0)) return null;

  const fastFoodId = order.fastFoodId || order.menu?.fastFoodId || "";
  const zone = d.zone || d.expressLieu || d.location || "";

  // Express : pas de créneau (la course part dès que c'est prêt), mais la DATE
  // compte quand même — deux jours différents sont deux déplacements.
  if (d.type === "express") return `express|${fastFoodId}|${zone}|${d.date || ""}`;

  // Période : zone, date ET créneau doivent coïncider.
  const time = d.time || d.hour || "";
  return `time|${fastFoodId}|${zone}|${d.date || ""}|${time}`;
};

/** Prix de livraison porté par une commande (0 si aucune / offerte). */
const deliveryPriceOf = (order: AnyOrder): number => {
  const d = deliveryOf(order);
  return Number(d?.prix) || 0;
};

/**
 * Total du panier = Σ des `total` de chaque commande (livraison INCLUSE)
 *                 − les livraisons comptées en double dans un même groupe.
 *
 * ⚠️ Le `total` d'une commande contient DÉJÀ ses frais de livraison
 * (plat 1000 + livraison 250 → `total` 1250). Sommer les `total` revient donc à
 * facturer UNE course PAR COMMANDE. Or un groupe de N commandes ne représente
 * qu'UN déplacement : il faut retirer les `N − 1` courses en trop.
 *
 * C'est exactement le calcul du backend (`validatePaymentAmount.js`) ; toute
 * divergence ici fait refuser le paiement pour « montant incohérent ».
 *
 * > Ne PAS remplacer la déduction par un simple « ajouter une course par
 * > groupe » : ça supposerait des `total` hors livraison, ce qu'ils ne sont pas.
 *
 * Une commande dont la livraison est offerte (`bonusCode`) ne porte pas de frais
 * dans son `total` : elle est exclue du groupement — rien à déduire pour elle, et
 * elle ne « consomme » pas la course du groupe.
 *
 * `delivery.prix` reste envoyé au backend dans tous les cas (le livreur doit
 * être payé) ; il n'est simplement pas facturé deux fois au client.
 */
export const computeCartTotal = (orders: AnyOrder[]): number => {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  const groups = new Map<string, AnyOrder[]>();
  let total = 0;

  for (const order of orders) {
    // Le `total` porte déjà sa propre livraison.
    total += Number(order?.total) || 0;

    // Livraison offerte → aucun frais dans son total, rien à mutualiser.
    if (order?.bonusCode) continue;

    const key = deliveryGroupKey(order);
    if (!key) continue;

    const group = groups.get(key);
    if (group) group.push(order);
    else groups.set(key, [order]);
  }

  // Un groupe de N commandes = 1 seule course : on retire les N − 1 en trop.
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    total -= (group.length - 1) * deliveryPriceOf(group[0]);
  }

  return Number.isNaN(total) ? 0 : Math.max(0, total);
};
