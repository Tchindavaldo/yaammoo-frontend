import { Theme } from "@/src/theme";
import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

// Hauteur approximative de la tab bar (navbar du bas) a reserver sous le contenu.
export const TAB_BAR_HEIGHT = 60;

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    // Transparent : laisse le settings transparaître DERRIÈRE le header (effet blur).
    // Le fond blanc est posé sur la zone de contenu uniquement (cardGrid).
    backgroundColor: "transparent",
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  cardGrid: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 120,
    gap: 14,
  },
  loaderText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 28,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  updateBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  formRow: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 0,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imagePicker: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imageOverlayText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  noImage: {
    alignItems: "center",
    gap: 8,
  },
  noImageText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  floatingLabel: {
    color: "#64748b",
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 2,
    fontWeight: "600",
  },
  helperText: {
    color: "#94a3b8",
    fontSize: 9,
    marginBottom: 8,
    marginLeft: 2,
  },
  glassInput: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 15,
    height: 50,
    color: "#0f172a",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeInput: {
    justifyContent: "center",
  },
  timeText: {
    color: "#0f172a",
    fontSize: 13,
  },
  // ── Design Livraison (chips + ligne d'édition), calqué sur create menu ──
  // Ligne label + ×N + chips scrollables (ne wrappe jamais).
  chipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chipScroll: {
    flex: 1,
    marginLeft: 10,
  },
  chipScrollContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    maxWidth: 160,
  },
  itemChipTextActive: {
    color: "#ec4913",
  },
  chipSeparator: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  itemCountText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#ec4913",
  },
  // Ligne d'édition (inputs + boutons supprimer/valider).
  editRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 12,
  },
  editInput: {
    borderRadius: 14,
    height: 46,
  },
  actionBtn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  validateBtn: {
    backgroundColor: "#ec4913",
  },
  // Sous-bloc Lieux/Prix de l'heure active.
  zoneBlock: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  emptyHoursText: {
    color: "#94a3b8",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
  },
  // iOS Picker Overlays
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iosPickerDone: {
    alignItems: "flex-end",
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  // Toast Styles
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 60,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    gap: 12,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: Theme.colors.success || "#28a745",
  },
  toastError: {
    backgroundColor: Theme.colors.danger || "#dc3545",
  },
  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
});
