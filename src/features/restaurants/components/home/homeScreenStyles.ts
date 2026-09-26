import { StyleSheet } from "react-native";
import { Theme } from "@/src/theme";
import { FOOTER_LOADER_HEIGHT } from "../../utils/homeListConfig";

/**
 * Styles de l'écran home (`app/(tabs)/index.tsx`) et de ses morceaux extraits
 * (écrans plein, pied de liste). Propres à cet écran : ne pas les réutiliser
 * ailleurs (R16).
 */
export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  listContent: {
    // paddingBottom géré dynamiquement avec useTabBarHeight
  },
  // ⚠️ Hauteur FIXE et genereuse (et non un simple padding de 24) : le loader
  // doit se remarquer meme en scroll rapide. Trop court, il defilait sans
  // qu'on le voie — on avait l'impression que les boutiques apparaissaient
  // sans chargement.
  footerLoader: {
    // Meme valeur que le `contentInset` negatif qui coupe le rebond du bas.
    height: FOOTER_LOADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  // Loader bas INDEPENDANT : fixe au-dessus de la navbar, monte une fois,
  // visible seulement en fade pendant un fetch avec suite. Sans fond ni
  // bordure, juste l'indicateur en grand.
  bottomLoader: {
    position: "absolute",
    alignSelf: "center",
  },
  footerEnd: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: 13,
    color: Theme.colors.gray[400],
  },
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Theme.colors.dark,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: -4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.primary,
  },
  retryText: {
    color: Theme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    gap: 12,
  },
  loadingOverlayText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
