import { track } from "./analytics";

/**
 * Scroll du home : une page de boutiques recue = `home_page_loaded`, avec son
 * rang (1 = premiere page) et le temps passe sur les pages deja chargees avant
 * de declencher celle-ci (`msSincePrevious`). Une recherche ne compte pas
 * comme du scroll : elle produit un `search` (terme + nombre de resultats).
 */

let page = 0;
let previousAt = 0;

/** Page du home qui porte la position `position` (taille de page `pageSize`). */
export const homePageOf = (position: number, pageSize: number) =>
  Math.floor(position / Math.max(1, pageSize)) + 1;

/** Reponse de `GET /fastFood/all` appliquee. `cursor` absent = premiere page. */
export function trackHomePage(
  isFirstPage: boolean,
  itemsCount: number,
  query?: string,
): void {
  if (query) {
    if (isFirstPage) {
      track("search", { data: { query: query.slice(0, 120), resultsCount: itemsCount } });
    }
    return;
  }
  const at = Date.now();
  page = isFirstPage ? 1 : page + 1;
  track("home_page_loaded", {
    data: {
      page,
      itemsCount,
      ...(page > 1 && previousAt ? { msSincePrevious: at - previousAt } : {}),
    },
  });
  previousAt = at;
}
