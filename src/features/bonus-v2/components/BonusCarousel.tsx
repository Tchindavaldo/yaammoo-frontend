import React, { forwardRef, useImperativeHandle, useRef } from "react";
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
  /** Image de fond de la carte principale (outil de réglage, cf. UserBonusV2Modal). */
  cardImage?: string | null;
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
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
export const BonusCarousel = forwardRef<BonusCarouselHandle, BonusCarouselProps>(
  (
    {
      bonuses,
      claims,
      onClaim,
      scrollX,
      onIndexChange,
      CardComponent = BonusCard,
      cardImage,
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

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      onIndexChange(Math.round(e.nativeEvent.contentOffset.x / INTERVAL));
    };

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
              />
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    );
  },
);

BonusCarousel.displayName = "BonusCarousel";

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  slide: { width: CARD_W, justifyContent: "center" },
});
