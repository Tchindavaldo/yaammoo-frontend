import { Theme } from "@/src/theme";

/**
 * Palette de l'écran Personnel. Copie de `broadcastTheme` (R16 : l'écran
 * Notifications garde la sienne), complétée des teintes propres au personnel.
 */
export const ST = {
  ink: "#141416",
  text2: "#3A3A3F",
  muted: "#6C6C70",
  faint: "#8E8E93",
  surface: "#F5F5F7",
  line: "#ECECF0",
  track: "#E4E4E8",
  idle: "#D6D6DB",
  accent: Theme.colors.primary,
  /** Accent assombri : texte orange lisible sur fond blanc. */
  accentInk: "#cb3f10",
  accentText: "#B23A0E",
  accentTint: "rgba(236,73,19,0.1)",
  accentWash: "rgba(236,73,19,0.07)",
  /** Accent éclairci : lisible sur la carte sombre. */
  accentOnInk: "#FF9A70",
  success: "#1F9D55",
  danger: "#B42318",
  backdrop: "rgba(20,20,22,0.45)",
};

/** Étiquettes en capitales (sections, légendes). */
export const capsLabel = {
  fontSize: 11,
  fontWeight: "700" as const,
  letterSpacing: 0.8,
  color: ST.muted,
};
