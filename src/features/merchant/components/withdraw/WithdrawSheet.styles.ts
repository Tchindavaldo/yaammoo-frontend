import { StyleSheet } from "react-native";
import { DS } from "@/src/theme/ds";

/**
 * Styles de la feuille de RETRAIT — gabarit repris du sheet du panier groupe
 * (`CartGroupedDeliverySheet.styles`) : titre 15, stepper a points, cards
 * radius 12 sur fond slate, pied « retour rond + pilule orange » ou capsule
 * sombre. Copie dediee (R16), couleurs via `DS` uniquement (R18).
 */

/**
 * Hauteur FIXE du contenu de la feuille (la bande safe-area s'y ajoute en
 * `paddingBottom`). Calee sur la maquette (330 avec la bande d'un iPhone) :
 * aucune etape ne fait sauter la feuille.
 */
export const WITHDRAW_SHEET_HEIGHT = 296;

export const ws = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: DS.sheetScrim },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    // Le cache « en cours / reussi » couvre toute la feuille, coins compris.
    overflow: "hidden",
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  body: { flex: 1 },

  // --- En-tete d'etape : titre a gauche, stepper a droite ---
  stepHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: "bold", color: DS.slate900 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: DS.slate300 },
  stepDotActive: { width: 14, backgroundColor: DS.accent },
  stepSub: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 11.5,
    fontWeight: "600",
    color: DS.slate500,
    lineHeight: 16,
  },
  /** Recap : plus de description sous le titre, seule une respiration. */
  stepGap: { height: 12 },

  // --- Cards ---
  cards: { flexDirection: "row", gap: 8 },
  card: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: DS.slate50,
    borderWidth: 1,
    borderColor: DS.slate200,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  cardActive: { borderColor: DS.accent, backgroundColor: DS.accentAlpha(0.08) },
  /** Numero non configure : carte vide, bordure en tirets. */
  cardEmpty: {
    justifyContent: "center",
    backgroundColor: DS.bg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: DS.slate300,
  },
  cardTop: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.accentAlpha(0.08),
    alignItems: "center",
    justifyContent: "center",
  },
  iconDotActive: { backgroundColor: DS.bg },
  iconDotEmpty: { backgroundColor: DS.slate100 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: DS.slate300,
  },
  radioOn: {
    borderWidth: 0,
    backgroundColor: DS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 12, fontWeight: "bold", color: DS.slate900 },
  cardAmount: { fontSize: 18, fontWeight: "800", color: DS.slate900 },
  cardPhone: { fontSize: 15, fontWeight: "800", color: DS.slate900 },
  cardSub: { fontSize: 10, fontWeight: "600", color: DS.slate500 },
  cardEmptyText: { fontSize: 10.5, fontWeight: "600", color: DS.slate500, lineHeight: 14 },
  badgeFree: {
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "bold",
    color: DS.successInk,
    backgroundColor: DS.successTint,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeFee: {
    overflow: "hidden",
    fontSize: 10,
    fontWeight: "bold",
    color: DS.accentText,
    backgroundColor: DS.accentAlpha(0.1),
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  // --- Recap (C3a) ---
  recapCard: {
    flex: 1,
    gap: 4,
    backgroundColor: DS.slate50,
    borderWidth: 1,
    borderColor: DS.slate200,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
  },
  recapLabel: { fontSize: 10, fontWeight: "600", color: DS.slate500 },
  recapValue: { fontSize: 15, fontWeight: "800", color: DS.slate900 },
  recapDebit: { color: DS.accentText },
  recapNet: { flexDirection: "row", alignItems: "center", gap: 6 },
  feeRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: DS.slate50,
    borderWidth: 1,
    borderColor: DS.slate200,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: DS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  feeLabel: { flex: 1, fontSize: 12.5, fontWeight: "bold", color: DS.slate900 },
  feeValue: { fontSize: 13, fontWeight: "800", color: DS.slate900 },
  receiveRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: DS.slate50,
    borderWidth: 1,
    borderColor: DS.slate200,
  },
  receiveLabel: { fontSize: 12.5, fontWeight: "600", color: DS.slate600 },
  receiveValue: { fontSize: 13, fontWeight: "800", color: DS.slate900 },

  // --- Pied ---
  spacer: { flex: 1, minHeight: 8 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: DS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 99,
    backgroundColor: DS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnLabel: { fontSize: 15, fontWeight: "bold", color: DS.onInk },

  /** Capsule sombre du pied (etape 2) : le champ montant n'y est qu'un LEURRE. */
  amountCapsule: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DS.inkCapsule,
    borderRadius: 99,
    paddingLeft: 14,
    paddingRight: 5,
  },
  amountDecoy: {
    flex: 1,
    padding: 0,
    color: DS.onInk,
    fontSize: 15,
    fontWeight: "bold",
  },
  /** Leurre pendant que la capsule flottante est ouverte : texte invisible. */
  amountDecoyMuted: { color: "transparent" },
  maxChip: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: DS.onInkFill,
    fontSize: 10.5,
    fontWeight: "bold",
    color: DS.onInk,
  },
  capsuleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
