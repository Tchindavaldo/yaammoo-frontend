// Styles de CartGroupedDetailCapsule (extraits pour R4).
import { StyleSheet } from "react-native";
import { DS } from "@/src/theme/ds";

/** Hauteur de la capsule (partagee avec le calcul des positions). */
export const CAPSULE_HEIGHT = 70;

export const styles = StyleSheet.create({
  /** Calque plein ecran qui porte le voile et la capsule. */
  slot: { ...StyleSheet.absoluteFill },
  capsule: {
    position: "absolute",
    left: "2%",
    width: "96%",
    height: CAPSULE_HEIGHT,
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
  },
  /** Android < 12 : pas de flou natif, on opacifie pour rester lisible. */
  capsuleBlurFallback: { backgroundColor: DS.ink },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    flex: 1,
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  iconTextRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconTextLabel: { fontSize: 13, fontWeight: "600" },
  /** Ligne de saisie : toujours montee, elle occupe toute la capsule. */
  inputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  /**
   * Transaction en cours : la ligne s'efface SANS se demonter — le champ garde
   * le focus, donc le clavier reste ouvert et la capsule ne redescend pas.
   */
  inputRowHidden: { opacity: 0 },
  /** Message pose PAR-DESSUS la ligne de saisie masquee, centre dans la pilule. */
  overlayText: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    // Gouttiere : le texte ne colle pas aux bords arrondis de la pilule.
    paddingHorizontal: 20,
  },
  /**
   * Texte du message, CENTRE verticalement : `centerText` porte `flex: 1`, qui
   * l'etirait sur toute la hauteur de la capsule et le collait en haut. Ici il
   * fait sa hauteur propre, le conteneur s'occupe du centrage.
   */
  overlayTextLabel: { flex: 0, width: "100%" },
  /** Succes : icone + libelle sur une ligne, centres ensemble dans la pilule. */
  overlayIconRow: { flexDirection: "row", gap: 8 },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },
  textInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.accent,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 40,
  },
  /**
   * Voile pose SOUS la capsule : il part du bas de l'ecran et monte jusqu'a son
   * bord superieur, couvrant la zone du clavier.
   */
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // MEME radius que le sheet groupe (`CartPaymentSheet.styles.sheet`) : le
    // voile s'arretant a sa hauteur, un rayon different se voyait aussitot.
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    // `overflow` : sans lui le flou deborde des coins arrondis sur Android.
    overflow: "hidden",
  },
  /** Android < 12 : sans flou natif, le voile se rabat sur un fond sombre. */
  // Android (sans flou) : voile BLANC, comme la capsule d'auth.
  veilFallback: { backgroundColor: DS.bg },
  /** Teinte sombre posee sur le flou, qui seul ne noircit pas assez. */
  veilTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});
