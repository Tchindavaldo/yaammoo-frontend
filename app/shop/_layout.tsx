import { Stack } from "expo-router";

/**
 * Pages entieres de Settings → Boutique. Hors du groupe (tabs) : aucune navbar,
 * chaque page porte son propre TabHeader (pastille « Retour » = router.back()).
 * Retour par glissement depuis le bord gauche (`gestureEnabled`, iOS) ; sur
 * Android, le geste retour systeme fait de meme.
 */
export default function ShopLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
