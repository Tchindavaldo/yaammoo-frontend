/**
 * Cycle des designs de rangee du home : `designIndex` (0, 1, 2, …) → numero
 * du composant `DesignN` rendu.
 *
 * SOURCE UNIQUE partagee par `DesignRouter` (quel composant rendre) et par
 * `getItemType` du home (pool de recyclage FlashList). Les deux tables etaient
 * dupliquees et avaient diverge : le home typait `[7,4,6,7,4,5,5] % 7` alors
 * que le routeur rendait `[7,4,5] % 3` — Design5 etait eclate en deux pools.
 */
export const DESIGN_CYCLE = [7, 4, 5] as const;

export type DesignNumber = (typeof DESIGN_CYCLE)[number];

export const designNumberFor = (designIndex?: number): DesignNumber =>
  DESIGN_CYCLE[(designIndex ?? 0) % DESIGN_CYCLE.length];
