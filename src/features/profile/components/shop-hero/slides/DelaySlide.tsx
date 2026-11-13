"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React, { useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle, Polyline, Text as SvgText } from "react-native-svg";
import { BODY_H, Slide, SlideBody, SlideStats, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { Bucket, axisLabel } from "../shopPeriod";
import { MerchantStats } from "../useMerchantStats";

/**
 * S15 — delai moyen commande -> remise par bucket (minutes), en courbe ;
 * le pire point en orange. Un bucket sans mesure n'a pas de point.
 */
const PAD_X = 22;
const TOP = 26; // place pour l'etiquette au-dessus du point le plus haut
const BOTTOM = 26; // place pour les etiquettes d'axe
const min = (n: number | null) => (n == null ? "–" : `${n} min`);

export const DelaySlide: React.FC<{ stats: MerchantStats; bucket: Bucket; version: number }> = ({ stats, bucket, version }) => {
  const grow = useGrow(version);
  const [w, setW] = useState(0);
  const s = stats.series;
  const vals = s.map((p) => p.delayMin);
  const known = vals.filter((v): v is number => v != null);
  const max = known.length ? Math.max(...known) : 1;
  const lo = known.length ? Math.min(...known) : 0;
  const plotH = BODY_H - TOP - BOTTOM - 20;
  const xs = s.map((_, i) => (s.length < 2 ? w / 2 : PAD_X + (i * (w - 2 * PAD_X)) / (s.length - 1)));
  const ys = vals.map((m) => TOP + ((max - (m ?? lo)) / Math.max(1, max - lo)) * plotH);
  const pts = vals.map((m, i) => (m == null ? null : `${xs[i]},${ys[i]}`)).filter(Boolean).join(" ");

  return (
    <Slide>
      <SlideBody>
        <View style={styles.fill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <Animated.View style={{ opacity: grow }}>
              <Svg width={w} height={BODY_H}>
                {known.length > 1 && <Polyline points={pts} fill="none" stroke={DS.ink} strokeWidth={2.5} />}
                {/* Sans mesure : ligne de base a 0, comme les barres vides des Ventes. */}
                {known.length === 0 && s.length > 0 && (
                  <Polyline points={xs.map((x) => `${x},${TOP + plotH}`).join(" ")} fill="none" stroke={DS.track} strokeWidth={2.5} />
                )}
                {s.map((p, i) => (
                  <React.Fragment key={p.start}>
                    {p.delayMin == null && known.length === 0 && <Circle cx={xs[i]} cy={TOP + plotH} r={4} fill={DS.track} />}
                    {p.delayMin != null && (
                      <>
                        <Circle cx={xs[i]} cy={ys[i]} r={4} fill={p.delayMin === max ? DS.accent : DS.ink} />
                        <SvgText x={xs[i]} y={ys[i] - 10} fontSize={10} textAnchor="middle" fill={DS.faint}>{`${p.delayMin} min`}</SvgText>
                      </>
                    )}
                    <SvgText x={xs[i]} y={BODY_H - 10} fontSize={10} fontWeight="600" textAnchor="middle" fill={DS.faint}>{axisLabel(bucket, p.start, i)}</SvgText>
                  </React.Fragment>
                ))}
              </Svg>
            </Animated.View>
          )}
        </View>
      </SlideBody>
      <SlideStats
        items={[
          { value: min(stats.delays.prep), label: t("PRÉPARATION") },
          { value: min(stats.delays.delivery), label: t("LIVRAISON") },
          { value: min(stats.delays.total), label: t("TOTAL") },
        ]}
      />
    </Slide>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
