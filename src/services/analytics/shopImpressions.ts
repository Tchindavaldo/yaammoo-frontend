import { AppState } from "react-native";
import { track } from "./analytics";

/**
 * Boutiques vues sur le home : la liste native signale l'ensemble des boutiques
 * visibles a 50 % (`onVisibleShops`), la FlashList ses `viewableItems`. Une
 * boutique qui QUITTE l'ecran produit un `shop_impression` avec le temps passe
 * visible (`visibleMs`), si ce temps depasse MIN_VISIBLE_MS (survol rapide au
 * scroll ignore). Arriere-plan / home quitte : tout ce qui est visible est clos.
 */

const MIN_VISIBLE_MS = 500;

type Visible = { since: number; position: number; page?: number };

const visible = new Map<string, Visible>();

const close = (id: string, v: Visible, at: number) => {
  const visibleMs = at - v.since;
  if (visibleMs < MIN_VISIBLE_MS) return;
  track("shop_impression", {
    fastFoodId: id,
    data: {
      position: v.position,
      visibleMs,
      ...(v.page ? { page: v.page } : {}),
    },
  });
};

/**
 * Nouvel ensemble visible. `pageOf(position)` donne la page du home qui porte
 * cette position (taille de page courante).
 */
export function setVisibleShops(
  ids: string[],
  positions: number[],
  pageOf?: (position: number) => number,
): void {
  const at = Date.now();
  const next = new Set(ids);
  for (const [id, v] of visible) {
    if (!next.has(id)) {
      close(id, v, at);
      visible.delete(id);
    }
  }
  ids.forEach((id, i) => {
    if (visible.has(id)) return;
    const position = positions[i] ?? 0;
    visible.set(id, { since: at, position, page: pageOf?.(position) });
  });
}

/** Home quitte (onglet, arriere-plan) : clot toutes les boutiques visibles. */
export function clearVisibleShops(): void {
  const at = Date.now();
  for (const [id, v] of visible) close(id, v, at);
  visible.clear();
}

AppState.addEventListener("change", (s) => {
  if (s !== "active") clearVisibleShops();
});
