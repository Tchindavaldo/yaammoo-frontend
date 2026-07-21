import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusStatus } from "../hooks/useBonusStatus";
import type { Bonus } from "../types/bonus.types";
import { CAROUSEL_INTERVAL } from "./BonusCarousel";

interface BonusPagerInfoProps {
  bonuses: Bonus[];
  /** Index du bonus centré. */
  index: number;
  scrollX: Animated.Value;
  /** Couleur des points de pagination. */
  dotColor: string;
  /** Couleur d'accent du bonus courant (numéro). */
  accent: string;
}

const PANEL_W = 168;

/** Utilisations restantes si un plafond est défini, sinon null. */
const remainingUses = (bonus?: Bonus): number | null => {
  if (!bonus || typeof bonus.usageLimit !== "number") return null;
  const used = bonus.usageCount ?? 0;
  return bonus.remainingUses ?? Math.max(0, bonus.usageLimit - used);
};

/**
 * Colonne droite de la carte de pagination — bloc « héro » du bonus courant.
 *
 * Parti pris : un numéro géant en filigrane ancre le panneau ; le contenu
 * (icône + nom + statut) se pose par-dessus, calé en bas. La pagination n'est
 * plus des points scolaires mais une JAUGE horizontale dont la portion pleine
 * suit le scroll — elle dit « où on en est » dans la pile de bonus.
 */
export const BonusPagerInfo = ({
  bonuses,
  index,
  scrollX,
  dotColor,
  accent,
}: BonusPagerInfoProps) => {
  const bonus = bonuses[index];
  const desc = getBonusDescriptor(bonus?.type);
  const status = useBonusStatus(bonus);
  const issuer = bonus?.fastFoodName || "yaammoo";
  const remaining = remainingUses(bonus);

  // Portion pleine de la jauge : suit la position de scroll de 0 (premier
  // bonus) à 100% (dernier bonus). N'atteint 100% QUE sur la toute dernière
  // carte — elle progresse en continu, une fraction par bonus.
  const gaugeWidth =
    bonuses.length > 1
      ? scrollX.interpolate({
          inputRange: bonuses.map((_, i) => i * CAROUSEL_INTERVAL),
          outputRange: bonuses.map(
            (_, i) => `${Math.round((i / (bonuses.length - 1)) * 100)}%`,
          ),
          extrapolate: "clamp",
        })
      : "100%";

  return (
    <View style={styles.wrap}>
      {/* Filigrane : le numéro du bonus, hors-flux, ancre le panneau. */}
      <Text
        style={[styles.ghost, { color: accent }]}
        numberOfLines={1}
        pointerEvents="none"
      >
        {index + 1}
      </Text>

      <View style={styles.content}>
        {/* Icône du type + émetteur, sur une ligne discrète. */}
        <View style={styles.topRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${accent}1f` }]}>
            <Ionicons name={desc.icon} size={13} color={accent} />
          </View>
          <Text style={styles.issuer} numberOfLines={1}>
            {issuer}
          </Text>
          {remaining !== null && (
            <Text style={styles.remaining} numberOfLines={1}>
              · {remaining} restante{remaining > 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {bonus?.name}
        </Text>

        {/* Statut + jauge de progression sur LA MÊME LIGNE. */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text
            style={[styles.statusText, { color: status.color }]}
            numberOfLines={1}
          >
            {status.label}
          </Text>
          <View style={styles.gaugeTrack}>
            <Animated.View
              style={[
                styles.gaugeFill,
                { width: gaugeWidth, backgroundColor: dotColor },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: PANEL_W, justifyContent: "flex-end", overflow: "hidden" },
  // Numéro géant en filigrane, calé en haut à droite, très basse opacité.
  ghost: {
    position: "absolute",
    top: -18,
    right: -6,
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 96,
    opacity: 0.07,
    letterSpacing: -4,
  },
  content: { gap: 6 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    // Sans width fixe, `issuer` (flexShrink) tronque avant de pousser `remaining`.
    width: "100%",
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  // flexShrink : un nom de fastfood trop long s'ellipse au lieu de déborder.
  issuer: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.6)",
    flexShrink: 1,
  },
  // Ne rétrécit pas : le compteur « N restantes » reste toujours lisible.
  remaining: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(0,0,0,0.35)",
    flexShrink: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
    color: "rgba(0,0,0,0.82)",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  // flexShrink : le label cède la place à la jauge s'il est long.
  statusText: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
  gaugeTrack: {
    // Prend l'espace restant sur la ligne du statut, à sa droite.
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    // Petite marge gauche pour ne pas coller le label.
    marginLeft: 4,
  },
  gaugeFill: { height: "100%", borderRadius: 2 },
});
