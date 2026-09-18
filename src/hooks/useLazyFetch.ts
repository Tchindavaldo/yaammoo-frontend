import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Premier chargement DIFFERE : la requete ne part qu'a la demande de l'ecran qui
 * a besoin de la donnee, plus au montage du provider.
 *
 * ⚠️ Tous les contextes fetchaient au boot, sous le splash : onze requetes
 * partaient avant le premier pixel, dont celles du portefeuille, des bonus et
 * des pages marchand — ecrans que l'utilisateur n'ouvrira peut-etre jamais.
 * Elles retardaient les seules requetes qui conditionnent l'affichage
 * (`/fastFood/all`, `/settings/app-version`) et saturaient un backend qui repond
 * en ~1,5 s.
 *
 * Le contrat :
 * - `ensureLoaded()` declenche le fetch la PREMIERE fois seulement ; l'ecran
 *   l'appelle a son montage.
 * - `loaded` dit si la donnee a deja ete chargee une fois, pour afficher un
 *   squelette tant que c'est faux.
 * - Un changement de compte remet le compteur a zero via `reset()`, sinon le
 *   compte suivant reafficherait les donnees du precedent sans jamais refetcher.
 *
 * ⚠️ Service sans rendu : partage volontairement entre features (R16 ne vise que
 * les composants d'interface).
 */
export function useLazyFetch(
  /**
   * Le chargement. Renvoyer `false` signale un ECHEC : la demande est alors
   * rearmee, et revenir sur l'ecran relance le chargement. Ne rien renvoyer vaut
   * succes.
   */
  fetcher: (showLoading?: boolean) => Promise<void | boolean>,
  /**
   * Le fetch peut-il aboutir ? Typiquement `!!userId` : les `fetchData` des
   * contextes sortent sur `if (!userId) return` sans rien charger.
   *
   * ⚠️ Sans cette garde, un ecran ouvert avant que le profil soit resolu
   * marquait le chargement comme « demande » alors que rien n'etait parti : la
   * donnee n'arrivait JAMAIS, et l'ecran restait vide sans erreur ni squelette.
   * Ici la demande est mise en attente et part d'elle-meme des que la condition
   * devient vraie.
   */
  canFetch: boolean = true,
) {
  /**
   * Le fetch a-t-il deja ete LANCE ? En `ref` et non en `state` : deux ecrans
   * montes dans la meme frame appelleraient `ensureLoaded()` avant qu'un
   * `setState` n'ait ete applique, et la requete partirait deux fois.
   */
  const started = useRef(false);
  /** Une demande a ete faite mais `canFetch` etait faux : a rejouer. */
  const pending = useRef(false);
  const [loaded, setLoaded] = useState(false);

  // Garde la derniere version du fetcher sans la mettre en dependance :
  // `ensureLoaded` doit rester stable, sinon l'effet de l'ecran appelant se
  // rejouerait a chaque rendu du provider.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const run = useCallback(() => {
    started.current = true;
    pending.current = false;

    const settle = (ok: boolean) => {
      // ⚠️ ECHEC : on REARME. Sans cela, un premier chargement rate (reseau
      // coupe au demarrage, backend momentanement injoignable) condamnait
      // l'ecran pour toute la session — `started` restait vrai, donc revenir
      // sur la page ne relancait rien, et l'utilisateur n'avait plus que le
      // pull-to-refresh pour s'en sortir.
      if (ok) setLoaded(true);
      else started.current = false;
    };

    void fetcherRef
      .current()
      // ⚠️ Les `fetchData` des contextes attrapent leurs propres erreurs et
      // resolvent normalement : l'absence d'exception ne prouve RIEN. Un
      // fetcher qui renvoie explicitement `false` signale son echec ; celui qui
      // ne renvoie rien (`undefined`) est considere comme ayant abouti, pour
      // rester compatible avec les `fetchData` existants.
      .then((ok) => settle(ok !== false))
      .catch(() => settle(false));
  }, []);

  const ensureLoaded = useCallback(() => {
    if (started.current) return;
    if (!canFetch) {
      // Mise en attente : l'effet ci-dessous la rejouera.
      pending.current = true;
      return;
    }
    run();
  }, [canFetch, run]);

  // La condition vient de devenir vraie (profil resolu, par exemple) et un
  // ecran attendait : on part maintenant, sans qu'il ait a redemander.
  useEffect(() => {
    if (canFetch && pending.current && !started.current) run();
  }, [canFetch, run]);

  /** Changement de compte : le prochain affichage doit refetcher. */
  const reset = useCallback(() => {
    started.current = false;
    pending.current = false;
    setLoaded(false);
  }, []);

  return { ensureLoaded, loaded, reset };
}
