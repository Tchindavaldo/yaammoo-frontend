import { Image } from "expo-image";
import type { AppBanner, FastFood } from "@/src/types";

/**
 * Precharge les images du home DANS L'ORDRE D'AFFICHAGE, boutique par boutique.
 *
 * Pourquoi pas tout d'un coup : le catalogue represente ~24 Mo. Les lancer
 * ensemble sature la connexion pour des images que l'utilisateur ne verra
 * peut-etre jamais, et retarde justement celles qu'il a sous les yeux.
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

/**
 * Journalise le poids des images prechargees (bannieres + par boutique).
 * `__DEV__` uniquement : chaque mesure coute une requete HEAD supplementaire,
 * hors de question de la payer en production.
 */
const LOG_SIZES = __DEV__;

/** Poids d'une image via HEAD. `null` si le serveur ne renvoie pas la taille. */
async function weighKb(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const len = res.headers.get("content-length");
    return len ? Math.round(parseInt(len, 10) / 1024) : null;
  } catch {
    return null;
  }
}

/** Mesure un lot et l'affiche : total, moyenne, et le detail par fichier. */
async function logGroup(label: string, urls: string[]): Promise<void> {
  const sizes = await Promise.all(urls.map(weighKb));
  const known = sizes.filter((s): s is number => s !== null);
  const total = known.reduce((a, b) => a + b, 0);
  const avg = known.length ? Math.round(total / known.length) : 0;
  console.log(
    `[prefetch] ${label} — ${urls.length} image(s), ${total} Ko total, ${avg} Ko en moyenne`,
  );
  urls.forEach((u, i) => {
    const kb = sizes[i];
    const name = u.split("/").pop()?.slice(0, 44) ?? u;
    console.log(`[prefetch]    ${kb === null ? "  ?" : String(kb).padStart(5)} Ko  ${name}`);
  });
}

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
    let grandTotal = 0;

    // 1. Les bannieres : c'est le premier bloc visible du home.
    const bannerUrls = pending((banners ?? []).map((b) => b?.imageUrl));
    if (bannerUrls.length) {
      if (LOG_SIZES) await logGroup("BANNIERES", bannerUrls);
      await loadBatch(bannerUrls, myRun);
      grandTotal += bannerUrls.length;
    }

    // 2. Les boutiques, dans l'ordre du tableau = ordre d'affichage. Chaque
    //    boutique attend la fin de la precedente : la file avance au rythme ou
    //    l'utilisateur descend, sans jamais tout mettre en vol.
    for (const [i, shop] of (fastFoods ?? []).entries()) {
      if (myRun !== runId) return;
      const menus = Array.isArray(shop?.menu) ? shop.menu : [];
      const urls = pending(menus.map((m: any) => m?.image));
      if (!urls.length) continue;
      if (LOG_SIZES) {
        const name = (shop as any)?.nom || (shop as any)?.name || "sans nom";
        await logGroup(`#${i} ${name}`, urls);
      }
      await loadBatch(urls, myRun);
      grandTotal += urls.length;
    }

    if (LOG_SIZES) {
      console.log(`[prefetch] termine — ${grandTotal} image(s) prechargee(s)`);
    }
  })();
}
