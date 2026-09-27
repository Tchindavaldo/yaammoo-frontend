import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";

/** Nom + image d'une boutique, suffisants pour le filtre du panier. */
export interface CartFastFoodInfo {
  name?: string;
  image?: string;
}

// Cache module : une boutique n'est demandée qu'une fois par session.
const cache: Record<string, CartFastFoodInfo> = {};
const inFlight = new Set<string>();

/**
 * Complète les boutiques du panier ABSENTES du catalogue chargé sur le home
 * (pagination) via `GET /fastFood/:id`. Renvoie les infos récupérées, indexées
 * par id ; les boutiques déjà connues du home ne sont pas redemandées.
 */
export const useCartFastFoodInfos = (missingIds: string[]) => {
  const [infos, setInfos] = useState<Record<string, CartFastFoodInfo>>(() => ({
    ...cache,
  }));
  const key = missingIds.slice().sort().join(",");

  useEffect(() => {
    const todo = missingIds.filter((id) => !cache[id] && !inFlight.has(id));
    if (todo.length === 0) return;
    let alive = true;
    todo.forEach((id) => {
      inFlight.add(id);
      axios
        .get(`${Config.apiUrl}/fastFood/${id}`)
        .then((res) => {
          const d = res.data?.data ?? {};
          cache[id] = {
            name: d.name || d.nom,
            image: d.image || d.logo || d.coverImage,
          };
          if (alive) setInfos({ ...cache });
        })
        .catch((e) => {
          // Pas de toast : l'avatar retombe sur les initiales, rien de bloquant.
          console.warn("[cart] fastFood info indisponible", id, e?.message);
        })
        .finally(() => inFlight.delete(id));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return infos;
};
