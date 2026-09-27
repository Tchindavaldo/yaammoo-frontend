import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { usePageRevealGate } from "../context/PageRevealGate";
import { FILL_PLACEHOLDERS } from "../context/FastFoodContext";
import { UNLOCK_QUIET_MS } from "../utils/homeListConfig";

interface Params {
  fastFoods: any[];
  insertLock: boolean;
  notifyPageLaidOut: () => void;
}

/**
 * Verrou de page du home (FlashList) : le scroll reste fige tant que la page
 * inseree n'est pas REVELEE (`PageRevealGate`), et ne se libere qu'au calme
 * (doigt leve depuis `UNLOCK_QUIET_MS`). Voir architecture/restaurants.md,
 * « Bas de liste ».
 */
export const usePageRevealLock = ({ fastFoods, insertLock, notifyPageLaidOut }: Params) => {
  // Hauteur max deja vue : une croissance prouve que la page inseree est
  // commitee et mesuree, ce qui libere le verrou de page en attente.
  const contentHeightRef = useRef(0);
  const notifyPageLaidOutRef = useRef(notifyPageLaidOut);
  notifyPageLaidOutRef.current = notifyPageLaidOut;
  // Le verrou de page ne tombe plus aux squelettes mais a la REVELATION des
  // boutiques inserees (voir `PageRevealGate`).
  // --- Deblocage au CALME seulement ---
  // Page revelee : le verrou ne tombe que si le doigt est leve ET qu'aucun
  // geste n'a eu lieu depuis `UNLOCK_QUIET_MS`. Des glissements rapproches
  // pendant le blocage sont donc ignores jusqu'au bout : liberer au milieu
  // d'une rafale faisait partir un geste a moitie pris, a moitie bloque
  // (sensation « il ne sait pas s'il doit scroller ou s'arreter »).
  // Suivi par `onTouchStart/End` d'une View englobante : ils partent meme
  // quand le scroll est desactive, sans capter le geste.
  const touchingRef = useRef(false);
  const lastTouchEndRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseWhenQuiet = useCallback(() => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    quietTimerRef.current = null;
    const quietFor = Date.now() - lastTouchEndRef.current;
    if (!touchingRef.current && quietFor >= UNLOCK_QUIET_MS) {
      notifyPageLaidOutRef.current();
      return;
    }
    console.log(
      `[GATE] UNLOCK differe (${touchingRef.current ? "doigt pose" : `geste il y a ${quietFor} ms`})`,
    );
    quietTimerRef.current = setTimeout(
      releaseWhenQuiet,
      touchingRef.current ? 80 : UNLOCK_QUIET_MS - quietFor,
    );
  }, []);
  useEffect(
    () => () => {
      if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    },
    [],
  );
  const onListTouchStart = useCallback(() => {
    touchingRef.current = true;
  }, []);
  const onListTouchEnd = useCallback(() => {
    touchingRef.current = false;
    lastTouchEndRef.current = Date.now();
  }, []);
  const revealGate = usePageRevealGate(releaseWhenQuiet);
  const prevLenRef = useRef(fastFoods.length);
  // Layout effect : la page est declaree avant le layout natif (donc avant
  // `onContentSizeChange`).
  useLayoutEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = fastFoods.length;
    if (insertLock && fastFoods.length > prev && prev > 0) {
      revealGate.startPage(
        fastFoods.slice(prev).map((ff: any) => ff.id).filter(Boolean),
      );
    }
  }, [fastFoods, insertLock, revealGate]);
  // Verrou libere ailleurs (securite 8 s, reset) : la page est oubliee.
  useEffect(() => {
    if (!insertLock) revealGate.reset();
  }, [insertLock, revealGate]);
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    // ⚠️ Suivi dans LES DEUX SENS : apres un pull-to-refresh la liste repart
    // de zero, donc elle ne redepassera JAMAIS l'ancien max — sans le suivi
    // vers le bas, aucune croissance ne serait detectee et le verrou de page
    // resterait bloque (plus de loader ni de fetch sur la page 2).
    if (h === contentHeightRef.current) return;
    const grew = h > contentHeightRef.current;
    contentHeightRef.current = h;
    if (!grew) return;
    // Fantomes : fin de chargement deja posee au remplissage (meme lot, cf.
    // `pumpStaggeredAppend`). Rien a liberer ici, et surtout aucun rendu.
    if (FILL_PLACEHOLDERS) return;
    if (revealGate.isActive()) revealGate.laidOut();
    else notifyPageLaidOutRef.current();
  }, [revealGate]);

  return { revealGate, onListTouchStart, onListTouchEnd, handleContentSizeChange };
};
