// Filtres de la page de recherche : mêmes catégories que les tabs du home
// (`CATEGORIES`, homeListConfig.ts), repérées par leur POSITION (le nom est
// traduit). Le backend ne filtre pas par catégorie : on filtre ici sur le nom
// du plat, par mots-clés.

/** Mots-clés par position dans `CATEGORIES` (0 = « Tout », sans filtre). */
const CATEGORY_KEYWORDS: (RegExp | null)[] = [
  null,
  /burger|pizza|shawarma|frite|poulet|sandwich|tacos|hot ?dog|nugget|panini|chicken/i,
  /pizza/i,
  /burger/i,
  /boisson|jus|soda|coca|fanta|bi[eè]re|eau|cocktail|caf[eé]|th[eé]|milk|drink/i,
  /riz|rice/i,
];

export const matchesCategory = (title: string, categoryIndex: number): boolean => {
  const re = CATEGORY_KEYWORDS[categoryIndex];
  return !re || re.test(title);
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vrai si la saisie apparaît dans le plat OU dans le nom de la boutique. */
export const matchesQuery = (title: string, shopName: string, query: string): boolean => {
  const q = normalize(query.trim());
  if (!q) return true;
  return normalize(title).includes(q) || normalize(shopName).includes(q);
};
