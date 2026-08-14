import { Theme } from "@/src/theme";
import { StyleSheet } from "react-native";

/**
 * Palette : celle de l'app (`Theme` + gris slate des autres sheets du panier),
 * pas celle de la maquette. On garde la STRUCTURE du design « Panier -
 * Paiement » (cards de mode de livraison, récap, cards de réseau) mais
 * les couleurs sont celles du reste de l'app — blanc, gris slate, orange
 * `#ec4913` — pour que le sheet ne détonne pas avec `CartZoneFooterBar`,
 * `CartFilterOptionsSheet` et le reste du panier.
 */
export const C = {
  sheet: "#fff",
  surface: "#f8fafc",
  border: "#e2e8f0",
  ink: "#0f172a",
  inkSoft: "#475569",
  muted: "#94a3b8",
  mutedLight: "#cbd5e1",
  accent: Theme.colors.primary,
  accentSoft: "rgba(236,73,19,0.08)",
  chipBg: "#f1f5f9",
  ok: "#16a34a",
};

/**
 * Hauteur COMMUNE aux trois sheets du parcours de commande (groupage /
 * livraison groupée / paiement), mesurée sur le sheet de paiement.
 *
 * Elle est fixe : sans elle, chaque étape prenait la hauteur de son contenu et
 * le passage de l'une à l'autre faisait sauter le sheet. Le contenu qui déborde
 * scrolle à l'intérieur.
 */
export const SHEET_HEIGHT = 270;

export const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Hauteur fixe et partagee : les trois sheets du parcours se superposent
    // exactement, plus de saut d'une etape a l'autre.
    height: SHEET_HEIGHT,
    backgroundColor: C.sheet,
    // Meme rayon que les autres sheets du panier (CartPaymentTopCard : 18).
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    // Plus de handle en haut : le titre porte lui-meme la respiration.
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: C.ink,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 99,
    backgroundColor: C.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  // La hauteur du sheet est fixe : le contenu prend la place restante et
  // scrolle s'il deborde (plus de `flexGrow: 0`, qui le laissait au ras).
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  // Petites capitales espacees : meme convention que les libelles du recap
  // (`footLabel` de CartZoneFooterBar).
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: C.muted,
    marginBottom: 7,
  },
  labelSpaced: { marginTop: 14 },
  // --- Cards de mode de livraison (design d'origine) ---
  modes: { flexDirection: "row", gap: 8 },
  mode: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 9,
    gap: 2,
  },
  // Mode reellement paye : meme code couleur que les chips reseau.
  modeActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  modeLabel: { fontSize: 12.5, fontWeight: "bold", color: C.ink },
  modeSub: { fontSize: 10, fontWeight: "600", color: C.muted },
  modeFee: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "bold",
    color: C.accent,
  },
  modeFeeOff: { color: C.mutedLight },
  // --- Récapitulatif ---
  recap: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recapRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 3,
  },
  recapLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: C.inkSoft,
  },
  recapLabelDim: { color: C.mutedLight },
  recapValue: { fontSize: 13, fontWeight: "700", color: C.ink },
  // Trait plein : `borderStyle: "dashed"` sur une seule bordure n'est pas rendu
  // de facon fiable sur Android.
  dash: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  totalLabel: { fontSize: 14, fontWeight: "bold", color: C.ink },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.accent,
  },
  // --- Moyen de paiement ---
  pays: { flexDirection: "row", gap: 10 },
  // Le logo et la ligne de prefixes ont ete retires : `minHeight` conserve la
  // hauteur d'origine de la chip (badge 32 + 2 x 10 de padding), le libelle
  // etant desormais seul et centre.
  pay: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  // Selection : meme code couleur que les chips reseau de l'app (fond orange
  // translucide + bordure orange), pas la bordure noire de la maquette.
  payActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  payName: { fontSize: 13, fontWeight: "700", color: C.inkSoft },
  payNameActive: { color: C.accent },
  // --- Capsule de paiement ---
  // Emplacement plein ecran : la capsule s'y ancre elle-meme par son `bottom`
  // (elle est en `position: absolute`), et peut donc remonter par-dessus le
  // sheet a l'ouverture du clavier sans etre rognee.
  capsuleSlot: { ...StyleSheet.absoluteFillObject },
});
