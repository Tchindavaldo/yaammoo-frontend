import { DS } from "@/src/theme/ds";

/**
 * Palette de l'écran Personnel, adossée au design system global (`DS`, dont
 * elle est la référence visuelle).
 */
export const ST = {
  ink: DS.ink,
  text2: DS.text2,
  muted: DS.muted,
  faint: DS.faint,
  surface: DS.surface,
  line: DS.line,
  track: DS.track,
  idle: DS.idle,
  accent: DS.accent,
  accentInk: DS.accentInk,
  accentText: DS.accentText,
  accentTint: DS.accentTint,
  accentWash: DS.accentWash,
  accentOnInk: DS.accentOnInk,
  success: DS.success,
  danger: DS.dangerInk,
  backdrop: DS.backdrop,
};

/** Étiquettes en capitales (sections, légendes). */
export const capsLabel = {
  fontSize: 11,
  fontWeight: "700" as const,
  letterSpacing: 0.8,
  color: ST.muted,
};
