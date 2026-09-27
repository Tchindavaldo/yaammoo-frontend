import { useEffect, useMemo, useState } from "react";
import { FILL_PLACEHOLDERS } from "../context/FastFoodContext";
import { makePlaceholders } from "../utils/pagePlaceholders";
import {
  BANNER_ITEM,
  DRAW_DISTANCE,
  FIRST_SCREEN_MENUS,
  GHOST_COUNT,
  WARMUP_DRAW_DISTANCE,
  WARMUP_MS,
} from "../utils/homeListConfig";

interface Params {
  fastFoods: any[];
  banners: any[] | undefined;
  hasMore: boolean;
  loading: boolean;
}

/**
 * Données de la FlashList du home : banniere en item 0, boutiques, fantomes de
 * la page suivante ; images du premier ecran a attendre ; zone de pre-rendu
 * (elargie au demarrage).
 */
export const useHomeListData = ({ fastFoods, banners, hasMore, loading }: Params) => {
  // Images que la banniere et la PREMIERE boutique vont charger. Elles sont
  // declarees au groupe AVANT que la FlatList ne monte quoi que ce soit : sans
  // ca, le groupe se scelle en ne connaissant que la banniere (le header monte
  // avant les cellules) et la laisse partir seule.
  const firstScreenUris = useMemo(() => {
    const first: any = fastFoods[0];
    return [
      banners?.[0]?.imageUrl,
      first?.image,
      ...((first?.menu ?? [])
        .slice(0, FIRST_SCREEN_MENUS)
        .map((m: any) => m?.image) as string[]),
    ].filter(Boolean) as string[];
  }, [banners, fastFoods]);

  // ⚠️ La banniere est un ITEM de la liste, plus un `ListHeaderComponent`.
  //
  // En header, elle vivait HORS de la virtualisation : toujours montee, et
  // ignoree de la fenetre de rendu. Deux regimes qui ne se coordonnaient pas —
  // `initialNumToRender` comptait des boutiques sans jamais compter les ~235 px
  // qu'elle occupe, si bien que la fenetre initiale s'arretait toujours trop
  // haut et qu'il restait une cellule a monter au premier geste.
  //
  // En item 0, la banniere entre dans la meme fenetre que les boutiques : la
  // liste connait enfin la hauteur reelle de son contenu et dimensionne son
  // rendu initial en consequence.
  // Pre-rendu elargi jusqu'a `WARMUP_MS` apres la premiere page (voir
  // `WARMUP_DRAW_DISTANCE`). Un seul changement d'etat, une seule fois.
  const [warmup, setWarmup] = useState(true);
  const hasFirstPage = fastFoods.length > 0;
  useEffect(() => {
    if (!hasFirstPage || !warmup) return;
    const t = setTimeout(() => setWarmup(false), WARMUP_MS);
    return () => clearTimeout(t);
  }, [hasFirstPage, warmup]);

  const listData = useMemo(() => {
    // Fantomes de la page suivante, montes d'avance en squelette (voir
    // `utils/pagePlaceholders`) : a l'arrivee des donnees, FlashList les
    // rebind au lieu de monter de nouvelles rangees — plus de pause.
    //
    // ⚠️ Fin de catalogue : fantomes RETIRES, pas replies. Replies a hauteur
    // 0, ils tombaient tous dans la zone de pre-rendu et FlashList leur
    // montait une cellule chacun d'un coup (9 `MONTAGE-CELL`, 1,4 s de JS en
    // dev a la derniere page). Retires, seules leurs cellules disparaissent,
    // et les rangees du dessus gardent les leurs (`DRAW_DISTANCE` 1600).
    const withGhosts =
      FILL_PLACEHOLDERS && hasMore && !loading && fastFoods.length > 0;
    const data = [
      BANNER_ITEM,
      ...fastFoods,
      ...(withGhosts ? makePlaceholders(fastFoods.length, GHOST_COUNT) : []),
    ];
    // SONDE : chaque recompute = les donnees ont change de reference. Si les
    // vagues REBIND/DEMONTAGE coincident avec ces lignes SANS scroll, le
    // coupable est le churn de donnees (socket/pagination), pas la liste.
    console.log(
      `[ROW] DATACHG n=${data.length} head=${data
        .slice(0, 4)
        .map((d: any) => String(d?.id ?? "?").slice(0, 4))
        .join(",")}`,
    );
    // SONDE : cles dupliquees = React ne distingue plus les cellules et
    // demonte/remonte au hasard a chaque mise a jour (pagination qui chevauche,
    // troncature + re-append). A retirer avec la sonde [ROW].
    const ids = data.map((d: any) => d?.id);
    if (new Set(ids).size !== ids.length) {
      console.log(
        `[ROW] DOUBLONS listData: ${data.length} items, ${new Set(ids).size} uniques`,
      );
    }
    return data;
  }, [fastFoods, hasMore, loading]);

  return {
    firstScreenUris,
    listData,
    drawDistance: warmup ? WARMUP_DRAW_DISTANCE : DRAW_DISTANCE,
  };
};
