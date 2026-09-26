import { PAGE_SIZE } from "../context/FastFoodContext";

// Réglages de la liste du home (`app/(tabs)/index.tsx`). Extraits tels quels
// de l'écran : chaque valeur a été mesurée, voir architecture/restaurants.md.

/**
 * Item 0 de la liste : la banniere. Objet constant (jamais recree) pour que la
 * memoisation de `listData` et les cles de la FlatList restent stables.
 */
export const BANNER_ITEM = { __banner: true as const, id: "__banner__" };

/**
 * Menus affiches du premier ecran : aligne sur `LIMIT_MENUS_ENABLED` /
 * `MAX_VISIBLE_MENUS` des designs. Le groupe du premier ecran n'attend que
 * des images montees : les menus caches ne se resolvant jamais, les attendre
 * bloquerait la revelation (puis le voile anti-scroll) jusqu'au garde-fou.
 */
export const FIRST_SCREEN_MENUS = 5;

/**
 * Hauteur du loader de pagination (`styles.footerLoader`). Volontairement
 * genereuse : le loader doit se remarquer meme en scroll rapide.
 */
export const FOOTER_LOADER_HEIGHT = 48;

/** Distance d'apparition du loader : visible AVANT le bas strict, donc
 *  toujours en premier par rapport aux elements nouvellement charges. */
export const LOADER_VISIBLE_DISTANCE = 120;

/**
 * Zone de pre-rendu de FlashList autour de l'ecran.
 *
 * 1600 et non 800 : a 800, en bas de la page 2 les rangees de la page 1
 * sortaient de la zone et leurs cellules partaient aux fantomes du bas ; en
 * remontant, chacune revenait par un rebind fantome -> vraie boutique
 * (squelette, images, fondu) : legere pause a chaque remontee.
 */
export const DRAW_DISTANCE = 1600;

/** Hauteur moyenne d'une rangee boutique (variantes 190 a 280 px + marges). */
export const ROW_HEIGHT_ESTIMATE = 270;

/**
 * Pre-rendu elargi au demarrage : monte d'un coup la reserve de cellules
 * qu'exige la zone de pre-rendu en regime (ecran + `DRAW_DISTANCE` de chaque
 * cote, ~4000 px), pendant que l'utilisateur regarde le premier ecran. Revenu
 * a `DRAW_DISTANCE`, FlashList garde ces cellules en reserve de recyclage.
 * Independant de `PAGE_SIZE` : c'est la zone, pas la page, qui fixe le besoin.
 */
export const WARMUP_DRAW_DISTANCE = 2 * DRAW_DISTANCE + 800;
export const WARMUP_MS = 1500;

/**
 * Fantomes tenus d'avance en bas de liste, calcules en PIXELS et non en
 * pages : la page suivante (`PAGE_SIZE`, remplie a l'arrivee des donnees)
 * PLUS assez de rangees pour remplir TOUTE la zone d'echauffement.
 *
 * ⚠️ Deux raisons, mesurees a la sonde `[ROW]` :
 * - la reserve de cellules ne peut pas depasser le nombre de rangees
 *   presentes a l'echauffement. Avec 9 fantomes, 13 cellules etaient
 *   creees alors que la zone en regime en demande ~16 : les 3 fantomes
 *   ajoutes au remplissage de la page 2 se MONTAIENT en plein scroll
 *   (`MONTAGE-CELL __ph_12..14`, la pause ressentie), pas a la page 3 ;
 * - les fantomes ajoutes apres chaque remplissage tombent ainsi loin hors
 *   de la zone de pre-rendu. Valable quel que soit `PAGE_SIZE`.
 */
export const GHOST_COUNT =
  PAGE_SIZE + Math.ceil(WARMUP_DRAW_DISTANCE / ROW_HEIGHT_ESTIMATE);

/**
 * Distance du bas a laquelle part le fetch : quand le PREMIER fantome entre
 * dans la zone de pre-rendu (tous les fantomes sont sous lui ; +90 = marge
 * basse de la liste). Les donnees arrivent donc en general avant que ses
 * squelettes soient a l'ecran.
 */
export const PLACEHOLDER_FETCH_DISTANCE = GHOST_COUNT * ROW_HEIGHT_ESTIMATE + 90;

/**
 * Calme exige avant de liberer le scroll (doigt leve depuis au moins ce
 * delai). Plus court qu'un intervalle entre deux glissements d'une rafale.
 */
export const UNLOCK_QUIET_MS = 350;

/** Vrai pour l'item banniere, faux pour une boutique. */
export const isBannerItem = (item: any) => item?.__banner === true;

export const CATEGORIES = [
  { name: "All", icon: "grid-outline" },
  { name: "Fast Food", icon: "fast-food-outline" },
  { name: "Pizza", icon: "pizza-outline" },
  { name: "Burger", icon: "nutrition-outline" },
  { name: "Drinks", icon: "beer-outline" },
  { name: "Rice", icon: "restaurant-outline" },
];
