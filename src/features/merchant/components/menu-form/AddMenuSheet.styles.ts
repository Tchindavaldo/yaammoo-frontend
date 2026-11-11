import { Theme } from "@/src/theme";
import { StyleSheet } from "react-native";
import { MODAL_HEIGHT } from "./menuFormConstants";

/** Styles du formulaire menu (`AddMenuSheetMultiStep` et ses étapes), extraits (R4). */
export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // Voile sombre par-dessus le flou.
  overlayDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  // Conteneur de la sheet : hauteur fixe en px (identique sur tous les écrans).
  sheetWrap: {
    height: MODAL_HEIGHT,
  },
  sheet: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  // Mode intégré : occupe toute la zone liste, sans radius ni overlay.
  embeddedContainer: {
    flex: 1,
  },
  sheetEmbedded: {
    flex: 1,
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: Theme.colors.gray[100],
    marginHorizontal: Theme.spacing.lg,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Theme.colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Theme.spacing.lg,
    // Débattement bas pour que le champ focus puisse remonter au-dessus du clavier.
    paddingBottom: Theme.spacing.lg + 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Theme.colors.gray[700],
    marginBottom: Theme.spacing.md,
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  imageSlot: {
    flex: 1,
    aspectRatio: 1.35,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Theme.colors.gray[100],
  },
  imageSlotDisabled: {
    opacity: 0.5,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 11,
    color: Theme.colors.gray[400],
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  uploadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: Theme.colors.gray[50],
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.dark,
  },
  // Nom : un peu moins haut.
  inputCompact: {
    paddingVertical: Theme.spacing.sm + 8,
  },
  // Input focus : bordure orange.
  inputFocused: {
    borderColor: Theme.colors.primary,
  },
  // Input en erreur de validation : bordure rouge.
  inputError: {
    borderColor: Theme.colors.danger,
  },
  priceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  priceTabs: {
    flexDirection: "row",
    gap: 6,
  },
  priceTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
  },
  priceTabActive: {
    backgroundColor: Theme.colors.primary,
  },
  priceTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.gray[500],
  },
  priceTabTextActive: {
    color: "white",
  },
  priceDescRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  priceCol: {
    width: 90,
    textAlign: "center",
  },
  descCol: {
    flex: 1,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    gap: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  // --- Page détails : sections extras/boissons (chips + ligne d'édition) ---
  // ScrollView horizontale des chips, à côté du label (ne wrappe jamais).
  chipScroll: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  chipScrollContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  itemChip: {
    paddingVertical: 5,
    maxWidth: 140,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Theme.colors.gray[700],
  },
  chipSeparator: {
    fontSize: 13,
    color: Theme.colors.gray[300],
  },
  itemChipTextActive: {
    color: Theme.colors.primary,
  },
  // Compteur : texte coloré sans fond, juste à côté du label.
  itemCountText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  // Inputs nom/prix de la ligne d'édition : un peu moins hauts.
  itemInputCompact: {
    paddingVertical: 9,
  },
  // Boutons supprimer / valider de la ligne d'édition.
  itemActionBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
    alignSelf: "stretch",
  },
  itemValidateBtn: {
    backgroundColor: Theme.colors.primary,
  },
  // --- Disponibilité (ligne 1) ---
  availRow: {
    flexDirection: "row",
    gap: Theme.spacing.sm,
  },
  availBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    backgroundColor: "white",
    alignItems: "center",
  },
  availBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  // --- Stock (ligne 2) ---
  stockSection: {
    marginTop: Theme.spacing.lg,
  },
  stockSectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.sm,
  },
  stockStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stockBigValue: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: Theme.colors.dark,
  },
  stockStepBtn: {
    width: 38,
    height: 38,
    borderRadius: Theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.gray[100],
  },
  stockStepBtnPlus: {
    backgroundColor: Theme.colors.primary,
  },
  // Chiffres horizontaux scrollables (entre le label et le stepper).
  tensScroll: {
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  tensRowContent: {
    gap: 8,
    paddingVertical: 2,
    alignItems: "center",
  },
  tensChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.gray[100],
    alignItems: "center",
  },
  tensChipActive: {
    backgroundColor: Theme.colors.primary,
  },
  tensChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: Theme.colors.gray[600],
  },
  tensChipTextActive: {
    color: "white",
  },
});
