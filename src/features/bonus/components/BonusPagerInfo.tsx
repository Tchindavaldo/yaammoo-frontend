import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import type { Bonus } from "../types/bonus.types";
// Fonctions pures partagées avec le pied de page natif (`NativeBonusPager`).
import { remainingUses, statusOf } from "../utils/bonusPagerItem";
import { CAROUSEL_INTERVAL } from "./BonusCarousel";

interface BonusPagerInfoProps {
  bonuses: Bonus[];
  scrollX: Animated.Value;
}

const PANEL_W = 168;
/** Largeur fixe de la jauge (calée à droite de la ligne de statut). */
const GAUGE_W = 40;

/**
 * Colonne droite de la carte de pagination — bloc « héro » du bonus courant.
 *
 * **Panneau FIXE, plus de piste qui glisse.** Tout reste en place ; seul le
 * contenu varie en temps réel avec `scrollX` (même principe que
 * `BPFooterView.sync` côté iOS) :
 * - textes (filigrane, icône, émetteur, nom, statut) : un calque par bonus,
 *   superposés, en FONDU croisé (opacité 1 au centre, 0 à mi-chemin) ;
 * - fond du badge d'icône et couleur de la jauge : couleur interpolée d'un
 *   bonus à l'autre ;
 * - jauge : largeur continue de 0 (1er bonus) à pleine (dernier bonus).
 */
export const BonusPagerInfo = ({ bonuses, scrollX }: BonusPagerInfoProps) => {
  const n = bonuses.length;
  const colors = bonuses.map((b) => getBonusDescriptor(b.type).color);
  const first = colors[0] ?? Theme.colors.primary;
  const input = colors.map((_, i) => i * CAROUSEL_INTERVAL);
  const badgeBg =
    n > 1
      ? scrollX.interpolate({
          inputRange: input,
          outputRange: colors.map((c) => `${c}1f`),
          extrapolate: "clamp",
        })
      : `${first}1f`;
  const gaugeColor =
    n > 1
      ? scrollX.interpolate({ inputRange: input, outputRange: colors, extrapolate: "clamp" })
      : first;
  const gaugeWidth =
    n > 1
      ? scrollX.interpolate({
          inputRange: [0, (n - 1) * CAROUSEL_INTERVAL],
          outputRange: [0, GAUGE_W],
          extrapolate: "clamp",
        })
      : GAUGE_W;

  return (
    <View style={styles.wrap}>
      {/* Fond du badge partagé : seule sa couleur varie. */}
      <Animated.View style={[styles.iconBadge, styles.sharedBadge, { backgroundColor: badgeBg }]} />
      {bonuses.map((b, i) => (
        <TextLayer
          key={b.id ?? i}
          bonus={b}
          position={i}
          opacity={
            n > 1
              ? scrollX.interpolate({
                  inputRange: [
                    (i - 0.5) * CAROUSEL_INTERVAL,
                    i * CAROUSEL_INTERVAL,
                    (i + 0.5) * CAROUSEL_INTERVAL,
                  ],
                  outputRange: [0, 1, 0],
                  extrapolate: "clamp",
                })
              : 1
          }
        />
      ))}
      <View style={styles.gaugeTrack}>
        <Animated.View style={[styles.gaugeFill, { width: gaugeWidth, backgroundColor: gaugeColor }]} />
      </View>
    </View>
  );
};

/**
 * Calque texte d'UN bonus (filigrane, icône, émetteur, nom, statut), posé au
 * même endroit que les autres ; seule son opacité varie.
 */
const TextLayer = ({
  bonus,
  position,
  opacity,
}: {
  bonus: Bonus;
  position: number;
  opacity: Animated.AnimatedInterpolation<number> | number;
}) => {
  const desc = getBonusDescriptor(bonus.type);
  const accent = desc.color;
  const issuer = bonus.fastFoodName || "yaammoo";
  const remaining = remainingUses(bonus);
  const status = statusOf(bonus);

  return (
    <Animated.View style={[styles.layer, { opacity }]} pointerEvents="none">
      <Text style={[styles.ghost, { color: accent }]} numberOfLines={1}>
        {position + 1}
      </Text>
      <View style={styles.topRow}>
        <View style={styles.iconBadge}>
          <Ionicons name={desc.icon} size={13} color={accent} />
        </View>
        <View style={styles.topRowText}>
          <Text style={styles.issuer} numberOfLines={1}>
            {issuer}
          </Text>
          {remaining !== null && (
            <Text style={styles.remaining} numberOfLines={1}>
              · {remaining} restante{remaining > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {bonus.name}
      </Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
          {status.label}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Hauteur = ligne icône 22 + 6 + nom 17 + 6 + statut 14.
  wrap: { width: PANEL_W, height: 65, alignSelf: "flex-end", overflow: "hidden" },
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, gap: 6 },
  sharedBadge: { position: "absolute", top: 0, left: 0 },
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
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topRowText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
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
  // Laisse la place de la jauge partagée, à droite.
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 14,
    paddingRight: GAUGE_W + 9,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
  // Jauge fixe, calée en bas à droite (ligne du statut).
  gaugeTrack: {
    position: "absolute",
    right: 0,
    bottom: 5.5,
    width: GAUGE_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", borderRadius: 2 },
});
