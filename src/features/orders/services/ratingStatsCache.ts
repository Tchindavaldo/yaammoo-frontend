/**
 * Cache mémoire (module) des stats de notation (plat & livreur), clé par
 * commande. Évite de revoir le loader à chaque entrée dans la tab Livreur/Noter :
 * la 1ʳᵉ ouverture fait le GET et remplit le cache, les suivantes servent le
 * cache instantanément (avec un refetch silencieux en arrière-plan).
 *
 * Les sockets menuRatingUpdated / driverRatingUpdated mettent à jour la note
 * moyenne en direct dans ce cache (voir patchRating).
 */

// Valeur cachée : le "profile" (menu ou driver) déjà mappé, tel qu'affiché.
type CachedEntry<T> = { data: T; at: number };

const store = new Map<string, CachedEntry<any>>();

/** Clé unique par (type, id, orderId). */
function key(kind: "menu" | "driver", id: string, orderId: string) {
  return `${kind}:${id}:${orderId}`;
}

export const ratingStatsCache = {
  get<T>(kind: "menu" | "driver", id: string, orderId: string): T | undefined {
    return store.get(key(kind, id, orderId))?.data as T | undefined;
  },

  set<T>(kind: "menu" | "driver", id: string, orderId: string, data: T) {
    store.set(key(kind, id, orderId), { data, at: Date.now() });
  },

  /**
   * Met à jour ratingAvg / ratingCount de TOUTES les entrées d'un plat/livreur
   * (toutes commandes confondues) — appelé par les sockets *RatingUpdated.
   */
  patchRating(
    kind: "menu" | "driver",
    id: string,
    ratingAvg?: number,
    ratingCount?: number,
  ) {
    const prefix = `${kind}:${id}:`;
    for (const [k, entry] of store) {
      if (!k.startsWith(prefix)) continue;
      entry.data = {
        ...entry.data,
        ...(ratingAvg != null ? { ratingAvg } : {}),
        ...(ratingCount != null ? { ratingCount } : {}),
      };
    }
  },

  /** Purge une entrée (ex: après que l'user note → forcer un refetch). */
  invalidate(kind: "menu" | "driver", id: string, orderId: string) {
    store.delete(key(kind, id, orderId));
  },
};
