/**
 * Cible du flou des overlays (Android, SDK 57) dans les sheets de commande
 * (`CheckoutSheet`, `CartCheckoutSheet`) : tout le contenu du sheet, footer
 * compris. Fond blanc + coins du sheet : sans eux, les zones vides de la cible
 * seraient transparentes et laisseraient voir le contenu net sous le flou.
 */
export const SHEET_BLUR_TARGET = {
  flex: 1,
  backgroundColor: "white",
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
} as const;
