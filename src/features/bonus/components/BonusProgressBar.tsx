import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Theme } from "@/src/theme";

interface BonusProgressBarProps {
  /** Ratio 0→1. */
  progress: number;
  color: string;
  /** Texte optionnel affiché au-dessus de la barre (ex. "3 / 5 commandes"). */
  label?: string;
  /** Couleur de la piste (défaut gris). Sur fond coloré : blanc translucide. */
  trackColor?: string;
}

/** Barre de progression fine et animée, réutilisable (cartes + roadmap). */
export const BonusProgressBar: React.FC<BonusProgressBarProps> = ({
  progress,
  color,
  label,
  trackColor,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={[styles.label, { color }]}>{label}</Text>}
      <View style={[styles.track, trackColor && { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: 6 },
  label: { fontSize: 12, fontWeight: "700" },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.gray[200],
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
});
