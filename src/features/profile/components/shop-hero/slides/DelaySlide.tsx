"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Polyline, Text as SvgText } from "react-native-svg";
import { BODY_H, LETTERS, Slide, SlideBody, SlideStats } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/**
 * S15 — delai moyen commande -> remise, par jour (minutes), en courbe ;
 * le pire jour en orange. Donnees d'EXEMPLE.
 */
const MINUTES = [18, 22, 16, 25, 28, 34, 15];
const PAD_X = 22;
const TOP = 26; // place pour l'etiquette au-dessus du point le plus haut
const BOTTOM = 26; // place pour les lettres des jours

export const DelaySlide: React.FC = () => {
  const [w, setW] = useState(0);
  const max = Math.max(...MINUTES);
  const min = Math.min(...MINUTES);
  const plotH = BODY_H - TOP - BOTTOM - 20;
  const xs = MINUTES.map((_, i) => PAD_X + (i * (w - 2 * PAD_X)) / (MINUTES.length - 1));
  const ys = MINUTES.map((m) => TOP + ((max - m) / Math.max(1, max - min)) * plotH);

  return (
    <Slide>
      <SlideBody>
        <View style={styles.fill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <Svg width={w} height={BODY_H}>
              <Polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} fill="none" stroke={DS.ink} strokeWidth={2.5} />
              {MINUTES.map((m, i) => (
                <React.Fragment key={i}>
                  <Circle cx={xs[i]} cy={ys[i]} r={4} fill={m === max ? DS.accent : DS.ink} />
                  <SvgText x={xs[i]} y={ys[i] - 10} fontSize={10} textAnchor="middle" fill={DS.faint}>{`${m} min`}</SvgText>
                  <SvgText x={xs[i]} y={BODY_H - 10} fontSize={10} fontWeight="600" textAnchor="middle" fill={DS.faint}>{LETTERS[i]}</SvgText>
                </React.Fragment>
              ))}
            </Svg>
          )}
        </View>
      </SlideBody>
      <SlideStats
        items={[
          { value: "24 min", label: t("PRÉPARATION") },
          { value: "19 min", label: t("LIVRAISON") },
          { value: "43 min", label: t("TOTAL") },
        ]}
      />
    </Slide>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
