import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
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
/** Demi-largeur du fondu d'un élément, en fraction de carte. */
const HALF = 0.15;

/**
 * Police Ionicons (clé de `Ionicons.font`) : le glyphe est rendu dans un
 * `Animated.Text` pour que sa couleur suive `scrollX` — un `Ionicons` animé
 * plante (`setNativeProps` absent de son `Text` interne).
 */
const ICON_FONT = Object.keys(Ionicons.font)[0];

type Color = Animated.AnimatedInterpolation<string> | string;

/** Couleur interpolée d'un bonus à l'autre (continu sur `scrollX`). */
const colorAt = (scrollX: Animated.Value, colors: string[]): Color =>
  colors.length > 1
    ? scrollX.interpolate({
        inputRange: colors.map((_, i) => i * CAROUSEL_INTERVAL),
        outputRange: colors,
        extrapolate: "clamp",
      })
    : colors[0];

/** Suites de valeurs identiques consécutives : `[début, fin]` par valeur. */
const runsOf = (keys: string[]) => {
  const runs: { from: number; to: number }[] = [];
  keys.forEach((k, i) => {
    const last = runs[runs.length - 1];
    if (last && keys[last.to] === k) last.to = i;
    else runs.push({ from: i, to: i });
  });
  return runs;
};

/**
 * Opacité d'une suite : fondu court (±`HALF`) centré à mi-chemin + `offset`
 * de chaque frontière — même formule que `BPFadeStack.fade` (iOS).
 */
const runOpacity = (
  scrollX: Animated.Value,
  run: { from: number; to: number },
  n: number,
  offset: number,
) => {
  const input: number[] = [];
  const output: number[] = [];
  if (run.from > 0) {
    const c = run.from - 0.5 + offset;
    input.push(c - HALF, c + HALF);
    output.push(0, 1);
  }
  if (run.to < n - 1) {
    const c = run.to + 0.5 + offset;
    input.push(c - HALF, c + HALF);
    output.push(1, 0);
  }
  if (!input.length) return 1;
  return scrollX.interpolate({
    inputRange: input.map((p) => p * CAROUSEL_INTERVAL),
    outputRange: output,
    extrapolate: "clamp",
  });
};

/**
 * Un élément du panneau : une vue par suite de valeurs identiques, superposées.
 * Un texte qui ne change pas d'un bonus à l'autre n'a qu'une vue : il ne bouge
 * pas. Chaque élément bascule à son propre moment (`offset`).
 */
const FadeStack = ({
  keys,
  offset,
  scrollX,
  style,
  render,
}: {
  keys: string[];
  offset: number;
  scrollX: Animated.Value;
  style: StyleProp<ViewStyle>;
  render: (index: number) => React.ReactNode;
}) => (
  <View style={style} pointerEvents="none">
    {runsOf(keys).map((run) => (
      <Animated.View
        key={run.from}
        style={[styles.fill, { opacity: runOpacity(scrollX, run, keys.length, offset) }]}
      >
        {render(run.from)}
      </Animated.View>
    ))}
  </View>
);

/**
 * Colonne droite de la carte de pagination — bloc « héro » du bonus courant.
 *
 * **Panneau FIXE, chaque élément animé seul** (même logique que `BPHeroPanel`
 * côté iOS) : couleurs (icône, badge, filigrane, statut, jauge) interpolées en
 * continu ; textes et glyphe changés chacun à son moment par un court fondu,
 * seulement s'ils diffèrent ; jauge remplie de 0 (1er) à plein (dernier).
 */
export const BonusPagerInfo = ({ bonuses, scrollX }: BonusPagerInfoProps) => {
  const n = bonuses.length;
  if (!n) return <View style={styles.wrap} />;
  const descs = bonuses.map((b) => getBonusDescriptor(b.type));
  const colors = descs.map((d) => d.color ?? Theme.colors.primary);
  const statuses = bonuses.map((b) => statusOf(b));
  const tint = colorAt(scrollX, colors);
  const badgeBg = colorAt(scrollX, colors.map((c) => `${c}1f`));
  const ghostColor = colorAt(scrollX, colors.map((c) => `${c}12`));
  const statusColor = colorAt(scrollX, statuses.map((s) => s.color));
  const gaugeWidth =
    n > 1
      ? scrollX.interpolate({
          inputRange: [0, (n - 1) * CAROUSEL_INTERVAL],
          outputRange: [0, GAUGE_W],
          extrapolate: "clamp",
        })
      : GAUGE_W;

  const issuerKeys = bonuses.map((b) => `${b.fastFoodName || "yaammoo"}|${remainingUses(b) ?? ""}`);

  return (
    <View style={styles.wrap}>
      <FadeStack
        keys={bonuses.map((_, i) => String(i))}
        offset={-0.2}
        scrollX={scrollX}
        style={styles.ghostBox}
        render={(i) => (
          <Animated.Text style={[styles.ghost, { color: ghostColor }]} numberOfLines={1}>
            {i + 1}
          </Animated.Text>
        )}
      />
      <Animated.View style={[styles.badge, { backgroundColor: badgeBg }]} />
      <FadeStack
        keys={descs.map((d) => String(d.icon))}
        offset={-0.1}
        scrollX={scrollX}
        style={styles.badge}
        render={(i) => (
          <View style={styles.center}>
            <Animated.Text style={[styles.glyph, { color: tint }]}>
              {String.fromCodePoint(Number(Ionicons.glyphMap[descs[i].icon] ?? 0))}
            </Animated.Text>
          </View>
        )}
      />
      <FadeStack
        keys={issuerKeys}
        offset={-0.05}
        scrollX={scrollX}
        style={styles.issuerBox}
        render={(i) => {
          const remaining = remainingUses(bonuses[i]);
          return (
            <Text style={styles.issuer} numberOfLines={1}>
              {bonuses[i].fastFoodName || "yaammoo"}
              {remaining !== null && (
                <Text style={styles.remaining}>
                  {"  "}· {remaining} restante{remaining > 1 ? "s" : ""}
                </Text>
              )}
            </Text>
          );
        }}
      />
      <FadeStack
        keys={bonuses.map((b) => b.name)}
        offset={0}
        scrollX={scrollX}
        style={styles.nameBox}
        render={(i) => (
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {bonuses[i].name}
          </Text>
        )}
      />
      <Animated.View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <FadeStack
        keys={statuses.map((s) => s.label)}
        offset={0.1}
        scrollX={scrollX}
        style={styles.statusBox}
        render={(i) => (
          <Animated.Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {statuses[i].label}
          </Animated.Text>
        )}
      />
      <View style={styles.gaugeTrack}>
        <Animated.View style={[styles.gaugeFill, { width: gaugeWidth, backgroundColor: tint }]} />
      </View>
    </View>
  );
};

const ROW_Y = 51;
const ROW_H = 14;

const styles = StyleSheet.create({
  // Hauteur = ligne icône 22 + 6 + nom 17 + 6 + statut 14.
  wrap: { width: PANEL_W, height: 65, alignSelf: "flex-end", overflow: "hidden" },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  glyph: { fontFamily: ICON_FONT, fontSize: 13, lineHeight: 15 },
  // Numéro géant en filigrane, calé en haut à droite.
  ghostBox: { position: "absolute", top: -18, right: -6, width: 140, height: 96 },
  ghost: {
    fontSize: 96,
    fontWeight: "900",
    lineHeight: 96,
    letterSpacing: -4,
    textAlign: "right",
  },
  badge: { position: "absolute", top: 0, left: 0, width: 22, height: 22, borderRadius: 7 },
  issuerBox: { position: "absolute", top: 0, left: 28, right: 0, height: 22, justifyContent: "center" },
  issuer: { fontSize: 11, fontWeight: "700", color: "rgba(0,0,0,0.6)", lineHeight: 22 },
  remaining: { fontSize: 10, fontWeight: "600", color: "rgba(0,0,0,0.35)" },
  nameBox: { position: "absolute", top: 28, left: 0, right: 0, height: 17 },
  name: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 17,
    color: "rgba(0,0,0,0.82)",
  },
  statusDot: {
    position: "absolute",
    top: ROW_Y + (ROW_H - 7) / 2,
    left: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBox: { position: "absolute", top: ROW_Y, left: 12, right: GAUGE_W + 9, height: ROW_H },
  statusText: { fontSize: 11, fontWeight: "800", lineHeight: ROW_H },
  // Jauge fixe, calée à droite de la ligne du statut.
  gaugeTrack: {
    position: "absolute",
    right: 0,
    top: ROW_Y + (ROW_H - 3) / 2,
    width: GAUGE_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", borderRadius: 2 },
});
