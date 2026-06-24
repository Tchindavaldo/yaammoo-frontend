import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HeaderPillProps {
  /** Texte affiché dans la pilule (ex. "Tout marquer lu", "Retirer", "Ajouter"). */
  label: string;
  /** Icône Ionicons optionnelle à gauche du texte. */
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** Variante pleine (fond orange, texte blanc) au lieu de l'orange clair par défaut. */
  filled?: boolean;
  /** Affiche un loader à la place de l'icône et désactive le press. */
  loading?: boolean;
}

/**
 * Pilule d'action de la zone droite du header, calquée sur le bouton
 * "Tout marquer lu" de la page notifications (orange clair, icône + texte).
 */
export const HeaderPill: React.FC<HeaderPillProps> = ({
  label,
  icon,
  onPress,
  filled = false,
  loading = false,
}) => {
  const Wrapper: any = onPress && !loading ? TouchableOpacity : View;
  const tint = filled ? "#fff" : Theme.colors.primary;
  return (
    <Wrapper
      style={[styles.pill, filled && styles.pillFilled, loading && { opacity: 0.7 }]}
      onPress={loading ? undefined : onPress}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        !!icon && <Ionicons name={icon} size={16} color={tint} />
      )}
      <Text style={[styles.text, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  pillFilled: {
    backgroundColor: Theme.colors.primary,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
