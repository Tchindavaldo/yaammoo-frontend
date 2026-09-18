import { AppBanner } from '@/src/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
} from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Defilement automatique du carrousel. Desactive : le scroll auto reprenait la
 * main pendant la lecture d'une banniere. Repasser a `true` pour le retablir
 * (toute la mecanique autoplay/pause reste en place).
 */
const AUTOPLAY_ENABLED = false;

/** Intervalle de l'autoplay, et duree de la pause apres un geste manuel. */
const AUTOPLAY_MS = 3500;
const AUTOPLAY_PAUSE_MS = 20000;

/**
 * TEST TEMPORAIRE — boucle infinie desactivee.
 *
 * A `false` : plus de clones, plus de teleport, plus de repositionnement au
 * montage. Le carrousel rend les N vraies bannieres et s'arrete aux deux bouts.
 * Repasser a `true` pour retablir la boucle (tout le code reste en place).
 */
const LOOP_ENABLED = true;

/** Diapo affichee : une banniere, plus la cle qui distingue clone et original. */
export type Slide = AppBanner & { slideKey: string };

/**
 * BOUCLE INFINIE PAR TELEPORT — ne jamais revenir a la duplication de masse.
 *
 * ⚠️ Le carrousel repetait la liste (`LOOP_MULTIPLIER`, 50 puis 10 tours) dans
 * une `FlatList` horizontale et demarrait au milieu (`initialScrollIndex`).
 * Avec 3 bannieres cela faisait 30 items, et la `FlatList` n'imposant ni
 * `windowSize` ni `initialNumToRender`, elle retombait sur les defauts de React
 * Native (21 / 10) : jusqu'a 21 IMAGES PLEIN ECRAN montees pour en afficher UNE.
 * Ces montages tombaient dans la meme seconde que la cascade de montage des
 * boutiques du home ; en scrollant avant la fin,
 * `VirtualizedList._shouldRenderWithPriority()` annulait son batching et montait
 * les cellules SYNCHRONEMENT dans le handler de scroll — 150 a 300 ms bloques
 * en plein geste, la pause ressentie en haut du home.
 *
 * Ici on rend `N + 2` diapos : un clone de la DERNIERE en tete, un clone de la
 * PREMIERE en queue. On demarre sur la vraie premiere (index 1) et, quand un
 * geste se termine sur un clone, on saute a son jumeau reel avec
 * `scrollTo({ animated: false })`. Le saut est invisible — l'image affichee est
 * identique au pixel pres — et le cout reste constant quel que soit le nombre
 * de tours : 5 vues pour 3 bannieres, contre 21 auparavant.
 *
 * Le rendu utilise une `ScrollView` et non une `FlatList` : a 5 diapos il n'y a
 * rien a virtualiser, et cela retire du header (jamais virtualise par la liste
 * du home) toute la mecanique `VirtualizedList` — fenetre de rendu, viewabilite,
 * cascade de montage.
 */
export function useBannerLoop(banners: AppBanner[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  /** Position courante exprimee en DIAPOS (clones compris), pas en bannieres. */
  const currentIndexRef = useRef(0);

  const hasCarousel = Array.isArray(banners) && banners.length > 0;
  /** Vrai des qu'il y a de quoi boucler : en dessous, une seule diapo suffit. */
  const looping = LOOP_ENABLED && hasCarousel && banners.length > 1;

  // [derniere, ...bannieres, premiere] : les deux clones qui rendent la boucle
  // possible. Une seule banniere n'a rien a boucler — on la rend telle quelle.
  const slides = useMemo<Slide[]>(() => {
    if (!banners || banners.length === 0) return [];
    const real = banners.map((b) => ({ ...b, slideKey: `real-${b.id}` }));
    if (!LOOP_ENABLED || banners.length === 1) return real;
    const last = banners[banners.length - 1];
    const first = banners[0];
    return [
      { ...last, slideKey: `clone-tail-${last.id}` },
      ...real,
      { ...first, slideKey: `clone-head-${first.id}` },
    ];
  }, [banners]);

  /** Diapo de depart : la vraie premiere, donc juste apres le clone de queue. */
  const startIndex = looping ? 1 : 0;

  // Positionnement initial sur la vraie premiere banniere. Fait a `onLayout`
  // et non via `contentOffset` : cette prop n'est fiable que sur iOS, et le
  // saut est de toute facon invisible sous le squelette, qui couvre encore la
  // carte a cet instant.
  const positionedRef = useRef(false);
  const handleLayout = useCallback(() => {
    if (positionedRef.current || startIndex === 0) return;
    positionedRef.current = true;
    currentIndexRef.current = startIndex;
    scrollRef.current?.scrollTo({ x: startIndex * width, animated: false });
  }, [startIndex]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAutoplay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // On peut viser le clone de queue sans precaution : le teleport de
      // `handleMomentumEnd` ramene sur la vraie premiere des l'arrivee.
      const nextIndex = currentIndexRef.current + 1;
      currentIndexRef.current = nextIndex;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    }, AUTOPLAY_MS);
  }, []);

  useEffect(() => {
    if (!AUTOPLAY_ENABLED || !looping) return;
    startAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [looping, startAutoplay]);

  /** Geste manuel : l'autoplay se tait, puis reprend apres la pause. */
  const handleScrollBeginDrag = useCallback(() => {
    if (!AUTOPLAY_ENABLED) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(startAutoplay, AUTOPLAY_PAUSE_MS);
  }, [startAutoplay]);

  /**
   * Fin de geste : c'est ICI que la boucle se referme.
   *
   * Si on a atterri sur un clone, on saute a son jumeau reel sans animation.
   * Les deux portent la meme image, au meme facteur d'echelle (chacun interpole
   * sur SON index, et on atterrit pile sur son centre) : le saut est invisible.
   * C'est aussi ici que les puces se mettent a jour — la position ne devient
   * significative qu'une fois la diapo posee, inutile de recalculer quoi que ce
   * soit pendant le geste.
   *
   * ⚠️ Ne pas remplacer par un listener sur `scrollX` : cette valeur est pilotee
   * par le driver NATIF, l'ecouter en JS la ferait retomber sur le thread JS a
   * chaque frame — exactement ce qu'on cherche a eviter ici.
   */
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const n = banners.length;
      if (n === 0) return;
      const landed = Math.round(e.nativeEvent.contentOffset.x / width);
      let index = landed;

      if (looping) {
        // Clone de queue (index 0) → vraie derniere. Clone de tete (n + 1) →
        // vraie premiere.
        if (landed === 0) index = n;
        else if (landed === n + 1) index = 1;
        if (index !== landed) {
          scrollRef.current?.scrollTo({ x: index * width, animated: false });
        }
      }

      currentIndexRef.current = index;
      // `startIndex` vaut 1 quand on boucle : la banniere reelle est decalee
      // d'une diapo par le clone de queue.
      setActiveIndex((index - startIndex + n) % n);
    },
    [banners.length, looping, startIndex],
  );

  return {
    slides,
    slideWidth: width,
    scrollRef,
    scrollX,
    activeIndex,
    hasCarousel,
    handleLayout,
    handleScrollBeginDrag,
    handleMomentumEnd,
  };
}
