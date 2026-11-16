// Styles de l'ecran panier (`app/(tabs)/cart.tsx`), extraits pour R4.
import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";

export const cartScreenStyles = StyleSheet.create({
  // Recap du panier, pose juste au-dessus de la navbar.
  zoneFooterBar: {
    position: "absolute",
    left: 0,
    right: 0,
    // Fond transparent : le blur est porte par CartZoneFooterBar lui-meme.
    overflow: "hidden",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  listContent: {
    // Pas de padding horizontal ni de gap : les CartOrderCard portent leur
    // propre marge interne et se touchent, comme dans le suivi des commandes.
    paddingVertical: 1,
  },
  emptyText: {
    marginTop: 10,
    color: Theme.colors.gray[400],
    fontSize: 16,
    textAlign: "center",
  },
  payFooterCapsule: {
    position: "absolute",
    width: "96%",
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: "center",
    zIndex: 1000,
    left: "2%",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  payerBtnHome: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.accent,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 40,
  },
  deleteMsgWrapper: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "center",
  },
  deleteMenuTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  deleteMsg: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
