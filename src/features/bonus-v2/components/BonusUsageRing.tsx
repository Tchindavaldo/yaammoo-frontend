import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Theme } from "@/src/theme";

interface BonusUsageRingProps {
  /** Utilisations déjà consommées. */
  used: number;
  /** Plafond d'utilisations autorisées. */
  limit: number;
  /** Couleur du bonus (arc de progression). */
  color: string;
  size?: number;
}

/**
 * Petit anneau de progression affichant `used/limit` au centre, l'arc coloré
 * sur le bord matérialisant la part déjà utilisée. Sert dans la ligne de
 * réclamation (états réclamés) à droite, à la place du bouton.
 */
export const BonusUsageRing: React.FC<BonusUsageRingProps> = ({
  used,
  limit,
  color,
  size = 46,
}) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = limit > 0 ? Math.max(0, Math.min(1, used / limit)) : 0;
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={Theme.colors.gray[200]}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={styles.label}>
        {used}/{limit}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "800", color: Theme.colors.dark },
});
