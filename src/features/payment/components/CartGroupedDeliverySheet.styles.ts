import { StyleSheet } from "react-native";
import { C, SHEET_HEIGHT } from "./CartPaymentSheet.styles";

/** Hauteur reservee en bas du sheet pour la capsule de paiement (etape 3). */
export const CAPSULE_SPACE = 70;
/** Marge sous la capsule (la decolle du bas du sheet / de la nav bar). */
export const CAPSULE_BOTTOM_OFFSET = 18;

/**
 * Styles du sheet de livraison groupee (ses trois calques : groupage,
 * livraison commune, paiement). Extraits du composant pour le garder sous le
 * plafond de taille de fichier (R4).
 */
export const styles = StyleSheet.create({
  /**
   * Hauteur PROPRE a ce sheet : `SHEET_HEIGHT` (515) moins l'en-tete qu'il n'a
   * plus (croix de 30 + ses 14 de marge basse). Le sheet de paiement autonome
   * garde le sien, donc sa hauteur d'origine.
   */
  sheet: { height: SHEET_HEIGHT - 44 },
  // Le sheet a une hauteur FIXE : le corps occupe la place restante et pousse
  // le bouton en bas via `spacer`, quelle que soit l'etape affichee.
  body: { flex: 1 },
  // Les deux etapes sont montees SIMULTANEMENT et superposees : le passage de
  // l'une a l'autre n'est qu'un fondu croise d'opacite, sans montage a chaud
  // (qui faisait apparaitre l'etape 2 en cours de peinture).
  bodyLayer: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  // Le calque de paiement laisse en bas la place de la capsule, posee par-dessus
  // (les deux autres etapes n'en ont pas et vont jusqu'au bas du sheet).
  payLayer: { paddingBottom: CAPSULE_SPACE + CAPSULE_BOTTOM_OFFSET },
  // Hote de `DeliveryTab` : `deliveryContainer` porte deja son propre
  // `paddingHorizontal: 16`, on compense celui du sheet pour ne pas doubler la
  // gouttiere (les cards etaient rentrees de 32 px de chaque cote).
  deliveryHost: {
    // L'hote se cale sur le bloc, qui mesure ses deux zones. L'espace libre du
    // calque est absorbe par le `spacer` place au-dessus.
    marginHorizontal: -16,
  },
  spacer: { flex: 1, minHeight: 8 },
  primaryBtn: {
    // Respiration sous la grille « Select Type », qui touchait le bouton.
    // Le calque 2 porte une accroche + un encadre en haut et `deliveryHost` a
    // un plancher de 230 : au-dela de ~20 ca deborde du sheet, en deca la
    // grille « Select Type » touche le bouton.
    marginTop: 18,
    backgroundColor: C.accent,
    borderRadius: 99,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnOff: { opacity: 0.4 },
  // Ligne d'action du calque 2 : retour compact + bouton principal etire.
  // La marge haute passe ici, `actionRowPrimary` la retire du bouton.
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionRowPrimary: { flex: 1, marginTop: 0 },
  // Pastille ronde parfaite, calee sur la hauteur du bouton principal
  // (15 de padding vertical + ~20 de ligne). Pas de bordure : la couleur
  // suffit a la detacher du fond blanc du sheet.
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnLabel: { fontSize: 15, fontWeight: "bold", color: "#fff" },
  // --- Étape 1 : choix du groupage ---
  question: {
    marginTop: 4,
    marginBottom: 18,
    fontSize: 19,
    fontWeight: "bold",
    color: C.ink,
    lineHeight: 25,
  },
  /**
   * Encadre sous l'accroche (etape 2) : ce que le groupage implique, en une
   * phrase. Volontairement court — plus long, il poussait la grille
   * « Select Type » et le bouton hors du sheet.
   */
  questionNote: {
    // L'accroche porte `marginBottom: 18` : on le neutralise pour rapprocher
    // l'encadre, la respiration passe sous lui.
    marginTop: -10,
    // Colle l'encadre a la top card de `DeliveryTab` : celle-ci demarre
    // desormais en haut de sa zone (`zoneAuto`), l'ecart se voyait deux fois.
    marginBottom: 6,
    // Fond orange translucide + filet de gauche : meme code couleur que la
    // selection dans le reste du panier, le bloc ne se lit plus comme du
    // texte gris de second plan.
    backgroundColor: C.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  questionNoteText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: C.inkSoft,
    lineHeight: 17,
  },
  /** Chiffres mis en avant dans l'encadre (economie, nombre de commandes). */
  questionNoteStrong: { fontWeight: "bold", color: C.accent },
  cards: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 13, fontWeight: "bold", color: C.ink },
  cardSub: { fontSize: 11.5, fontWeight: "600", color: C.muted },
  hint: {
    marginTop: 9,
    textAlign: "center",
    fontSize: 11.5,
    fontWeight: "600",
    color: C.muted,
    lineHeight: 17,
  },
  linkBtn: { marginTop: 14, paddingVertical: 6, alignItems: "center" },
  linkBtnLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.inkSoft,
    textDecorationLine: "underline",
  },
});
