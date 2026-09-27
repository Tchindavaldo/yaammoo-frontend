import type { HomeListHandle } from "@/modules/home-list";
import type { FlashListRef } from "@shopify/flash-list";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import {
  LOADER_VISIBLE_DISTANCE,
  PLACEHOLDER_FETCH_DISTANCE,
} from "../utils/homeListConfig";

// TEST: mettre `false` pour desactiver le reset au tap onglet Home
// (mesure scroll sans troncature). Remettre `true` avant merge : UX voulue.
const TAP_HOME_RESET_ENABLED = true;

interface Params {
  loadMore: () => void;
  setListAtBottom: (atBottom: boolean) => void;
  loadingMore: boolean;
  hasMore: boolean;
  notifyUserScroll: () => void;
  cancelPendingLoadMore: () => void;
  resetToFirstPage: () => void;
}

/**
 * Défilement du home : loader de pagination indépendant (piloté sans rendu
 * React), déclenchement du fetch à l'entrée des fantômes, retour en haut au
 * tap sur l'onglet Home. Sert la FlashList ET la liste native iOS. Voir
 * architecture/restaurants.md (« Bas de liste », « Retour en haut »).
 */
export const useHomeListScroll = ({
  loadMore,
  setListAtBottom,
  loadingMore,
  hasMore,
  notifyUserScroll,
  cancelPendingLoadMore,
  resetToFirstPage,
}: Params) => {
  // Loader bas INDEPENDANT : monte une seule fois, apparait/disparait en
  // fade sans jamais toucher au contenu de la liste (ni `ListFooterComponent`
  // qui re-layoute, ni `scrollEnabled` qui reconstruit). `pointerEvents none` :
  // il ne bloque ni scroll ni taps. Visible seulement pendant un fetch avec
  // une suite (`hasMore`) ET dans la zone basse (`loaderVisible`, marge
  // `LOADER_VISIBLE_DISTANCE`) : en remontant, il se cache ; en approchant du
  // bas, il apparait toujours en premier devant les elements charges.
  // Pilote sans rendu React par `syncLoader`, plus bas.
  // `useState` et non `useRef(...).current` : meme valeur creee une fois, sans
  // lecture de ref pendant le rendu.
  const [loaderOpacity] = useState(() => new Animated.Value(0));

  // Retour en haut quand on retape l'onglet Home alors qu'on y est deja.
  //
  // ⚠️ Gere ICI et pas dans `(tabs)/_layout.tsx` : ce layout est partage par
  // tous les onglets, et il n'a pas acces a la liste de cet ecran. L'evenement
  // `tabPress` remonte au screen, qui est le seul a tenir la ref.
  const listRef = useRef<FlashListRef<any>>(null);
  // Liste NATIVE (iOS, `modules/home-list`) quand le build l'embarque ; sinon
  // la FlashList reste en place, inchangee.
  const nativeListRef = useRef<HomeListHandle>(null);
  // Ref stable vers `loadMore` pour le declenchement depuis `handleScroll`
  // sans recreer le handler (et sans reconstruire la liste).
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  // Ref stable vers `setListAtBottom`, meme raison que `loadMoreRef`.
  const setListAtBottomRef = useRef(setListAtBottom);
  setListAtBottomRef.current = setListAtBottom;
  const navigation = useNavigation();

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Position courante : garde-fou contre une troncature hors du haut de liste. */
  const atTopRef = useRef(true);

  /**
   * Bas de liste atteint : declenche le fetch de la page suivante (transition
   * dans `handleScroll`).
   *
   * ⚠️ REF SEULE, jamais d'etat. C'etait un `useState` que plus rien ne lisait
   * au rendu : chaque arrivee en bas et chaque deblocage re-rendait le home
   * pour rien. Mesure (sonde `[GATE] FRAMES`) : au deblocage du scroll, DEUX
   * rendus consecutifs de 40-75 ms chacun, au moment exact ou le doigt
   * reprend — la saccade ressentie.
   */
  const atBottomRef = useRef(false);
  // Visibilite du loader : meme mecanisme de transition que `atBottom`, mais
  // avec une marge (`LOADER_VISIBLE_DISTANCE`). Le loader apparait donc avant
  // le bas strict, toujours en premier devant les elements charges.
  // ⚠️ Ref aussi : le loader est une `Animated.Value` pilotee directement
  // (`syncLoader`), sans passer par un rendu React.
  const loaderVisibleRef = useRef(false);
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loaderShownRef = useRef(false);
  const syncLoader = useCallback(() => {
    const show =
      loadingMoreRef.current && hasMoreRef.current && loaderVisibleRef.current;
    if (show === loaderShownRef.current) return;
    loaderShownRef.current = show;
    if (show) {
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      // Disparition directe, sans fondu de sortie.
      loaderOpacity.stopAnimation();
      loaderOpacity.setValue(0);
    }
  }, [loaderOpacity]);
  // Re-armement : apres un fetch, le rebond au bas redeclenche la transition
  // sans geste (double fetch, double loader). On n'autorise le fetch suivant
  // qu'apres etre remonte de 200 px : le rebond (±40 px) ne re-arme jamais.
  const fetchArmedRef = useRef(true);
  const handleScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      atTopRef.current = y <= 4;

      // Bas de liste reellement atteint : c'est la condition qui autorise le
      // gel du scroll pendant le chargement (voir `scrollEnabled`). On la
      // calcule ici plutot que dans `onEndReached`, qui se declenche AVANT le
      // bas (`onEndReachedThreshold`) et figerait la liste en plein defilement.
      //
      // ⚠️ `setState` UNIQUEMENT au changement de valeur. Le home se re-rend a
      // chaque agitation de contexte et ses cellules sont lourdes (voir
      // « references stables » dans architecture/restaurants.md) : appeler le
      // setter a chaque frame de scroll reconstruirait les cellules visibles en
      // plein geste. Le ref porte la valeur courante, l'etat ne bouge qu'aux
      // deux transitions qui interessent le rendu.
      const { contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceToEnd = contentSize.height - layoutMeasurement.height - y;
      // Le « bas » est desormais l'entree des FANTOMES dans le champ de vision
      // (ils occupent la fin du contenu) : le fetch part des qu'on les voit,
      // et ses donnees viennent remplir les squelettes deja en place.
      const nextAtBottom = distanceToEnd <= PLACEHOLDER_FETCH_DISTANCE;
      const nextLoaderVisible = distanceToEnd <= LOADER_VISIBLE_DISTANCE;
      if (nextLoaderVisible !== loaderVisibleRef.current) {
        loaderVisibleRef.current = nextLoaderVisible;
        syncLoader();
      }
      // Bas STRICT (10 px) pour l'INSERTION : une page arrivee pendant que
      // l'utilisateur est remonte attend son retour, elle ne s'insere jamais
      // sous ses yeux. Ecriture ref uniquement, aucun rendu.
      setListAtBottomRef.current(distanceToEnd <= 10);
      if (distanceToEnd > PLACEHOLDER_FETCH_DISTANCE + 200) {
        fetchArmedRef.current = true;
      }
      if (nextAtBottom !== atBottomRef.current) {
        atBottomRef.current = nextAtBottom;
        // ⚠️ Le fetch ne part QU'ICI, au bas reel, jamais en avance, et une
        // seule fois par arrivee (re-arme apres 200 px) : le loader est
        // visible. `loadMore` garde le reste (fini, deja en vol = ignore).
        if (nextAtBottom && fetchArmedRef.current) {
          fetchArmedRef.current = false;
          console.log(
            `[ROW] AT-BOTTOM fetch distance=${distanceToEnd.toFixed(1)}`,
          );
          loadMoreRef.current();
        }
      }

      // Un scroll reel leve le verrou pose par la troncature : sans ce signal,
      // le contexte ne peut pas distinguer le rebond automatique de
      // `onEndReached` (la liste raccourcit, sa fin remonte sous le viewport)
      // d'une descente voulue par l'utilisateur.
      notifyUserScroll();
    },
    [notifyUserScroll, syncLoader],
  );

  const handleMomentumEnd = useCallback(() => {
    // Ne RIEN faire : le reset au momentum detruit les cellules et cause la
    // pause au scroll suivant. Le reset ne se fait plus QUE sur tap explicite
    // sur l'onglet Home (voir listener `tabPress` plus bas).
  }, []);

  /** Bords de la liste NATIVE iOS : meme effet que `handleScroll`. */
  const handleNativeEdgeChange = useCallback(
    (top: boolean, near: boolean) => {
      atTopRef.current = top;
      loaderVisibleRef.current = near;
      syncLoader();
      notifyUserScroll();
    },
    [syncLoader, notifyUserScroll],
  );

  // ⚠️ Liberation du gel des l'arrivee de la page. Sans cet effet, `atBottom`
  // resterait a `true` : la liste vient de s'allonger, on n'est donc plus en
  // bas, mais AUCUN `onScroll` ne repart pour le signaler — le scroll etait
  // desactive, donc immobile. La liste resterait figee definitivement.
  // Aucun `setState` ici : refs + loader pilote directement (voir plus haut).
  useEffect(() => {
    if (!loadingMore) {
      atBottomRef.current = false;
      loaderVisibleRef.current = false;
    }
    syncLoader();
  }, [loadingMore, hasMore, syncLoader]);
  useEffect(() => {
    // `tabPress` part a CHAQUE appui sur l'onglet, y compris depuis un autre
    // ecran. `isFocused()` limite donc l'action au cas « on est deja sur le
    // home » ; sinon on remonterait la liste pendant la navigation entrante,
    // ce qui annulerait la position d'un retour arriere.
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      if (!(navigation as any).isFocused()) return;
      // ⚠️ AVANT l'animation : une page suivante encore en vol arriverait
      // pendant la remontee et ferait monter ses cellules (~100 ms de commit
      // natif chacune), bloquant le thread JS au moment ou l'animation doit
      // tourner. La troncature seule est trop tardive : elle n'intervient
      // qu'apres les 450 ms ci-dessous, quand le mal est fait.
      cancelPendingLoadMore();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      nativeListRef.current?.scrollToTop();
      // Troncature une fois la remontee terminee : moins de cellules en
      // memoire, la liste retrouve l'etat qu'elle avait apres le premier GET.
      //
      // ⚠️ `atTopRef` est la garde INDISPENSABLE. Tronquer sans savoir ou on se
      // trouve fait remonter le bas de liste sous le viewport, ce qui declenche
      // `onEndReached` → `loadMore` recharge → on retronque… boucle de
      // pagination infinie a ~120 ms le tour. On ne tronque donc QUE si on est
      // reellement revenu en haut.
      if (TAP_HOME_RESET_ENABLED) {
        resetTimerRef.current = setTimeout(() => {
          if (atTopRef.current) resetToFirstPage();
        }, 450);
      }
    });
    return () => {
      unsubscribe();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [navigation, resetToFirstPage, cancelPendingLoadMore]);

  return {
    loaderOpacity,
    listRef,
    nativeListRef,
    loadMoreRef,
    handleScroll,
    handleMomentumEnd,
    handleNativeEdgeChange,
  };
};
