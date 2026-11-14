/**
 * Zones EXPRESS d'une boutique (`fastfood.expressZones`, backend migration 073).
 *
 * L'express part des que la commande est prete : il n'a PAS d'heure. Ses zones
 * forment une seule liste par boutique, un prix par lieu — elles ne sont plus
 * rangees dans les creneaux `deliveryHours`. Lire « le premier lieu trouve »
 * dans les heures donnait deux prix possibles pour un meme lieu (l'app et le
 * backend ne cherchaient pas au meme endroit) : paiement refuse.
 *
 * Utilitaire PUR, partage entre les ecrans (R16 : seuls les composants se
 * dupliquent).
 */
export type ExpressZone = { lieu: string; prix: string };

/** Zones express exploitables : un lieu non vide, une fois chacun. */
export const expressZonesOf = (raw: unknown): ExpressZone[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ExpressZone[] = [];
  raw.forEach((z: any) => {
    const lieu = typeof z?.lieu === "string" ? z.lieu : "";
    const key = lieu.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ lieu, prix: z?.prix != null ? String(z.prix) : "" });
  });
  return out;
};

/** La boutique propose-t-elle l'express quelque part ? */
export const hasExpressZones = (raw: unknown): boolean => expressZonesOf(raw).length > 0;
