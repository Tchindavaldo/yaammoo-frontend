import type { FastFood } from "@/src/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { placeholderKey } from "../utils/pagePlaceholders";

/**
 * Mecanique de pagination du home, extraite de `FastFoodContext` : curseurs,
 * verrous de page, file d'insertion (`pumpStaggeredAppend`), troncature au
 * retour en haut. Hors `loadingMore`, `hasMore` et `insertLock`, tout vit dans
 * des refs : `fetchPage` (`useFastFoodFetch`) et `loadMore` (contexte) les
 * lisent sans changer d'identite.
 */

/**
 * Insertion DANS les fantomes de la page suivante (`utils/pagePlaceholders`) :
 * leurs cellules sont deja montees, l'insertion n'est plus qu'un rebind. On
 * insere donc des l'arrivee, sans attendre le bas (HOLD) et sans figer le
 * scroll (`insertLock`) — deux protections qui n'existaient que contre le cout
 * du montage. `false` = retour au comportement precedent.
 */
export const FILL_PLACEHOLDERS = true;

/**
 * Delai avant d'inserer une page en attente (HOLD) au retour en bas : le
 * loader reste visible 1 s, puis les donnees s'affichent a sa disparition.
 */
const HOLD_REVEAL_DELAY_MS = 1000;

/**
 * Securite du verrou d'insertion (`insertLock`) : si le layout ne confirme
 * jamais l'insertion (ex. page entierement dedupee, aucun rendu), le scroll
 * se libere seul au lieu de rester fige.
 *
 * Le verrou tient desormais jusqu'a la REVELATION des images (voir
 * `PageRevealGate`), d'ou une valeur alignee sur `MAX_WAIT_MS` de
 * `ShopRevealContext` (8 s) : a 2 s, un reseau lent liberait avant les images.
 */
const INSERT_LOCK_SAFETY_MS = 8000;

/**
 * TEST [ROW] — `false` = `resetToFirstPage()` ne tronque plus (mesure du scroll
 * sans destruction). Remettre `true` avant tout merge : sans troncature la
 * liste garde toutes ses pages en memoire.
 */
const RESET_ENABLED = false;

export function useFastFoodPagination(
  fastFoodsLength: number,
  setFastFoods: Dispatch<SetStateAction<FastFood[]>>,
) {
  /**
   * Longueur courante de `fastFoods`, lisible HORS d'un updater.
   * `resetToFirstPage()` en a besoin pour decider s'il y a lieu de tronquer
   * sans avoir a placer ses effets de bord dans le `setFastFoods` — un updater
   * peut etre rejoue par React, ce qui reposerait le verrou de troncature.
   */
  const fastFoodsLenRef = useRef(0);
  fastFoodsLenRef.current = fastFoodsLength;
  // Longueur SYNCHRONE (valeur + file d'attente) : `fastFoodsLenRef` ne suit
  // que les rendus valides, donc un scroll rapide l'observe perime (fetch n=3
  // vu a `len=3` alors que la page 2 etait deja inseree) et les `designIndex`
  // de la page suivante se decalait. Ici on compte au moment meme ou on
  // empile, sans attendre le rendu.
  const pumpLenRef = useRef(0);
  // Rattrapage vers le haut uniquement (insertion socket en tete) : vers le
  // bas, ce sont le reset et la premiere page qui fixent la valeur.
  if (fastFoodsLength > pumpLenRef.current)
    pumpLenRef.current = fastFoodsLength;
  const [loadingMore, setLoadingMore] = useState(false);
  const [insertLock, setInsertLock] = useState(false);
  // Securite : libere `insertLock` si le layout ne confirme jamais
  // l'insertion (page entierement dedupee → aucun rendu, aucun layout).
  const insertLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Curseur de la page suivante. `null` = fin de liste atteinte. */
  const cursorRef = useRef<string | null>(null);
  /**
   * Curseur rendu par la PREMIERE page. Conserve pour que
   * `resetToFirstPage()` puisse repartir exactement de la fin de cette page.
   */
  const firstPageCursorRef = useRef<string | null>(null);
  /**
   * Curseur de la page suivante EN ATTENTE d'insertion. Applique dans
   * `pumpStaggeredAppend` au moment de l'insertion reelle, pas a l'arrivee
   * reseau : sinon, pendant un HOLD (utilisateur remonte), `hasMore` bascule
   * deja et la liste affiche « fin » + cache le loader alors que la derniere
   * page n'est pas encore inseree.
   */
  const pendingCursorRef = useRef<string | null | undefined>(undefined);
  /**
   * Numero de troncature, incremente a chaque `resetToFirstPage()`. Compare a
   * l'arrivee d'une page suivante : un `loadMore` parti AVANT le reset a une
   * reponse caduque, qu'il ne faut ni concatener ni laisser ecrire le curseur
   * ou `loadingMore`. Un enchainement rapide haut/bas incremente autant de
   * fois : toute reponse anterieure au dernier reset est ecartee.
   */
  const resetSeqRef = useRef(0);
  // Compteur de pages demandees (1 = premiere page du boot) : prouve dans les
  // logs que chaque page suivante est fetchee UNE PAR UNE au bas de la
  // precedente, jamais toutes d'un coup depuis le bas de la page 1.
  const pageFetchRef = useRef(1);
  // Verrou "page en attente" : `true` entre le depart du fetch et l'insertion
  // de sa page (ou son echec). Un retour au bas de la page PRECEDENTE pendant
  // ce temps ne refetch PAS : chaque bas de page ne fait qu'UN fetch, et la
  // page N+1 ne part qu'une fois la page N inseree.
  //
  // ⚠️ Libere par le LAYOUT (`notifyPageLaidOut`), pas par l'insertion : le
  // `setFastFoods` de la pompe ne commite qu'apres, et un `AT-BOTTOM` mesure
  // sur l'ancien contenu partirait sinon chercher la page N+1 depuis le bas
  // de la page N-1.
  const pendingPageRef = useRef(false);
  const [hasMore, setHasMore] = useState(false);
  /**
   * Boutiques de la premiere page, pour `resetToFirstPage()` : la taille de page
   * peut changer depuis (reponse serveur), la troncature doit garder
   * exactement la page que `firstPageCursorRef` termine.
   */
  const firstPageSizeRef = useRef(0);

  /**
   * Verrou pose par `resetToFirstPage()`. Juste apres une troncature, la liste
   * raccourcit brutalement : sa fin remonte sous le viewport et `onEndReached`
   * repart AUSSITOT, sans le moindre geste de l'utilisateur. Sans verrou, on
   * rechargeait la page qu'on venait de retirer — boucle de pagination infinie.
   *
   * ⚠️ Ce verrou etait un COOLDOWN de 800 ms, remplace ici par un rearmement au
   * geste (`notifyUserScroll`). Un delai fixe est une devinette : il refusait
   * aussi les demandes LEGITIMES d'un utilisateur qui redescend vite — avec
   * des pages de 3 le bas de liste est atteint en ~300 ms, donc quasi toujours
   * dans la fenetre. Le loader restait alors fige et la page suivante
   * n'arrivait jamais. On ne devine plus une duree : on distingue le rebond
   * automatique (aucun scroll entre la troncature et `onEndReached`) du scroll
   * reel (un `onScroll` est passe entre-temps).
   */
  const resetLockRef = useRef(false);

  /**
   * Retour a la premiere page SANS requete : on tronque la liste deja chargee.
   *
   * Appele quand l'utilisateur revient en haut du home. Moins de cellules en
   * memoire = moins de travail pour la `FlatList`, et la liste retrouve l'etat
   * exact qu'elle avait apres le premier GET. Les pages suivantes seront
   * rechargees normalement au scroll.
   *
   * ⚠️ Sans effet si rien n'a ete pagine (liste pas plus longue que la
   * premiere page) : declencher un rendu pour rien reintroduirait le probleme
   * qu'on corrige.
   */
  const resetToFirstPage = useCallback(() => {
    if (!RESET_ENABLED) return;
    const firstPageSize = firstPageSizeRef.current;
    // ⚠️ Les effets de bord sont ICI, PAS dans l'updater de `setFastFoods`.
    // Un updater n'est pas garanti execute une seule fois : React le rejoue
    // (StrictMode, rendu concurrent, re-rendu declenche par un contexte
    // voisin — frequent sur ce home). Quand le verrou et le curseur y vivaient,
    // une simple notification entrante les reposait apres coup et gelait la
    // pagination. Ne pas les y remettre.
    if (fastFoodsLenRef.current <= firstPageSize) return;

    // SONDE [ROW] : qui tronque pendant le scroll ? A retirer avec la sonde.
    console.log(
      `[ROW] RESET-TRONCATURE len=${fastFoodsLenRef.current} seq=${resetSeqRef.current + 1}`,
    );

    // Verrou leve au premier scroll reel (`notifyUserScroll`) : seule la
    // demande automatique nee de la troncature est refusee.
    resetLockRef.current = true;
    // Invalide toute page suivante encore en vol : sa reponse ne sera ni
    // concatenee ni autorisee a ecrire le curseur (voir `fetchPage`).
    resetSeqRef.current += 1;
    // Une page en attente (HOLD) ne doit pas ressusciter apres la troncature :
    // la file est videe, la pagination repartira du curseur remis plus bas.
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    pumpHoldLoggedRef.current = false;
    pendingCursorRef.current = undefined;
    if (holdRevealTimerRef.current) {
      clearTimeout(holdRevealTimerRef.current);
      holdRevealTimerRef.current = null;
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    pendingPageRef.current = false;
    // ⚠️ Le loader de pagination s'eteint ICI, sans attendre la reponse en vol.
    // Sinon il restait anime en bas d'une liste qu'on vient de tronquer, alors
    // que l'utilisateur est remonte en haut et que plus rien ne sera ajoute.
    setLoadingMore(false);
    // Le curseur doit repartir de la fin de la page conservee, sinon
    // `loadMore` rechargerait des boutiques deja affichees.
    cursorRef.current = firstPageCursorRef.current;
    setHasMore(!!firstPageCursorRef.current);
    // La base des designs repart de la liste conservee.
    pumpLenRef.current = firstPageSize;
    setFastFoods((prev) =>
      prev.length <= firstPageSize ? prev : prev.slice(0, firstPageSize),
    );
  }, [setFastFoods]);

  /**
   * Appele par l'ecran a chaque `onScroll`. Leve le verrou pose par la
   * troncature : a partir de la, `onEndReached` traduit une intention reelle
   * de l'utilisateur et non le rebond de la liste qui vient de raccourcir.
   */
  const notifyUserScroll = useCallback(() => {
    if (resetLockRef.current) resetLockRef.current = false;
  }, []);

  /**
   * Appele au DEBUT d'une remontee vers le haut (tap sur l'onglet Home), avant
   * l'animation de scroll et donc bien avant la troncature.
   *
   * ⚠️ Sans lui, une page suivante encore en vol arrivait PENDANT la remontee :
   * la `FlatList` montait ses cellules (~100 ms de commit natif chacune, cf.
   * architecture/restaurants.md), ce qui bloque le thread JS au moment precis
   * ou l'animation de scroll doit tourner — d'où la pause et le saut ressentis.
   * Le reset seul ne suffisait pas : il n'intervient qu'a la fin de l'animation
   * (`setTimeout(450)`), donc apres que les cellules se sont montees pour rien.
   */
  const cancelPendingLoadMore = useCallback(() => {
    resetSeqRef.current += 1;
    // Comme pour le reset : pas de page en attente qui surgirait pendant la
    // remontee.
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    pumpHoldLoggedRef.current = false;
    pendingCursorRef.current = undefined;
    if (holdRevealTimerRef.current) {
      clearTimeout(holdRevealTimerRef.current);
      holdRevealTimerRef.current = null;
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    pendingPageRef.current = false;
    setLoadingMore(false);
  }, []);

  /**
   * File d'insertion : les pages suivantes s'ajoutent LA PAGE ENTIERE D'UN
   * COUP, en un seul rendu, jamais rangee par rangee. Une seule pompe tourne
   * a la fois pour preserver l'ordre des pages.
   *
   * ⚠️ JAMAIS d'insertion hors du bas strict : si l'utilisateur est remonte
   * entre le fetch et l'arrivee, la page attend (pompe arretee, `HOLD`) et ne
   * s'insere qu'a son retour au bas (`setListAtBottom(true)` relance).
   *
   * ⚠️ Le fetch reste UNE PAGE par arrivee au bas (voir `loadMore`) : on
   * n'insere d'un coup que la page qui vient d'arriver, jamais tout le
   * catalogue.
   */
  const staggerQueueRef = useRef<any[]>([]);
  const staggerPumpOnRef = useRef(false);
  // Vrai = liste strictement en bas (pose par l'ecran, a 10 px pres).
  const listAtBottomRef = useRef(false);
  // Sonde : n'afficher `PUMP-HOLD` qu'une fois par attente, pas a chaque frame.
  const pumpHoldLoggedRef = useRef(false);
  // Insertion differee d'une page en HOLD au retour en bas (voir
  // `setListAtBottom`). Annulee si l'utilisateur remonte avant la fin.
  const holdRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pumpStaggeredAppend = useCallback(() => {
    // Une seule pompe a la fois : une page arrivant pendant qu'une pompe
    // tourne est prise en charge par celle-ci, jamais en double.
    if (staggerPumpOnRef.current) return;
    staggerPumpOnRef.current = true;
    // Pas en bas : on ARRETE la pompe sans consommer, la page attend. Le
    // retour au bas relance via `setListAtBottom`.
    // (`FILL_PLACEHOLDERS` : jamais d'attente, la page remplit ses fantomes.)
    if (!listAtBottomRef.current && !FILL_PLACEHOLDERS) {
      staggerPumpOnRef.current = false;
      if (!pumpHoldLoggedRef.current) {
        pumpHoldLoggedRef.current = true;
        console.log(
          `[ROW] PUMP-HOLD en attente du bas (${staggerQueueRef.current.length} en file)`,
        );
      }
      return;
    }
    const batch = staggerQueueRef.current;
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    if (batch.length === 0) return;
    // Insertion reelle : le curseur de cette page prend effet ici seulement.
    // Pendant un HOLD, `hasMore` gardait donc l'ancienne valeur et le loader
    // restait affichable jusqu'au retour en bas.
    if (pendingCursorRef.current !== undefined) {
      cursorRef.current = pendingCursorRef.current;
      setHasMore(!!pendingCursorRef.current);
      pendingCursorRef.current = undefined;
    }
    pumpHoldLoggedRef.current = false;
    console.log(`[ROW] PUMP-APPEND page de ${batch.length} D'UN COUP`);
    // Verrou : le scroll vertical est fige jusqu'au layout des nouvelles
    // rangees (`notifyPageLaidOut`) — jamais de scroll sur un montage en
    // cours. Pose AVANT le `setFastFoods` pour couvrir aussi le commit.
    // Sans objet en `FILL_PLACEHOLDERS` : rien ne se monte, tout se rebind.
    if (!FILL_PLACEHOLDERS) {
      setInsertLock(true);
      if (insertLockTimerRef.current) clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = setTimeout(() => {
        insertLockTimerRef.current = null;
        setInsertLock(false);
      }, INSERT_LOCK_SAFETY_MS);
    } else {
      // Fin du chargement DANS LE MEME LOT que le remplissage : un seul rendu.
      // Sinon `notifyPageLaidOut` (croissance du contenu, donc seulement quand
      // de nouveaux fantomes s'ajoutent : page 2, pas la derniere) relancait
      // un second rendu complet du home en plein scroll — la pause ressentie
      // au remplissage de l'avant-derniere page, absente a la derniere.
      pendingPageRef.current = false;
      setLoadingMore(false);
    }
    setFastFoods((prev) => {
      // Dédup par id : un `newFastfood` reçu par socket pendant le
      // chargement peut déjà avoir inséré une boutique de cette page.
      const known = new Set(prev.map((ff) => ff.id));
      const added = batch.filter((item) => item?.id && !known.has(item.id));
      if (added.length === 0) return prev;
      if (!FILL_PLACEHOLDERS) return [...prev, ...added];
      // Chaque boutique reprend la cle de ligne ET le design du fantome qu'elle
      // remplace (rang reel `prev.length + i`, exact meme apres une insertion
      // socket en tete) : FlashList remplit la meme cellule, rien ne bouge.
      return [
        ...prev,
        ...added.map((ff, i) => ({
          ...ff,
          designIndex: (prev.length + i) % 6,
          listKey: placeholderKey(prev.length + i),
        })),
      ];
    });
  }, [setFastFoods]);

  // Retour au bas strict : relance l'insertion d'une page en attente, après
  // `HOLD_REVEAL_DELAY_MS` (loader visible 1 s, donnees ensuite).
  const setListAtBottom = useCallback(
    (atBottom: boolean) => {
      listAtBottomRef.current = atBottom;
      // Remontee avant la fin du delai : on annule la revelation, la page
      // reste en attente et ne s'inserera jamais hors du bas.
      if (!atBottom) {
        if (holdRevealTimerRef.current) {
          clearTimeout(holdRevealTimerRef.current);
          holdRevealTimerRef.current = null;
        }
        return;
      }
      if (
        atBottom &&
        staggerQueueRef.current.length > 0 &&
        !staggerPumpOnRef.current &&
        !holdRevealTimerRef.current
      ) {
        // Le loader se rallume pour l'insertion differee.
        setLoadingMore(true);
        holdRevealTimerRef.current = setTimeout(() => {
          holdRevealTimerRef.current = null;
          pumpStaggeredAppend();
        }, HOLD_REVEAL_DELAY_MS);
      }
    },
    [pumpStaggeredAppend],
  );

  // Timers en vol au demontage : ne pas inserer sur un contexte mort.
  useEffect(
    () => () => {
      if (holdRevealTimerRef.current) clearTimeout(holdRevealTimerRef.current);
      if (insertLockTimerRef.current) clearTimeout(insertLockTimerRef.current);
    },
    [],
  );

  /**
   * Le contenu de la liste a GRANDI (nouvelles rangees commitees et mesurees).
   * Libere le verrou `pendingPageRef`, le verrou de scroll (`insertLock`) ET
   * eteint le loader : le bas est desormais le vrai bas de la nouvelle page,
   * le fetch suivant y est autorise. Sans cela, un `AT-BOTTOM` mesure sur
   * l'ancien contenu (avant le commit) partait chercher la page N+1 depuis le
   * bas de la page N-1.
   */
  const notifyPageLaidOut = useCallback(() => {
    if (pendingPageRef.current) {
      pendingPageRef.current = false;
      console.log(`[ROW] LAYOUT-OK verrou page libere`);
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    setLoadingMore(false);
  }, []);

  return {
    fastFoodsLenRef,
    pumpLenRef,
    cursorRef,
    firstPageCursorRef,
    pendingCursorRef,
    resetSeqRef,
    pageFetchRef,
    pendingPageRef,
    firstPageSizeRef,
    resetLockRef,
    staggerQueueRef,
    loadingMore,
    setLoadingMore,
    hasMore,
    setHasMore,
    insertLock,
    pumpStaggeredAppend,
    setListAtBottom,
    notifyPageLaidOut,
    resetToFirstPage,
    notifyUserScroll,
    cancelPendingLoadMore,
  };
}

export type FastFoodPagination = ReturnType<typeof useFastFoodPagination>;
