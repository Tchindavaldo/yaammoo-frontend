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
  // Numero d'instance (pose par l'effet `[]`) pour relier chaque REBIND a sa
  // cellule dans les logs.
  const seqRef = useRef(0);

  useLayoutEffect(() => {
    if (!ROW_PROBE_ENABLED || doneRef.current) return;
    // Un seul echantillon par rangee : les re-rendus suivants ne montent plus
    // de vues natives et donneraient des valeurs proches de zero, qui
    // fausseraient la moyenne vers le bas.
    doneRef.current = true;
    recordRowCommit(variant, menus, Date.now() - startRef.current, shopId);
  }, [variant, menus, shopId]);

  // Cycle de vie REEL de l'instance : montage/demontage veritable uniquement.
  // Un recyclage reussi (meme instance reutilisee pour une autre boutique) ne
  // passe PAS par ici — voir REBIND ci-dessous.
  useLayoutEffect(() => {
    if (!ROW_PROBE_ENABLED) return;
    const id = shopId ?? "?";
    const n = ++seq;
    seqRef.current = n;
    console.log(`[ROW] MONTAGE-CELL variant=${variant} id=${id} (#${n})`);
    return () => {
      console.log(`[ROW] DEMONTAGE variant=${variant} id=${id} (#${n})`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Rebinding : la cellule est recyclee vers une autre boutique, sans
  // destruction. Des REBIND sans DEMONTAGE groupe = le recyclage marche.
  useLayoutEffect(() => {
    if (!ROW_PROBE_ENABLED) return;
    console.log(
      `[ROW] REBIND (#${seqRef.current}) variant=${variant} id=${shopId ?? "?"}`,
    );
  }, [variant, shopId]);
};
