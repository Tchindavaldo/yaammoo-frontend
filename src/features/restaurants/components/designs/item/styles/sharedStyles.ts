import { Platform, StyleSheet } from "react-native";

/**
 * Styles PARTAGES entre plusieurs variantes : fallbacks du flou, bloc d'infos
 * sous la carte, barres basses (stock / livraison), chips prix du variant 7
 * reutilises partout.
 */
export const sharedStyles = StyleSheet.create({
  // Android < 12 : pas de flou natif (cf. AppBlurView). On opacifie le fond pour
  // garder le contenu lisible : blanc sous les zones claires, sombre sous les
  // chips a texte blanc.
  blurFallbackLight: { backgroundColor: "#ffffff" },
  blurFallbackDark: { backgroundColor: "rgba(0, 0, 0, 0.55)" },

  // --- Barre stock + livraison (mode "blur2") ---
  v4StockBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 5,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  v4StockMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  // ANDROID UNIQUEMENT : le flou de la barre est coupe (cf.
  // `disableAndroidBlur`), le bloc « N en stock » + sa barre de progression
  // porte donc lui-meme son fond. iOS garde le flou, donc aucun fond.
  v4StockLeftSection: {
    flex: 1,
    justifyContent: "center",
    ...(Platform.OS === "android"
      ? {
          alignSelf: "flex-start" as const,
          backgroundColor: "#ffffff",
          borderRadius: 14,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }
      : null),
  },
  v4StockInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 5,
  },
  v4StockCount: { fontSize: 13, fontWeight: "700" },
  v4ProgressTrack: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 2,
    overflow: "hidden",
  },
  v4ProgressFill: {
    height: "100%",
    backgroundColor: "#e8440a",
    borderRadius: 2,
  },
  // Copie dediee de `v5DeliveryStrip` pour LE SEUL design a barre de stock
  // (le style d'origine est partage avec un autre design, qu'on ne touche pas).
  // ANDROID : fond opaque, le flou de la barre etant coupe
  // (cf. `disableAndroidBlur`) — un gris translucide laisserait voir la photo.
  v4DeliveryStrip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Platform.OS === "android" ? "#ffffff" : "rgba(0,0,0,0.04)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 2,
  },

  // --- Bande basse du variant 5 : uniquement la prochaine livraison ---
  v5BottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
    // Voile blanc par-dessus le flou : la bande tire vers le blanc tout en
    // laissant transparaitre l'image de fond.
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  v5DeliveryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  v5DeliveryLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000000e1",
    letterSpacing: 0.8,
  },
  v5DeliveryTime: { fontSize: 10, fontWeight: "800" },
  v5DeliveryFeeRow: { flexDirection: "row", alignItems: "center", gap: 5 },

  // --- Chips et zone basse du variant 7 (reutilises par les autres) ---
  v7TopChips: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    zIndex: 3,
  },
  v7PricePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  v7PriceText: { color: "#000", fontSize: 12, fontWeight: "900" },
  // ANDROID, variants 4 et 5 : plus aucun fond blanc, chip prix sombre.
  darkPricePill: { backgroundColor: "rgba(0,0,0,0.55)" },
  darkPriceText: { color: "#fff" },
  // Barres basses en `dark` (Android, variants 4 et 5) : fond retire.
  darkNoBg: { backgroundColor: "transparent" },
  darkTrack: { backgroundColor: "rgba(255,255,255,0.25)" },
  v7BottomZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    zIndex: 3,
  },
  v7LiveRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  v7LiveMeta: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
  },
  v7LiveHour: { fontSize: 11, fontWeight: "900", marginTop: 1, color: "white" },
  v7DeliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "nowrap",
  },
  deliveryFeePill: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  deliveryFeePillText: {
    fontSize: 10,
    fontWeight: "700",
  },

  defaultContainer: {
    padding: 20,
    backgroundColor: "white",
    marginRight: 16,
    borderRadius: 10,
  },

  // --- Bloc d'infos sous la carte (hors de la carte) ---
  metaBlock: { paddingTop: 8, paddingLeft: 4, gap: 3 },
  metaTitleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTitle: { fontSize: 13, fontWeight: "900", color: "#111", flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontWeight: "700", color: "#444" },
  metaMuted: { fontSize: 11, fontWeight: "600", color: "#999" },
  metaFree: { fontSize: 11, fontWeight: "900", color: "#00b894" },
  v4TimeText: { fontSize: 11, fontWeight: "600", color: "#8a8a8a" },
  v4TimeValue: { fontSize: 13, fontWeight: "900", color: "#111" },
});
