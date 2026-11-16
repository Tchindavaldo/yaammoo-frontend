// Filtres de la page de recherche : mêmes catégories que les tabs du home
// (`CATEGORIES`, homeListConfig.ts), repérées par leur POSITION (le nom est
// traduit). Le backend ne filtre pas par catégorie : on filtre ici sur le nom
// du plat, par mots-clés.

/** Mots-clés par position dans `CATEGORIES` (0 = « Tout », sans filtre). */
const CATEGORY_KEYWORDS: (RegExp | null)[] = [
  null,
  /poulet|chicken/i,
  /burger/i,
  /pizza/i,
];

/** Position du tab « Autre » : plats qui ne tombent dans aucune autre categorie. */
const OTHER_INDEX = 4;

export const matchesCategory = (title: string, categoryIndex: number): boolean => {
  if (categoryIndex === OTHER_INDEX) return !CATEGORY_KEYWORDS.some((re) => re?.test(title));
  const re = CATEGORY_KEYWORDS[categoryIndex];
  return !re || re.test(title);
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Vrai si CHAQUE mot saisi (même partiel : « pou » pour poulet) apparaît dans
 * le plat, sa description ou la boutique. Sans accents ni casse.
 */
export const matchesQuery = (
  title: string,
  shopName: string,
  query: string,
  description = "",
): boolean => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = normalize(`${title} ${shopName} ${description}`);
  return words.every((w) => hay.includes(w));
};
