import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import {
  StyleSheet,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import type { Bonus, BonusClaimStatus } from "../types/bonus.types";
import { BonusCard } from "./BonusCard";

/** Signature attendue d'un composant de carte de bonus (variantes de dispo). */
export type BonusCardComponent = React.ComponentType<{
  /** Image de fond de la carte principale (outil de réglage, cf. UserBonusSheet). */
  cardImage?: string | null;
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
  onActivate?: (bonus: Bonus) => void;
  arming?: boolean;
  onBlocked?: (reason: string) => void;
}>;

interface BonusCarouselProps {
  bonuses: Bonus[];
  claims: Record<string, BonusClaimStatus>;
  onClaim: (bonus: Bonus) => void;
  /** Position de scroll partagée (le parent l'utilise pour teinter la page). */
  scrollX: Animated.Value;
  /** Notifie le parent de l'index centré (pour les dots + flèches en bas). */
  onIndexChange: (index: number) => void;
  /** Composant de carte à rendre (permet les variantes de disposition). */
  CardComponent?: BonusCardComponent;
  /** Relayé tel quel à chaque carte. */
  cardImage?: string | null;
  /** Relayés tels quels à chaque carte — ligne de réclamation intégrée. */
  onActivate?: (bonus: Bonus) => void;
  arming?: Record<string, boolean>;
  onBlocked?: (reason: string) => void;
}

/** Méthodes impératives exposées au parent (piloter les flèches de pagination). */
export interface BonusCarouselHandle {
  goTo: (index: number) => void;
}

const { width: SCREEN_W } = Dimensions.get("window");
// Carte pleine largeur : pas de peek des voisins, on occupe tout l'écran.
const CARD_W = SCREEN_W;
const SIDE = 0;
/** Pas de défilement = largeur d'une carte. */
export const CAROUSEL_INTERVAL = CARD_W;
const INTERVAL = CAROUSEL_INTERVAL;

/**
 * Carrousel pleine largeur : chaque bonus occupe tout l'écran, les précédent/suivant
 * ne sont pas visibles. La pagination (flèches + points) est gérée par le parent.
 */
const BonusCarouselBase = forwardRef<BonusCarouselHandle, BonusCarouselProps>(
  (
    {
      bonuses,
      claims,
      onClaim,
      scrollX,
      onIndexChange,
      CardComponent = BonusCard,
      cardImage,
      onActivate,
      arming,
      onBlocked,
    },
    ref,
  ) => {
    const scrollRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      goTo: (i: number) => {
        const clamped = Math.max(0, Math.min(bonuses.length - 1, i));
        scrollRef.current?.scrollTo({ x: clamped * INTERVAL, animated: true });
        onIndexChange(clamped);
      },
    }));

    const onMomentumEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        onIndexChange(Math.round(e.nativeEvent.contentOffset.x / INTERVAL));
      },
      [onIndexChange],
    );

    return (
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {bonuses.map((bonus, i) => {
          return (
            <Animated.View key={bonus.id} style={styles.slide}>
              <CardComponent
                bonus={bonus}
                claimStatus={claims[bonus.id]}
                onClaim={onClaim}
                cardImage={cardImage}
                onActivate={onActivate}
                arming={!!arming?.[bonus.id]}
                onBlocked={onBlocked}
              />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    );
  },
);

BonusCarouselBase.displayName = "BonusCarousel";

/**
 * Mémoïsé : le carrousel ne dépend PAS de l'index courant, mais il re-rendait
 * — avec toutes ses cartes plein écran — à chaque `setIndex` du parent, donc à
 * chaque changement de bonus pendant un slide. C'était le poste le plus lourd
 * de la sheet.
 *
 * Aucun comparateur personnalisé : les props sont soit stables par référence
 * (`bonuses`, `scrollX`, callbacks en `useCallback`), soit des primitives.
 */
export const BonusCarousel = memo(BonusCarouselBase);

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  slide: { width: CARD_W, justifyContent: "center" },
});
