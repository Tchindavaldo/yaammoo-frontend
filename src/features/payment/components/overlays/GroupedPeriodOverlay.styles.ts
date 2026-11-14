// Styles de GroupedPeriodOverlay (sortis du composant, R4 : 500 lignes max).
import { StyleSheet } from "react-native";
import { DS } from "@/src/theme/ds";
import { GROUPED_SHEET_HEIGHT } from "../CartGroupedDeliverySheet.styles";

/** Hauteur de la card : le sheet plus 90 (la liste des créneaux respire). */
export const SHEET_BASE_HEIGHT = GROUPED_SHEET_HEIGHT + 90;

export const styles = StyleSheet.create({
  // Repli Android < 12 du voile de fond : blanc opaque.
  blurFallbackOpaque: {
    backgroundColor: "#ffffff",
    // Memes coins que la card posee dessus : sans cela le voile opaque du repli
    // Android < 12 laisse depasser deux angles droits.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keyboardWrapper: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    // Android ordonne les touches par ELEVATION, pas par zIndex. Le sheet porte
    // `elevation: 20` : sans une elevation superieure ici, c'est lui qui recoit
    // le geste et son propre ScrollView le consomme — le tap atteignait la
    // liste, mais le drag ne la faisait jamais defiler.
    elevation: 30,
  },
  blurOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_BASE_HEIGHT,
    // Aucune gouttiere : la card occupe TOUTE la surface de l'overlay.
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center",
  },
  card: {
    // La card remplit le conteneur, qui porte la hauteur de l'overlay.
    flex: 1,
    // Idem `slotList` : laisse la card se borner a la hauteur du conteneur pour
    // que la liste des creneaux scrolle au lieu de pousser le footer hors ecran.
    minHeight: 0,
    backgroundColor: "white",
    // Card collee aux bords du sheet : seuls les coins hauts sont arrondis.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: DS.slate100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: DS.slate50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: DS.slate100,
  },
  // Liste des creneaux : prend la place restante de la card, sous la bande de
  // chips et au-dessus de la ligne de validation.
  slotList: {
    flex: 1,
    // `minHeight: 0` : sans lui un enfant flex ne rétrécit pas sous la hauteur de
    // son contenu -> la liste déborde de la card au lieu de devenir scrollable.
    minHeight: 0,
  },
  // Bande de chips horizontale : sans hauteur propre elle s'etire dans la card
  // et ecrase les chips. `flexGrow: 0` la fige sur son contenu.
  dateStrip: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 10,
  },
  dateStripInner: {
    gap: 8,
    alignItems: "center",
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DS.slate100,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateChipActive: {
    backgroundColor: DS.accent,
    borderColor: DS.accent,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dateChipTextActive: {
    color: "white",
  },

  scrollInner: {
    paddingBottom: 4,
    gap: 2,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: DS.slate100,
  },
  periodRowActive: {
    backgroundColor: "transparent",
  },
  periodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: DS.accent,
    borderColor: DS.accent,
  },
  periodDate: {
    fontSize: 12,
    fontWeight: "700",
    color: DS.accent,
    marginLeft: 10,
    marginRight: 6,
  },
  periodHour: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    marginRight: 4,
  },
  periodLieu: {
    fontSize: 13,
    color: "#64748b",
  },
  periodPrix: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  pricePair: {
    alignItems: "flex-end",
  },
  strikePrix: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  freePrix: {
    fontSize: 13,
    fontWeight: "bold",
    color: DS.accent,
  },
});

