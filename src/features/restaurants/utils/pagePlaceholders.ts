/**
 * Boutiques FANTOMES de la page suivante, affichees d'avance en bas du home.
 *
 * Probleme : inserer une page = MONTER de nouvelles rangees (40-50 ms de commit
 * natif chacune, cf. sonde `[ROW]`), ce qui produisait la pause au scroll.
 *
 * Ici les rangees de la page suivante sont deja montees, en squelette, AVANT le
 * fetch. Chaque fantome porte le `designIndex` de la position qu'occupera la
 * vraie boutique : meme variante, meme type de cellule (`getItemType`), donc
 * EXACTEMENT le meme gabarit que la carte qui arrivera. A l'arrivee des donnees,
 * FlashList REUTILISE ces cellules (simple rebind) au lieu d'en creer : plus de
 * montage au moment de l'insertion.
 *
 * Le squelette est tenu par `ShopRevealProvider` (`hold`) tant que la cellule
 * porte un fantome : aucun contenu vide ne transparait.
 */

/** Cartes menu par fantome (la plupart des boutiques en ont au moins autant). */
export const PLACEHOLDER_MENUS = 3;

const PREFIX = "__ph_";

export const isPlaceholder = (item: any) => item?.__placeholder === true;

const cache = new Map<number, any>();

/**
 * Fantome de la boutique au rang `pos` (rang de BOUTIQUE, banniere exclue).
 * ⚠️ Identite STABLE par rang (cache) : un objet neuf a chaque rendu casserait
 * le `memo` de `DesignRouter` et re-rendrait les fantomes pour rien.
 */
const placeholderAt = (pos: number) => {
  let ph = cache.get(pos);
  if (!ph) {
    ph = {
      __placeholder: true,
      id: `${PREFIX}${pos}`,
      designIndex: pos % 6,
      nom: "",
      image: null,
      stats: null,
      menu: Array.from({ length: PLACEHOLDER_MENUS }, (_, k) => ({
        id: `${PREFIX}${pos}_${k}`,
        titre: "",
        prix1: 0,
        image: null,
      })),
    };
    cache.set(pos, ph);
  }
  return ph;
};

/** Fantomes des rangs `start` a `start + count - 1`. */
export const makePlaceholders = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => placeholderAt(start + i));
