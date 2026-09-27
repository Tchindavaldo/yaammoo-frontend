// ── Normalisation (partagée entre le fetch HTTP et l'injection socket) ──
//
// Fonctions pures, extraites telles quelles de `FastFoodContext` : utilisees
// par `hooks/useFastFoodFetch` (pages HTTP) et `hooks/useFastFoodSocketUpdates`
// (payloads socket).

/** Normalise un menu brut backend vers le format attendu par l'UI. */
export const normalizeMenu = (m: any) => {
  const menuImage =
    m.image ||
    m.coverImage ||
    (m.images && m.images.length > 0 ? m.images[0] : null);
  return {
    ...m,
    titre: m.titre || m.name || "Produit",
    prix1: m.prix1 || (m.prices && m.prices[0] ? m.prices[0].price : 0),
    prix2: m.prix2 || (m.prices && m.prices[1] ? m.prices[1].price : 0),
    prix3: m.prix3 || (m.prices && m.prices[2] ? m.prices[2].price : 0),
    optionPrix1:
      m.optionPrix1 || (m.prices && m.prices[0] ? m.prices[0].description : ""),
    optionPrix2:
      m.optionPrix2 || (m.prices && m.prices[1] ? m.prices[1].description : ""),
    optionPrix3:
      m.optionPrix3 || (m.prices && m.prices[2] ? m.prices[2].description : ""),
    // Prix bruts (hors marge) aplatis depuis `prices[]`, comme prix1/2/3.
    rawPrice1: m.prices?.[0]?.rawPrice,
    rawPrice2: m.prices?.[1]?.rawPrice,
    rawPrice3: m.prices?.[2]?.rawPrice,
    image: menuImage || "",
    images:
      m.images && m.images.length > 0 ? m.images : menuImage ? [menuImage] : [],
    disponibilite: m.disponibilite || m.status || "available",
  };
};

/** Normalise un fastfood brut backend (avec ses menus) vers le format UI. */
export const normalizeFastFood = (item: any, designIndex = 0) => {
  const RawMenu = item.menus || item.menu || [];
  const mappedMenu = RawMenu.map(normalizeMenu);
  const restaurantImage =
    item.image ||
    item.coverImage ||
    (item.images && item.images[0]) ||
    (mappedMenu.length > 0 ? mappedMenu[0].image : null);
  return {
    ...item,
    nom: item.nom || item.name || "Restaurant",
    image: restaurantImage || "",
    menu: mappedMenu,
    designIndex,
  };
};
