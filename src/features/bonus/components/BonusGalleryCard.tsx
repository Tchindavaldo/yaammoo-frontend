import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import type { Bonus } from "../types/bonus.types";
import { CAROUSEL_INTERVAL } from "./BonusCarousel";
import { GALLERY_CARD_W, GALLERY_RADIUS } from "./gallery.constants";

interface BonusGalleryCardProps {
  bonus: Bonus;
  /** Position de la carte dans le carousel (pilote l'interpolation). */
  position: number;
  /** Position de scroll du carousel (animation temps réel). */
  scrollX: Animated.Value;
  /** Vrai quand la carte est celle centrée : porte les styles non interpolables. */
  active: boolean;
  activeTextColor: string;
  onPress: () => void;
}

/**
 * Mini-carte de la galerie de pagination. Pas de cadre/bordure : la carte active
 * se distingue par sa BARRE DE PROGRESSION (qui se déploie via `scrollX`), son
 * fond légèrement teinté et le `fontWeight` de son libellé (piloté par `active`,
 * non interpolable par Animated).
 */
export const BonusGalleryCard = ({
  bonus,
  position,
  scrollX,
  active,
  activeTextColor,
  onPress,
}: BonusGalleryCardProps) => {
  const desc = getBonusDescriptor(bonus.type);
  const c = desc.color || Theme.colors.primary;

  const inputRange = [
    (position - 1) * CAROUSEL_INTERVAL,
    position * CAROUSEL_INTERVAL,
    (position + 1) * CAROUSEL_INTERVAL,
  ];
  const interpolate = (outputRange: string[]) =>
    scrollX.interpolate({ inputRange, outputRange, extrapolate: "clamp" });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View
        style={[
          styles.galleryCard,
          {
            backgroundColor: interpolate([
              "rgba(0,0,0,0.04)",
              `${c}12`,
              "rgba(0,0,0,0.04)",
            ]),
          },
        ]}
      >
        <Animated.View style={styles.galleryCardTop}>
          <Animated.View
            style={[styles.galleryIcon, { backgroundColor: `${c}1f` }]}
          >
            <Ionicons name={desc.icon} size={15} color={c} />
          </Animated.View>
        </Animated.View>
        <Text
          style={[
            styles.galleryName,
            active && { color: activeTextColor, fontWeight: "800" },
          ]}
          numberOfLines={1}
        >
          Bonus {position + 1}
        </Text>
        <Animated.View style={styles.galleryBar}>
          <Animated.View
            style={[
              styles.galleryBarFill,
              {
                backgroundColor: c,
                width: scrollX.interpolate({
                  inputRange,
                  outputRange: ["34%", "100%", "34%"],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  galleryCard: {
    width: GALLERY_CARD_W,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: GALLERY_RADIUS,
    // Pas de bordure : la carte active se lit à sa barre de progression.
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  galleryCardTop: { flexDirection: "row", alignItems: "center" },
  galleryIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryName: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.7)" },
  galleryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  galleryBarFill: { height: "100%", borderRadius: 2 },
});
