import { requestCartRefresh, requestFastfoodsRefresh } from "@/src/services/fastfoodRefreshBus";
import { t } from "@/src/i18n";

/**
 * Message a afficher apres un echec de `POST /transaction` (exception axios).
 * Partage par useCheckout (home) et useCartPayment (panier).
 *
 * - `message` du backend : texte, ou tableau `[{ field, message }]` ;
 * - reponse sans corps (serveur en redemarrage, proxy) : jamais le texte axios brut.
 *
 * Refus du pre-check (422) avec `fastFoodIds` : les prix affiches n'etaient
 * plus a jour (ex. `delivery_price_mismatch`). On recharge ces boutiques pour
 * que la commande suivante parte aux bons prix, et le panier (deja recalcule
 * en base par le backend), sans attendre un rafraichissement.
 */
export function transactionErrorMessage(error: any): string {
  const data = error?.response?.data;
  if (Array.isArray(data?.fastFoodIds)) {
    requestFastfoodsRefresh(data.fastFoodIds);
    // Panier recalcule par le backend : on le relit aussi (socket peut-etre rate).
    requestCartRefresh();
  }
  const raw = data?.message;
  const message = Array.isArray(raw)
    ? raw.map((e: any) => e?.message).filter(Boolean).join(" • ")
    : raw;
  return (
    message ||
    data?.error ||
    (error?.response
      ? t("Service momentanément indisponible. Réessayez dans un instant.")
      : t("Connexion impossible. Vérifiez votre réseau et réessayez."))
  );
}
