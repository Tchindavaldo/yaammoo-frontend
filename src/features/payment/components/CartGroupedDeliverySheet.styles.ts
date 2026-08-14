import { Platform, StyleSheet } from "react-native";
import { C, SHEET_HEIGHT } from "./CartPaymentSheet.styles";

/**
 * Hauteur du sheet GROUPE. Android gagne 60 px : la barre de navigation y mange
 * la safe area basse, et les cinq pages s'y retrouvaient a l'etroit.
 */
export const GROUPED_SHEET_HEIGHT =
  SHEET_HEIGHT + (Platform.OS === "android" ? 40 : 0);

/** Hauteur reservee en bas du sheet pour la capsule de paiement (etape 3). */
export const CAPSULE_SPACE = 0;
/** Marge sous la capsule (la decolle du bas du sheet / de la nav bar). */
export const CAPSULE_BOTTOM_OFFSET = 0;

/**
 * Styles du sheet de livraison groupee (ses trois calques : groupage,
 * livraison commune, paiement). Extraits du composant pour le garder sous le
 * plafond de taille de fichier (R4).
 */
export const styles = StyleSheet.create({
  /**
   * Hauteur PLEINE : le sheet porte de nouveau un en-tete (son titre), il n'a
   * donc plus a retrancher la place que celui-ci occupait.
   */
  sheet: { height: GROUPED_SHEET_HEIGHT },
  /** Titre du sheet — seul en-tete, ni sous-titre ni croix. */
  sheetTitle: {
    marginBottom: 14,
    fontSize: 17,
    fontWeight: "bold",
    color: C.ink,
  },
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
    marginTop: 8,
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
    marginTop: 8,
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
  /**
   * CAPSULE DE SAISIE du footer (page 5) — reprise du design de
   * `CartPaymentOverlay` (fond sombre, pilule, icone + champ + bouton rond)
   * mais AUX DIMENSIONS DU BOUTON « Continuer » : elle prend sa place dans
   * `actionRow`, le footer restant identique aux autres pages. Pas de partie
   * « Total a payer » : le montant est deja porte par les cards du dessus.
   */
  payCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 99,
    paddingLeft: 14,
    paddingRight: 5,
    // Meme hauteur que `primaryBtn` (15 de padding + ~20 de ligne).
    height: 50,
  },
  payCapsuleInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "600",
  },
  /** Numero pas encore saisi : le libelle se lit comme un placeholder. */
  payCapsulePlaceholder: { color: "rgba(255,255,255,0.5)" },
  /**
   * Fond de repli de la capsule flottante quand le flou natif manque
   * (Android < 12) : sans lui, le contenu du sheet reste lisible au travers.
   */
  payCapsuleBlurFallback: { backgroundColor: "rgba(17,17,17,0.96)" },
  /**
   * Voile pose SOUS la capsule flottante : il part du bas de l'ecran et monte
   * jusqu'a son bord superieur, couvrant toute la zone du clavier. C'est cette
   * bande — pas la pilule — qui doit etre floutee.
   */
  keyboardVeil: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Bords hauts arrondis : le voile se lit comme un panneau pose sur le bas
    // de l'ecran, pas comme un aplat qui coupe la page net.
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    // `overflow` : sans lui le flou deborde des coins arrondis sur Android.
    overflow: "hidden",
  },
  /** Android < 12 : sans flou natif, le voile se rabat sur un fond sombre. */
  keyboardVeilFallback: { backgroundColor: "rgba(0,0,0,0.72)" },
  /** Teinte sombre posee sur le flou, qui seul ne noircit pas assez. */
  keyboardVeilTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  /** Bouton rond de validation, cale dans la capsule. */
  payCapsuleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
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
  // Card selectionnee / champ rempli : meme code couleur que le reste des
  // selections du panier.
  cardActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  /**
   * Titre de la page 1. Le sheet n'a pas d'en-tete : la page porte elle-meme
   * son intitule, sinon on ne sait pas ce qu'on choisit.
   */
  stepTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: C.ink,
  },
  /** Le titre prend la place restante : le stepper est pousse a droite. */
  stepTitleFlex: { flex: 1 },
  /** Ligne de titre : intitule a gauche, stepper pousse a droite. */
  stepHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  /**
   * Stepper : un point par page, le point courant etire en pilule orange. Il
   * situe l'utilisateur sans prendre la place d'un « 2/4 » ecrit.
   */
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.mutedLight,
  },
  stepDotActive: { width: 14, backgroundColor: C.accent },
  /** Titre seul (page 2) : sans sous-titre, il porte lui-meme sa respiration. */
  stepTitleSpaced: { marginBottom: 10 },
  /** Sous-titre : la phrase qui explique la situation du lot. */
  stepSub: {
    // La description appartient au titre : elle s'en decolle a peine, mais
    // garde une vraie respiration avant les cards, qui sont un autre bloc.
    marginTop: 4,
    marginBottom: 20,
    fontSize: 11.5,
    fontWeight: "600",
    color: C.muted,
    lineHeight: 16,
  },
  /**
   * Cards de groupage (etape 1) : version COMPACTE des `card` ci-dessus. Les
   * trois doivent tenir dans la hauteur restante du sheet sans scroll — d'ou un
   * padding vertical reduit et un `gap` serre.
   */
  choiceCards: { flexDirection: "row", gap: 8 },
  choiceCard: {
    // Les trois choix se partagent la largeur : empiles verticalement ils
    // remplissaient tout le sheet, cote a cote ils se comparent d'un coup
    // d'oeil et laissent la place au bouton.
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  /** Pastille d'icone des cards de groupage (etape 1). */
  choiceDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceText: { alignItems: "flex-start" },
  /**
   * Card des montants (page 4) : deux colonnes — « N cmd » et « Course » —
   * separees par un filet, comme le recap du bas de la page panier
   * (`CartZoneFooterBar`).
   */
  /**
   * MEME largeur que les deux cards d'operateur (un tiers) : les deux colonnes
   * se resserrent au lieu d'elargir la card.
   */
  amountCard: { flex: 1 },
  amountCols: { flexDirection: "row", alignItems: "center" },
  amountSep: {
    width: 1,
    height: 22,
    backgroundColor: C.border,
    // Filet serre : la card garde la largeur d'un tiers, l'ecart doit donc
    // rester minimal pour que les deux colonnes tiennent.
    marginHorizontal: 5,
  },
  choiceTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "left",
  },
  choiceSub: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: C.muted,
    textAlign: "left",
    lineHeight: 13,
  },
  // --- Etape livraison « segmente + tuiles » ---
  /**
   * Intitule de bloc, en phrase (« Vous avez 2 livraisons differentes… ») : il
   * detache chaque section du grand titre de l'etape et des blocs voisins.
   * Ni capitales ni interlettrage, qui le rendraient illisible sur cette
   * longueur.
   */
  sectionLabelText: {
    marginBottom: 7,
    fontSize: 11.5,
    fontWeight: "700",
    color: C.muted,
  },
  // Ligne de rappel du groupage, au-dessus du segmente : libelle a gauche,
  // couple de boutons a droite (actif en orange plein).
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  groupText: { flex: 1 },
  groupTitle: { fontSize: 12.5, fontWeight: "bold", color: C.ink },
  groupSub: { marginTop: 1, fontSize: 11, fontWeight: "600", color: C.muted },
  groupBtns: { flexDirection: "row", gap: 6 },
  groupBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: C.chipBg,
  },
  groupBtnActive: { backgroundColor: C.accent },
  groupBtnLabel: { fontSize: 11.5, fontWeight: "700", color: C.muted },
  groupBtnLabelActive: { color: "#fff" },
  // Recap sous les tuiles : on ne redefinit RIEN — le bloc reprend tels quels
  // `recap` / `recapRow` / `recapLabel` / `recapValue` du sheet de paiement
  // (`CartPaymentSheet.styles`). Seule la marge haute lui est propre.
  recapSpaced: { marginTop: 12 },
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
