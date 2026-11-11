import { Stack } from "expo-router";

/**
 * Pages entieres de Settings (hors Boutique) : portefeuille, support, livraison.
 * Hors du groupe (tabs) : aucune navbar, chaque page porte son TabHeader
 * (pastille « Retour » = router.back()). Meme principe que `app/shop/`.
 */
export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />;
}
