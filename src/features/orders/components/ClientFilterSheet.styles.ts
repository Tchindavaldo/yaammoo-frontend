import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme";

/**
 * Styles du ClientFilterSheet. Volontairement PROPRES au client : aucun
 * partage avec le sheet marchand, pour que les deux évoluent séparément.
 */
export const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Hauteur AUTO : les créneaux vivent désormais dans leur propre sous-sheet,
    // le contenu restant est court et ne doit pas laisser d'espace vide.
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Ligne des 2 cards de lot de dates (même gabarit que l'ancienne ligne de cards).
  dateRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
  },
  // Chips de statut du sheet : répartis sur toute la largeur.
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statusChip: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "10",
  },
  statusChipActive: { backgroundColor: Theme.colors.primary },
  statusChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  statusChipTextActive: { color: "#fff" },
  // Pastille d'angle (même principe que `tileBadge` de la grille horaire) :
  // hors du flux, le texte du chip garde toute la largeur.
  // Pastille dans le flux du chip, juste après le libellé.
  statusBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  // Chip actif : fond primaire — le badge doit contraster DESSUS, donc blanc.
  statusBadgeActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#888780",
  },
  statusBadgeTextActive: { color: Theme.colors.primary },
  // Sous-sheet des créneaux horaires.
  slotSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1916",
  },
  // Emplacement de la ligne de dates : hauteur FIXE pour que le sheet ne change
  // pas de taille selon le lot sélectionné (« Aujourd'hui » n'en liste aucune).
  dateChipsSlot: {
    height: 34,
    justifyContent: "center",
  },
  dateChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  // Peu de dates : les chips s'étirent pour couvrir toute la largeur.
  dateChipsRowFill: {
    flexGrow: 1,
  },
  dateChip: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "10",
  },
  // Chip inerte (récap du jour / remplissage) : juste là pour couvrir la largeur.
  dateChipEmpty: {
    backgroundColor: Theme.colors.primary + "10",
  },
  dateChipEmptyText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  // Cards de choix du lot de dates (ligne du bas).
  scopeCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EFEDE6",
    backgroundColor: "#FAF9F6",
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
    marginBottom: 8,
  },
  // Card active : pas de bordure marquée, c'est le FOND qui porte l'état.
  scopeCardActive: {
    borderColor: "transparent",
    backgroundColor: Theme.colors.primary + "1A",
  },
  scopeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1916",
    // 2 lignes réservées (minHeight, pas height : une hauteur fixe rognait la
    // descente des lettres) : les 3 cards gardent la même hauteur.
    lineHeight: 15,
    minHeight: 30,
  },
  // Liste des modes : une ligne cochable par mode.
  modeList: {
    marginTop: 14,
  },
  // Ligne des 3 cards de mode (express / sur place / créneaux).
  modeCardRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
    marginTop: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  // Ligne cochée : aucun fond, seuls l'icône et le texte passent en noir.
  rowActive: {},
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1916",
  },
  // Ligne cochée : libellé en primaire (seul repère, la ligne n'a pas de fond).
  rowLabelActive: {
    color: Theme.colors.primary,
  },
  // Card de dates active : reste en noir.
  scopeLabelActive: {
    color: "#1A1916",
  },
  pastBar: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  // Grille de tuiles (design Extra du sheet home).
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 8,
    paddingRight: 6,
  },
  tile: {
    alignItems: "center",
  },
  tileIcon: {
    width: 62,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F7F6F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  tileIconActive: {
    borderColor: "#1A1916",
  },
  tileBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#1A1916",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // Non coché : badge discret sur fond blanc.
  tileBadgeIdle: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E3DC",
  },
  tileBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  tileBadgeTextIdle: {
    color: "#888780",
  },
  // Badge de compteur des lignes cochables.
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EFEDE6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  // Badge d'une ligne cochée : primaire, comme son icône et son libellé.
  countBadgeRowActive: {
    backgroundColor: Theme.colors.primary,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888780",
  },
  countTextActive: {
    color: "#fff",
  },
  tileHour: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    color: "#1A1916",
  },
  tileLabelActive: {
    color: "#1A1916",
  },
  empty: {
    fontSize: 13,
    color: "#A8A7A2",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
