import React from "react";
import { REVEAL_MS, useShopReveal } from "./ShopRevealContext";

/**
 * Verrou de REVELATION d'une page inseree en bas du home.
 *
 * `insertLock` fige le scroll pendant l'insertion d'une page. Il etait libere au
 * premier agrandissement du contenu (`onContentSizeChange`) — c'est-a-dire des
 * que les SQUELETTES etaient poses. Les images arrivaient ensuite, pendant que
 * l'utilisateur defilait deja : la revelation (decodage + fondu) tombait en
 * plein geste et produisait la micro-pause que le verrou devait justement
 * eviter.
 *
 * Ce module retarde la liberation jusqu'a ce que CHAQUE boutique montee de la
 * nouvelle page soit revelee (`ShopRevealContext.ready`) ET que son fondu soit
 * termine. Une boutique de la page non montee (hors `drawDistance`) n'est pas
 * attendue : elle ne peut pas se reveler tant qu'on ne defile pas.
 *
 * Filet de securite : le timer `INSERT_LOCK_SAFETY_MS` du `FastFoodContext`
 * libere quoi qu'il arrive (image muette).
 */

type Gate = {
  /** Cellule montee pour cette boutique (useLayoutEffect : avant le layout). */
  mounted: (id: string) => void;
  /** Cellule demontee ou recyclee vers une autre boutique. */
  unmounted: (id: string) => void;
  /** Boutique revelee (images decodees, fondu lance). */
  revealed: (id: string) => void;
};

const PageRevealGateContext = React.createContext<Gate | null>(null);

export const PageRevealGateProvider = PageRevealGateContext.Provider;

export function usePageRevealGate(onRelease: () => void) {
  const onReleaseRef = React.useRef(onRelease);
  onReleaseRef.current = onRelease;

  // Boutiques de la page en cours d'insertion (vide = aucune page en attente).
  const pageIdsRef = React.useRef<Set<string>>(new Set());
  // Montees mais pas encore revelees.
  const pendingRef = React.useRef<Set<string>>(new Set());
  const revealedRef = React.useRef<Set<string>>(new Set());
  // Cellules actuellement montees. ⚠️ Les layout effects ENFANTS passent avant
  // celui de l'ecran : les cellules de la page s'inscrivent donc AVANT
  // `startPage`, qui doit relire ce set pour les retrouver.
  const mountedRef = React.useRef<Set<string>>(new Set());
  const laidOutRef = React.useRef(false);
  const releaseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
  };

  // Premiere boutique de la page : celle qui apparait juste sous le loader,
  // donc forcement dans le regard au bas de liste.
  const firstIdRef = React.useRef<string | null>(null);

  const tryRelease = React.useCallback(() => {
    if (!laidOutRef.current || pendingRef.current.size > 0) return;
    // ⚠️ Le contenu grandit AVANT que FlashList ne monte les nouvelles
    // cellules : a cet instant rien n'est « en attente » et le verrou tombait
    // sur des squelettes. On exige donc la revelation EFFECTIVE de la premiere
    // boutique de la page (filet : `INSERT_LOCK_SAFETY_MS`).
    const first = firstIdRef.current;
    if (first && !revealedRef.current.has(first)) return;
    if (releaseTimerRef.current) return;
    console.log(`[GATE] RELEASE dans ${REVEAL_MS} ms (premiere=${first})`);
    // Attendre la fin du fondu : liberer pendant le fondu laisserait le geste
    // demarrer sur des vues encore en composition.
    releaseTimerRef.current = setTimeout(() => {
      releaseTimerRef.current = null;
      pageIdsRef.current = new Set();
      laidOutRef.current = false;
      onReleaseRef.current();
    }, REVEAL_MS);
  }, []);

  const gate = React.useMemo<Gate>(
    () => ({
      mounted: (id) => {
        mountedRef.current.add(id);
        if (!pageIdsRef.current.has(id) || revealedRef.current.has(id)) return;
        pendingRef.current.add(id);
        console.log(`[GATE] MOUNT ${id} (attente=${pendingRef.current.size})`);
      },
      unmounted: (id) => {
        mountedRef.current.delete(id);
      },
      revealed: (id) => {
        if (revealedRef.current.has(id)) return;
        revealedRef.current.add(id);
        pendingRef.current.delete(id);
        if (pageIdsRef.current.has(id)) {
          console.log(`[GATE] REVEAL ${id} (attente=${pendingRef.current.size})`);
          tryRelease();
        }
      },
    }),
    [tryRelease],
  );

  /** Page inseree : ses ids deviennent a attendre. */
  const startPage = React.useCallback((ids: string[]) => {
    clearTimer();
    pageIdsRef.current = new Set(ids);
    firstIdRef.current = ids[0] ?? null;
    pendingRef.current = new Set(
      ids.filter(
        (id) => mountedRef.current.has(id) && !revealedRef.current.has(id),
      ),
    );
    laidOutRef.current = false;
    console.log(
      `[GATE] START page=${ids.length} deja-montees=${pendingRef.current.size}`,
    );
  }, []);

  /** Vrai si une page attend sa revelation. */
  const isActive = React.useCallback(() => pageIdsRef.current.size > 0, []);

  /** Contenu agrandi (squelettes poses) : liberation des que tout est revele. */
  const laidOut = React.useCallback(() => {
    laidOutRef.current = true;
    console.log(`[GATE] LAIDOUT attente=${pendingRef.current.size}`);
    tryRelease();
  }, [tryRelease]);

  /** Verrou libere ailleurs (securite, reset) : oublier la page. */
  const reset = React.useCallback(() => {
    if (pageIdsRef.current.size > 0) console.log(`[GATE] RESET (securite/reset)`);
    clearTimer();
    firstIdRef.current = null;
    pageIdsRef.current = new Set();
    pendingRef.current = new Set();
    laidOutRef.current = false;
  }, []);

  React.useEffect(() => clearTimer, []);

  // ⚠️ Objet STABLE : il entre dans les deps de handlers passes a la FlashList
  // (cf. « references stables », architecture/restaurants.md).
  return React.useMemo(
    () => ({ gate, startPage, isActive, laidOut, reset }),
    [gate, startPage, isActive, laidOut, reset],
  );
}

/**
 * Pose dans le `ShopRevealProvider` de chaque boutique (`DesignRouter`).
 * Lit `ready` plutot que d'ecouter la bascule : une cellule RECYCLEE par
 * FlashList garde son provider deja `ready`, la bascule ne se reproduirait pas.
 */
export const PageRevealReporter: React.FC<{ id?: string }> = ({ id }) => {
  const gate = React.useContext(PageRevealGateContext);
  const ready = useShopReveal()?.ready ?? true;

  React.useLayoutEffect(() => {
    if (!gate || !id) return;
    gate.mounted(id);
    return () => gate.unmounted(id);
  }, [gate, id]);

  React.useEffect(() => {
    if (gate && id && ready) gate.revealed(id);
  }, [gate, id, ready]);

  return null;
};
