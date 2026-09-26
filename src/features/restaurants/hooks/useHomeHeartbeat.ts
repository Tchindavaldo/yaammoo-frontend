import { useEffect } from "react";

/**
 * SONDE [HB] (temporaire) du home : battement 1 s + rendus/s. Si [HB] s'arrete
 * au gel, le thread JS est bloque ; s'il continue avec des rendus qui
 * explosent, c'est une boucle de rendu ; s'il continue au calme, le gel est
 * natif (UI).
 *
 * A appeler dans le CORPS de l'ecran : chaque appel compte un rendu du home.
 */
export const useHomeHeartbeat = () => {
  const hb = ((globalThis as any).__hb ??= { home: 0, row: 0, ph: 0 });
  hb.home++;
  useEffect(() => {
    // Frames JS lentes (> 34 ms) et la pire, par seconde : si le scroll rame
    // avec `lentes=0`, la saccade est native (UI), pas JavaScript.
    let slow = 0;
    let worst = 0;
    let prev = 0;
    let raf = 0;
    const tick = (ts: number) => {
      if (prev) {
        const dt = ts - prev;
        if (dt > 34) slow++;
        if (dt > worst) worst = dt;
      }
      prev = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const t = setInterval(() => {
      if (slow || hb.home || hb.row || hb.ph)
        console.log(
          `[HB] lentes=${slow} pire=${worst.toFixed(0)}ms home=${hb.home} row=${hb.row} ph=${hb.ph}`,
        );
      slow = 0;
      worst = 0;
      hb.home = 0;
      hb.row = 0;
      hb.ph = 0;
    }, 1000);
    return () => {
      clearInterval(t);
      cancelAnimationFrame(raf);
    };
  }, [hb]);
};
