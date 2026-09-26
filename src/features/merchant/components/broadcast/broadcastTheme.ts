import { Theme } from "@/src/theme";

/** Palette de l'écran Notifications boutique (maquette « Bento + calendrier »). */
export const BC = {
  ink: "#141416",
  muted: "#6C6C70",
  faint: "#8E8E93",
  surface: "#F5F5F7",
  line: "#ECECF0",
  track: "#E4E4E8",
  idle: "#D6D6DB",
  accent: Theme.colors.primary,
  /** Accent assombri : texte orange lisible sur fond blanc. */
  accentInk: "#cb3f10",
  accentTint: "rgba(236,73,19,0.1)",
};

/** Étiquettes en capitales (dates, légendes). */
export const capsLabel = {
  fontSize: 10,
  fontWeight: "600" as const,
  letterSpacing: 0.8,
  color: BC.muted,
};
