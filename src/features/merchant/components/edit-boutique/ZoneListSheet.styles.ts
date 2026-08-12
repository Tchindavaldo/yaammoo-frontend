import { StyleSheet } from "react-native";

/**
 * Styles du bottom sheet de consultation des zones. Reprend la charte de
 * l'app : slate pour le texte et les bordures, orange #ec4913 pour l'express,
 * vert #10b981 pour le periodique (memes accents que ZoneFormSheet).
 */
export const zoneListStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  /**
   * Hauteur fixe du contenu, calee sur celle du formulaire d'ajout/edition
   * (ZoneFormSheet) pour que les deux bottom sheets aient la meme taille.
   */
  body: { height: 250, flexDirection: "column" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  // Chips de zones (scroll horizontal)
  chipsRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  /** 2 zones : les deux bandeaux tiennent cote a cote, sans defilement. */
  chipsRowFill: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: {
    borderColor: "#ec4913",
    backgroundColor: "#ec4913",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextOn: {
    color: "#fff",
  },

  // Paire de cartes de prix (express / periodique)
  pricePair: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  /** Les rangees se partagent la hauteur du corps, sans defilement. */
  pricePairFlex: { flex: 1, minHeight: 0, marginTop: 0 },
  /** Rangees suivantes : espacement plus serre qu'avec les chips au-dessus. */
  pricePairNext: { marginTop: 10 },
  /** Derniere rangee : ne colle pas au pied du sheet. */
  pricePairLast: { marginBottom: 6 },
  /** Place vide d'une rangee de 2 incomplete (garde la carte a mi-largeur). */
  priceCardGhost: { flex: 1 },
  priceCard: {
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  priceCardExpress: {
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
  },
  priceCardSched: {
    borderColor: "#a7f3d0",
    backgroundColor: "#ecfdf5",
  },
  /**
   * Cartes de navigation entre les pages de creneaux ("+N" et retour). Ton
   * neutre : elles ne doivent se confondre ni avec l'express ni avec un
   * creneau periodique.
   */
  priceCardNav: {
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
  },
  priceCardMoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#475569",
  },
  /** Creneau en cours d'edition, quand il est affiche en carte. */
  priceCardActive: {
    borderColor: "#ec4913",
    backgroundColor: "#fff7ed",
  },
  tag: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 5,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
  },
  priceNote: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94a3b8",
    lineHeight: 15,
  },

  // Creneaux horaires (scroll horizontal)
  slotRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  /** Peu de creneaux : ils se partagent toute la largeur du sheet. */
  slotRowFill: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  slotFill: { flex: 1, paddingHorizontal: 6 },
  slot: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    gap: 2,
  },
  slotActive: {
    borderColor: "#ec4913",
    backgroundColor: "#fff7ed",
  },
  slotHour: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
  },
  slotPrice: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  slotPriceActive: { color: "#ec4913" },

  // ---- Variante C : zone unique (bandeau + ligne express + creneaux) ----
  /** Bandeau sombre nommant la zone, quand la boutique n'en a qu'une. */
  detected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedPin: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  detectedTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#fff",
  },
  detectedSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.62)",
  },
  /** 2 zones : deux bandeaux cote a cote, un peu plus serres. */
  detectedCompact: {
    flex: 1,
    gap: 8,
    paddingHorizontal: 10,
  },
  /** Bandeau de la zone non affichee : meme forme, en clair. */
  detectedOff: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detectedPinOff: { backgroundColor: "#e2e8f0" },
  detectedTitleOff: { color: "#0f172a" },
  detectedSubOff: { color: "#94a3b8" },
  noSlot: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "500",
    color: "#94a3b8",
  },
  empty: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: "500",
    color: "#94a3b8",
    textAlign: "center",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    fontSize: 11,
    fontWeight: "500",
    color: "#94a3b8",
    textAlign: "center",
  },
});
