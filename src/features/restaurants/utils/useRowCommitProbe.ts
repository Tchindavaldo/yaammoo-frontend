/**
 * SONDE TEMPORAIRE — a retirer avec `rowProbe.ts`.
 *
 * Mesure le temps de COMMIT NATIF d'une rangee : l'ecart entre le debut du
 * rendu React et le moment ou les vues natives sont effectivement posees.
 *
 * `useLayoutEffect` s'execute apres le commit et avant la peinture : c'est le
 * point de mesure le plus proche du cout natif reel depuis JS. Le chantier
 * precedent avait montre que `render` coute 0 ms et que TOUT part dans le
 * commit — c'est donc bien cette phase qu'il faut chiffrer.
 */
import { useLayoutEffect, useRef } from "react";
import { recordRowCommit, ROW_PROBE_ENABLED } from "./rowProbe";

/**
 * Compteur global de montages, tous composants confondus. Sert a dater les
 * evenements les uns par rapport aux autres dans le log.
 */
let seq = 0;

export const useRowCommitProbe = (
  variant: number,
  menus: number,
  shopId?: string,
) => {
  // Horodatage pris PENDANT le rendu, pas dans un effet : entre les deux, il y
  // a exactement la phase qu'on veut mesurer.
  const startRef = useRef(0);
  if (ROW_PROBE_ENABLED) startRef.current = Date.now();

  const doneRef = useRef(false);

  useLayoutEffect(() => {
    if (!ROW_PROBE_ENABLED || doneRef.current) return;
    // Un seul echantillon par rangee : les re-rendus suivants ne montent plus
    // de vues natives et donneraient des valeurs proches de zero, qui
    // fausseraient la moyenne vers le bas.
    doneRef.current = true;
    recordRowCommit(variant, menus, Date.now() - startRef.current, shopId);
  }, [variant, menus, shopId]);

  // DEMONTAGE — la mesure qui tranche.
  //
  // Un recyclage reussi ne demonte RIEN : la vue est conservee et seules ses
  // donnees changent. Si ce log apparait pendant le scroll, la cellule est bien
  // detruite, et le `REMONTAGE` qui suit est un vrai remontage — pas un simple
  // re-rendu. C'est la preuve directe que le recyclage ne prend pas.
  useLayoutEffect(() => {
    if (!ROW_PROBE_ENABLED) return;
    const id = shopId ?? "?";
    const n = ++seq;
    return () => {
      console.log(`[ROW] DEMONTAGE variant=${variant} id=${id} (#${n})`);
    };
  }, [variant, shopId]);
};
