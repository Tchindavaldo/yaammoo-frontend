// Styles de WorkOrderPanel (copie de OrderManagePanel, R16).
import { StyleSheet } from "react-native";
import { DS } from "@/src/theme/ds";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  // Barre fixe (stats + chips) calée sous le header de page, en blur.
  fixedBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "white",
    // Trait de séparation bas : délimite la barre fixe de la liste.
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    alignItems: "flex-start",
    backgroundColor: DS.gray100,
    padding: 10,
    borderRadius: 10,
  },
  statVal: {
    fontSize: 31,
    fontWeight: "900",
    color: "black",
  },
  statLbl: {
    fontSize: 11,
    color: "rgba(0,0,0,0.44)",
    fontWeight: "bold",
    marginTop: 2,
  },
  // Barre de filtres en bas : chips de statut + bouton du bottom sheet.
  // Rappel « autres dates » posé juste au-dessus de la barre de filtres.
  noticeDock: { position: "absolute", left: 0, right: 0, paddingBottom: 8 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    // Voile clair par-dessus le blur : lisible sans masquer le scroll derrière.
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 10,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 100,
  },
  // Message de liste vide : centré verticalement dans l'espace disponible
  // (hauteur imposée en ligne via `emptyStateHeight`).
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "center",
  },
  // Rappel de fin de liste : commandes passées non traitées.
  pastNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary + "10",
  },
  pastNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  groupCountBadge: {
    backgroundColor: "#FFF",
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: {
    fontSize: 10,
    color: "#5F5E5A",
    fontWeight: "500",
  },
  btnLaunchGroup: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: DS.accentAlpha(0.1),
    borderWidth: 1,
    borderColor: DS.accent,
  },
  btnLaunchGroupText: {
    fontSize: 9,
    fontWeight: "900",
    color: DS.accent,
    textTransform: "uppercase",
  },
  btnLaunchGroupLaunched: {
    backgroundColor: "#C0DD97",
    borderColor: "#C0DD97",
  },
  btnLaunchGroupTextLaunched: {
    color: "#27500A",
  },
  // Sous-tabs En attente / En cours (intérieur d'un groupe déroulé)
  subTabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#F5F4F0",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  subTabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888780",
  },
  subTabLabelActive: {
    color: "#1A1916",
  },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5E4DF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subTabBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  subTabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#5F5E5A",
  },
  subTabBadgeTextActive: {
    color: "white",
  },
  subTabEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  subTabEmptyText: {
    fontSize: 12,
    color: "#A8A7A2",
    fontStyle: "italic",
  },
});
