import { Image } from "expo-image";
import type { AppBanner, FastFood } from "@/src/types";

/**
 * Precharge les images du home des que `/fastfood/all` a repondu.
 *
 * Pourquoi : sans ca, chaque carte ne lance son telechargement qu'au moment ou
 * elle se monte — donc au scroll, une par une, alors que toutes les URLs sont
 * connues des la reponse. Resultat : squelettes visibles longtemps a mesure que
 * l'utilisateur descend. Ici on remplit le cache disque en amont, pendant que
 * l'utilisateur regarde le haut de la page.
 *
 * Ordre : les bannieres d'abord (visibles immediatement), puis les premiers
 * menus de chaque boutique (au-dessus de la ligne de flottaison), puis le reste.
 *
 * Volontairement silencieux et non bloquant : un echec de prechargement n'est
 * pas une erreur — l'image sera simplement chargee normalement a l'affichage.
 */

/** Nombre de menus par boutique consideres comme « visibles rapidement ». */
const EAGER_PER_SHOP = 4;
/** Requetes de prechargement simultanees. Au-dela on sature le reseau. */
const CONCURRENCY = 6;

const seen = new Set<string>();

async function runPool(urls: string[]): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        await Image.prefetch(url, { cachePolicy: "memory-disk" });
      } catch {
        // Silencieux : l'image sera chargee normalement au rendu.
      }
    }
  });
  await Promise.all(workers);
}

export function prefetchHomeImages(
  fastFoods: FastFood[],
  banners?: AppBanner[] | null,
): void {
  const eager: string[] = [];
  const lazy: string[] = [];

  if (Array.isArray(banners)) {
    for (const b of banners) {
      if (b?.imageUrl) eager.push(b.imageUrl);
    }
  }

  for (const shop of fastFoods ?? []) {
    const menus = Array.isArray(shop?.menu) ? shop.menu : [];
    menus.forEach((m, i) => {
      if (!m?.image) return;
      (i < EAGER_PER_SHOP ? eager : lazy).push(m.image);
    });
  }

  // Une URL deja demandee dans cette session ne l'est pas deux fois (le refresh
  // du home renvoie le meme catalogue).
  const dedup = (list: string[]) =>
    list.filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });

  const first = dedup(eager);
  const rest = dedup(lazy);

  // Le lot prioritaire part tout de suite ; le reste enchaine derriere pour ne
  // pas concurrencer les images que l'utilisateur regarde deja.
  void runPool(first).then(() => runPool(rest));
}
