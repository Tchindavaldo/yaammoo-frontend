/**
 * SONDE TEMPORAIRE — mesure du frein au scroll du home.
 *
 * A RETIRER une fois la mesure faite (comme les sondes `[CELL]` / `[JS] blocage`
 * du chantier precedent, cf. architecture/restaurants.md).
 *
 * But : verifier PAR LA MESURE, et non par lecture du code, ce qui coute au
 * montage d'une rangee de boutique. Deux hypotheses a departager :
 *   H1 — les rangees ne virtualisent pas (`ScrollView` + `.map()`) : le cout
 *        croit avec le NOMBRE DE MENUS, meme hors ecran.
 *   H2 — le cout vient des vues lourdes par carte (BlurView) : il croit avec la
 *        VARIANTE (le variant 1 en porte 7 par carte), a menus egaux.
 *
 * Les deux se distinguent en croisant `menus` et `variant` dans les logs.
 *
 * ⚠️ Ne jamais mesurer une duree avec un `Date.now()` capture au rendu et relu
 * dans un `useEffect` : l'effet s'execute bien apres le rendu, la valeur est
 * fausse (cf. architecture/restaurants.md). On mesure ici l'ecart entre le
 * debut du rendu et le passage de l'effet de layout, qui suit le commit natif.
 */

/** Passer a `false` pour eteindre toutes les sondes d'un coup. */
export const ROW_PROBE_ENABLED = true;

interface RowSample {
  variant: number;
  menus: number;
  commitMs: number;
}

const samples: RowSample[] = [];

/**
 * Nombre de montages deja vus pour une boutique donnee.
 *
 * C'est la mesure qui tranche : `n=1` partout = chaque rangee monte une seule
 * fois, la virtualisation fait son travail. Des `n` qui s'incrementent sur les
 * MEMES boutiques = elles sont detruites puis recreees en boucle, et c'est la
 * cause de la micro-pause ressentie au scroll.
 */
const mountCounts = new Map<string, number>();

/** Enregistre une mesure de rangee et la journalise. */
export const recordRowCommit = (
  variant: number,
  menus: number,
  commitMs: number,
  shopId?: string,
) => {
  if (!ROW_PROBE_ENABLED) return;
  samples.push({ variant, menus, commitMs });

  const key = shopId ?? `v${variant}/${menus}`;
  const n = (mountCounts.get(key) ?? 0) + 1;
  mountCounts.set(key, n);

  // `REMONTAGE` signale une rangee deja montee auparavant : le cout est repaye
  // integralement alors que rien n'a change dans les donnees.
  const tag = n === 1 ? "1er montage" : `REMONTAGE n=${n}`;
  console.log(
    `[ROW] variant=${variant} menus=${menus} commit=${commitMs.toFixed(1)}ms ` +
      `id=${shopId ?? "?"} ${tag}`,
  );
};

/**
 * Agrege les mesures par variante et par nombre de menus.
 *
 * Lecture : si le cout par menu (`parMenu`) est a peu pres CONSTANT au sein
 * d'une variante quand `menus` augmente, H1 est confirmee (chaque menu monte,
 * visible ou non). S'il s'effondre quand `menus` augmente, le cout est un
 * amorcage fixe et H1 est fausse.
 */
export const dumpRowStats = () => {
  if (!ROW_PROBE_ENABLED || samples.length === 0) return;
  const byKey = new Map<string, RowSample[]>();
  samples.forEach((s) => {
    const key = `v${s.variant}/${s.menus}`;
    const list = byKey.get(key) ?? [];
    list.push(s);
    byKey.set(key, list);
  });

  console.log("[ROW] ---- recapitulatif ----");
  console.log("[ROW] variant  menus  n   commit_moy  par_menu");
  Array.from(byKey.entries())
    .sort()
    .forEach(([key, list]) => {
      const avg = list.reduce((a, s) => a + s.commitMs, 0) / list.length;
      const [v, m] = key.split("/");
      const menus = Number(m) || 1;
      console.log(
        `[ROW] ${v.padEnd(7)} ${m.padEnd(6)} ${String(list.length).padEnd(3)} ` +
          `${avg.toFixed(1).padStart(9)}ms ${(avg / menus).toFixed(1).padStart(8)}ms`,
      );
    });
};
