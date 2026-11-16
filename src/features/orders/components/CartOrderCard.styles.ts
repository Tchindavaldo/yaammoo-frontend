// Styles de CartOrderCard (extraits, R4).
import { StyleSheet } from "react-native";
import { DS } from "@/src/theme/ds";

export const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: DS.gray100,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "white",
  },
  avatarContainer: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarImage: {
    width: 48,
    height: 53,
    borderRadius: 24,
  },
  bikeAnimationTop: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightActionColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  deliveryIcon: {
    position: "absolute",
    bottom: -2,
    left: -2,
    padding: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: DS.accent,
  },
  summaryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  smallChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 5,
    marginBottom: 4,
  },
  chipInactive: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rankContainerRow: {
    flexDirection: "row",
    alignItems: "center",
    // Pas de fond : le rang se lit comme un simple numero, icone et texte noirs.
    // Cale en HAUT de la ligne et ecarte du bord droit (le bouton "annuler"
    // de la ligne du dessous ne doit pas paraitre colle au badge).
    alignSelf: "flex-start",
    marginRight: 8,
  },
  rankBadgeRow: {
    fontSize: 13,
    fontWeight: "900",
    color: DS.ink,
    marginLeft: 2,
  },
  summaryTitleContainer: {
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    maxWidth: "65%",
    justifyContent: "flex-start",
  },
  statusBadge: {
    backgroundColor: DS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9ca3af",
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 16,
    textAlign: "center",
  },
  // Pilule "annuler" : icone + libelle, au lieu du bouton rond icone seule.
  deleteBtn: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    // Soft : blanc + bordure grise, seule l'icône reste rouge.
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: DS.ink,
  },
  qtyLabel: {
    backgroundColor: "black",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qtyLabelText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  rankText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "900",
    color: DS.accent,
  },
  orderCountBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    zIndex: 10,
  },
  orderCountText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
  },
});
