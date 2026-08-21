import { Image } from "expo-image";
import type { AppBanner, FastFood } from "@/src/types";

/**
 * Precharge les images du home DANS L'ORDRE D'AFFICHAGE, boutique par boutique.
 *
 * Pourquoi pas tout d'un coup : les lancer ensemble sature la connexion pour
 * des images que l'utilisateur ne verra peut-etre jamais, et retarde justement
 * celles qu'il a sous les yeux. Le backend sert desormais du WebP (~30 Ko par
 * carte, ~150 Ko par banniere), mais le principe reste : on charge ce qui va
 * etre vu, dans l'ordre ou ce sera vu.
 *
 * Pourquoi pas un declenchement au scroll : l'ordre est deja connu. La FlatList
 * rend `fastFoods` dans l'ordre du tableau, donc l'index 0 est la premiere
 * boutique vue, l'index 1 la suivante, etc. Une file sequentielle suit
 * naturellement la descente, sans avoir a observer la position de scroll.
 *
 * Regle : **un seul lot en vol a la fois**. On n'attaque la boutique suivante
 * qu'une fois la precedente terminee — sinon les requetes s'accumulent et on
 * retombe sur le telechargement massif qu'on cherche a eviter.
 *
 * Silencieux et non bloquant : un echec de prechargement n'est pas une erreur,
 * l'image sera simplement chargee au moment de l'affichage.
 */

/** Images chargees en parallele A L'INTERIEUR d'une meme boutique. */
const CONCURRENCY = 3;

/** URLs deja demandees dans cette session (le refresh renvoie le meme catalogue). */
const seen = new Set<string>();

/** Une seule file active : un nouveau fetch annule la precedente. */
let runId = 0;

async function loadBatch(urls: string[], myRun: number): Promise<void> {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, urls.length) },
    async () => {
      while (cursor < urls.length) {
        // Le catalogue a ete rafraichi entre-temps : cette file est obsolete.
        if (myRun !== runId) return;
        const url = urls[cursor++];
        try {
          await Image.prefetch(url, { cachePolicy: "memory-disk" });
        } catch {
          // Silencieux : l'image sera chargee normalement au rendu.
        }
      }
    },
  );
  await Promise.all(workers);
}

function pending(urls: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  for (const u of urls) {
    if (typeof u !== "string" || !u) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function prefetchHomeImages(
  fastFoods: FastFood[],
  banners?: AppBanner[] | null,
): void {
  const myRun = ++runId;

  void (async () => {
    // 1. Les bannieres : c'est le premier bloc visible du home.
    const bannerUrls = pending((banners ?? []).map((b) => b?.imageUrl));
    if (bannerUrls.length) await loadBatch(bannerUrls, myRun);

    // 2. Les boutiques, dans l'ordre du tableau = ordre d'affichage. Chaque
    //    boutique attend la fin de la precedente : la file avance au rythme ou
    //    l'utilisateur descend, sans jamais tout mettre en vol.
    for (const shop of fastFoods ?? []) {
      if (myRun !== runId) return;
      const menus = Array.isArray(shop?.menu) ? shop.menu : [];
      const urls = pending(menus.map((m: any) => m?.image));
      if (!urls.length) continue;
      await loadBatch(urls, myRun);
    }
  })();
}
