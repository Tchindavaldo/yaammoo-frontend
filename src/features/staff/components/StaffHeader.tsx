import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { DS, Theme } from "@/src/theme";
import { HEADER_GRADIENT } from "@/src/theme/ds";
import { ST } from "./staffTheme";

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onHeightChange?: (height: number) => void;
}

/**
 * En-tête blanc plein de l'écran Personnel (maquette : titre, sous-titre,
 * pastille Retour). Copie simplifiée de TabHeader sans flou (R16).
 */
export const StaffHeader: React.FC<Props> = ({ title, subtitle, right, onHeightChange }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top }]}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      {/* Dégradé orange doux des headers de page (comme TabHeader). */}
      {HEADER_GRADIENT && (
        <LinearGradient
          colors={[DS.accent + "0A", DS.accent + "33"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Espacements de TabHeader (panier, boutique, notifications).
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
  texts: { flexShrink: 1 },
  title: { fontSize: 24, fontWeight: "bold", color: ST.ink },
  subtitle: { fontSize: 13, fontWeight: "600", color: ST.accent, marginTop: 2 },
});
