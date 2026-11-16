import { Config } from "@/src/api/config";
import { onFastfoodsRefresh, onFastfoodsRemove } from "@/src/services/fastfoodRefreshBus";
import { getOptionalIdToken } from "@/src/services/idToken";
import type { FastFood } from "@/src/types";
import axios from "axios";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

/** Regroupe les demandes rapprochees (plusieurs events d'un meme lot). */
const COALESCE_MS = 300;
/** Plafond backend de `?ids=` (MAX_LIMIT de GET /fastfood/all). */
const MAX_IDS = 50;

interface Params {
  setFastFoods: Dispatch<SetStateAction<FastFood[]>>;
  upsertFastFoodFromSocket: (fastFood: any) => void;
  refreshLoadedSilently: () => Promise<void>;
}

/**
 * Applique les signaux de `fastfoodRefreshBus` qui n'ont pas de donnees
 * (les boutiques modifiees par l'API arrivent deja completes via `fastfoodUpdated`) :
 * - retrait (`fastfoodsHidden`) : la boutique sort de la liste, sans requete ;
 * - `null` (reglage global, interrupteur plateforme) : toutes les boutiques
 *   chargees, via `refreshLoadedSilently` ;
 * - une liste : `GET /fastfood/all?ids=…` avec le jeton du user (offre de
 *   livraison, regime effectif, prix affiches). Une boutique demandee mais
 *   absente de la reponse n'est plus visible au home : elle sort de la liste.
 *
 * Aucun calcul de prix ici : on remplace par ce que renvoie le backend.
 */
export function useFastFoodRefreshByIds({
  setFastFoods,
  upsertFastFoodFromSocket,
  refreshLoadedSilently,
}: Params) {
  const pending = useRef<{ all: boolean; ids: Set<string> }>({ all: false, ids: new Set() });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deps = useRef({ setFastFoods, upsertFastFoodFromSocket, refreshLoadedSilently });
  deps.current = { setFastFoods, upsertFastFoodFromSocket, refreshLoadedSilently };

  useEffect(() => {
    const flush = async () => {
      timer.current = null;
      const { all, ids } = pending.current;
      pending.current = { all: false, ids: new Set() };
      const d = deps.current;
      if (all) {
        await d.refreshLoadedSilently().catch(() => {});
        return;
      }
      const list = [...ids];
      for (let i = 0; i < list.length; i += MAX_IDS) {
        const chunk = list.slice(i, i + MAX_IDS);
        try {
          const idToken = await getOptionalIdToken();
          const response: any = await axios.get(`${Config.apiUrl}/fastFood/all`, {
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
            params: { ids: chunk.join(",") },
          });
          const items: any[] = Array.isArray(response?.data?.data) ? response.data.data : [];
          items.forEach((ff) => d.upsertFastFoodFromSocket(ff));
          const returned = new Set(items.map((ff) => String(ff?.id)));
          const gone = new Set(chunk.filter((id) => !returned.has(id)));
          if (gone.size) d.setFastFoods((prev) => prev.filter((ff) => !gone.has(String(ff.id))));
        } catch (e: any) {
          console.warn("[fastfoodRefresh] rechargement impossible :", e?.message);
        }
      }
    };

    const off = onFastfoodsRefresh((ids) => {
      if (ids === null) pending.current.all = true;
      else ids.forEach((id) => pending.current.ids.add(id));
      if (!timer.current) timer.current = setTimeout(flush, COALESCE_MS);
    });
    const offRemove = onFastfoodsRemove((ids) => {
      const gone = new Set(ids);
      deps.current.setFastFoods((prev) => prev.filter((ff) => !gone.has(String(ff.id))));
    });
    return () => {
      off();
      offRemove();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);
}
