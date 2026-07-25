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

  // Express : le créneau n'entre pas en compte (livraison immédiate).
  if (d.type === "express") return `express|${fastFoodId}|${zone}`;

  // Période : zone ET créneau doivent coïncider.
  const time = d.time || d.hour || "";
  return `time|${fastFoodId}|${zone}|${d.date || ""}|${time}`;
};

/** Prix de livraison porté par une commande (0 si aucune / offerte). */
const deliveryPriceOf = (order: AnyOrder): number => {
  const d = deliveryOf(order);
  return Number(d?.prix) || 0;
};

/**
 * Total du panier = Σ des `total` de chaque commande (déjà HORS livraison)
 *                 + une seule livraison par groupe encore dû.
 *
 * Une commande dont la livraison est offerte (`bonusCode`) est EXCLUE du
 * groupement : elle ne paie rien et ne « consomme » pas la course du groupe.
 * Deux commandes même zone+créneau, dont une offerte, laissent donc l'autre
 * payer sa livraison normalement.
 *
 * `delivery.prix` reste envoyé au backend dans tous les cas (le livreur doit
 * être payé) ; il n'est simplement pas ajouté au montant débité quand l'offre
 * s'applique.
 */
export const computeCartTotal = (orders: AnyOrder[]): number => {
  if (!Array.isArray(orders) || orders.length === 0) return 0;

  const billed = new Set<string>();
  let total = 0;

  for (const order of orders) {
    total += Number(order?.total) || 0;

    // Livraison offerte → rien à facturer, et le groupe reste "non payé".
    if (order?.bonusCode) continue;

    const key = deliveryGroupKey(order);
    if (!key) continue;

    // Première commande payante du groupe → elle porte l'unique course.
    if (!billed.has(key)) {
      billed.add(key);
      total += deliveryPriceOf(order);
    }
  }

  return Number.isNaN(total) ? 0 : Math.max(0, total);
};
