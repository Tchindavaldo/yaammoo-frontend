/**
 * Draft du menu en cours de création/modification.
 * Type partagé par les 3 designs de récapitulatif (read-only sur le draft).
 *
 * `MenuRecap` reçoit ce draft en props et l'affiche ; aucune mutation.
 */

export type Availability = "available" | "unavailable";

/** Item d'extra : nom, prix, quantité, disponibilité. */
export interface DraftItem {
  name: string;
  prix: string;
  quantite: string;
  status: boolean;
}

/** Un tarif du menu : montant + description associée. */
export interface DraftPrice {
  /** Montant en francs (string = valeur brute du champ texte). */
  price: string;
  /** Description du format (ex: "Petit format", "Format moyen"). */
  description: string;
}

/**
 * Snapshot du formulaire de création de menu, au moment du récapitulatif.
 * Toutes les valeurs sont dans leur forme brute (strings) — l'affichage
 * se charge du formatage (Number(...), "F", etc.).
 */
export interface MenuDraft {
  nom: string;
  /** N prix (plus limité à 3) ; les boissons appartiennent à la boutique. */
  prices: DraftPrice[];
  extras: DraftItem[];
  availability: Availability;
  stock: string;
  images: string[];
}

// ----- Sélecteurs utilitaires (données prêtes à afficher) -----

/** Prix valides (> 0) avec leur description. */
export const validPrices = (d: MenuDraft): DraftPrice[] =>
  d.prices.filter((p) => p.price && Number(p.price) > 0);

/** Extras dont le nom est renseigné. */
export const namedItems = (items: DraftItem[]) =>
  items.filter((i) => i.name.trim());
