/**
 * Design system de l'application : SOURCE UNIQUE des couleurs.
 * Changer une valeur ici la change partout. Ne jamais réécrire une couleur de
 * marque ou de surface en dur dans un composant : importer `DS` (R18).
 *
 * Les valeurs reproduisent à l'identique le rendu d'origine de l'application.
 */
export const DS = {
  /** Fond des pages. */
  bg: "#FFFFFF",

  // --- Couleur de marque (orange) ---
  accent: "#ec4913",
  /** Variante légèrement plus vive (étoiles, cartes menu). */
  accentDeep: "#e8440a",
  /** Orange translucide : `DS.accentAlpha(0.1)`. */
  accentAlpha: (a: number) => `rgba(236,73,19,${a})`,
  /** Fonds pêche / orange très clairs. */
  accent50: "#fff7ed",
  accentSoft: "#fef3ec",
  accentCream: "#FDEBD0",
  accent200: "#fed7aa",

  // --- Neutres ---
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate500: "#64748b",
  slate600: "#475569",
  slate900: "#0f172a",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",

  // --- Palette de l'écran Personnel (référence minimaliste) ---
  ink: "#141416",
  text2: "#3A3A3F",
  muted: "#6C6C70",
  faint: "#8E8E93",
  surface: "#F5F5F7",
  line: "#ECECF0",
  track: "#E4E4E8",
  idle: "#D6D6DB",
  accentInk: "#cb3f10",
  /** Jaune du reseau MTN (pastille de solde). */
  mtn: "#f5b301",
  accentText: "#B23A0E",
  accentTint: "rgba(236,73,19,0.1)",
  accentWash: "rgba(236,73,19,0.07)",
  accentOnInk: "#FF9A70",
  // --- Texte et traits sur fond sombre (`ink`) : cartes flottantes ---
  onInk: "#FFFFFF",
  onInkMuted: "rgba(255,255,255,0.68)",
  onInkFill: "rgba(255,255,255,0.12)",
  onInkLine: "rgba(255,255,255,0.08)",
  /** Placeholder sur fond sombre. */
  onInkFaint: "rgba(255,255,255,0.5)",
  /** Capsule de saisie sombre posee dans un pied de sheet. */
  inkCapsule: "rgba(0,0,0,0.85)",
  /** Capsule flottante vitree (sur flou). */
  inkGlass: "rgba(0,0,0,0.4)",
  /** Teinte posee sur un voile floute (le flou seul ne noircit pas assez). */
  veilTint: "rgba(0,0,0,0.3)",
  /** Voile noir derriere une bottom sheet. */
  sheetScrim: "rgba(0,0,0,0.4)",
  /** Voile blanc translucide pose sur un flou clair (iOS). */
  frost: "rgba(255,255,255,0.45)",

  // --- États ---
  success: "#1F9D55",
  successStrong: "#16a34a",
  successInk: "#15803d",
  successTint: "rgba(22,163,74,0.1)",
  danger: "#ef4444",
  info: "#3b82f6",
  dangerInk: "#B42318",
  warning: "#F59E0B",
  backdrop: "rgba(20,20,22,0.45)",

  // --- Cartes menu aerees sur photo (HOME_DESIGN = "aere") ---
  star: "#f5a623",
  scrimTop: "rgba(0,0,0,0.35)",
  scrimNone: "rgba(0,0,0,0)",
  scrimMid: "rgba(0,0,0,0.55)",
  scrimEnd: "rgba(0,0,0,0.95)",
  onInkTrack: "rgba(255,255,255,0.28)",
} as const;

/**
 * Dégradé orange des headers de page (TabHeader, Personnel). false = fond blanc
 * uni ; repasser à true pour retrouver le dégradé.
 */
export const HEADER_GRADIENT = false;

export type DSColor = keyof typeof DS;
