import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { ST } from "./staffTheme";

/**
 * - ink : fond noir (fiche membre) · light : gris clair (défaut)
 * - accent : orange (membre d'un rôle « Accès complet »)
 * - invited : contour pointillé (jamais connecté) · muted : accès suspendu
 * - white : fond blanc (avatars posés sur une carte grise)
 */
export type StaffAvatarVariant = "ink" | "light" | "accent" | "invited" | "muted" | "white";

const VARIANTS: Record<StaffAvatarVariant, { bg: string; fg: string }> = {
  ink: { bg: ST.ink, fg: "#fff" },
  light: { bg: ST.line, fg: ST.ink },
  accent: { bg: ST.accent, fg: ST.ink },
  invited: { bg: "#fff", fg: ST.muted },
  muted: { bg: ST.track, fg: ST.faint },
  white: { bg: "#fff", fg: ST.ink },
};

interface Props {
  label: string;
  size?: number;
  variant?: StaffAvatarVariant;
  /** Liseré pour les piles d'avatars (couleur du fond de la carte). */
  ringColor?: string;
  style?: ViewStyle;
}

/** Pastille d'initiales du personnel. */
export const StaffAvatar: React.FC<Props> = ({
  label,
  size = 40,
  variant = "light",
  ringColor,
  style,
}) => {
  const { bg, fg } = VARIANTS[variant];
  const invited = variant === "invited";
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        invited && styles.invited,
        !invited && ringColor ? { borderWidth: 2, borderColor: ringColor } : null,
        style,
      ]}
    >
      <Text style={[styles.text, { color: fg, fontSize: Math.round(size * 0.35) }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  invited: { borderWidth: 1.5, borderStyle: "dashed", borderColor: ST.faint },
  text: { fontWeight: "800" },
});
