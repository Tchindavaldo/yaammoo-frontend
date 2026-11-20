// Annulation d'UNE commande par la boutique (devis, confirmation, PUT cancelByFastFood).
// Utilise par MerchantOrderBottomSheet (corbeille du header). Le message de
// confirmation porte le montant rendu au client et les frais d'annulation.
import { useState } from "react";
import { apiErrorMessage } from "@/src/api/apiError";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";
import { merchantService } from "../services/merchantService";

export function useMerchantOrderCancel(orderId: string | undefined, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const ask = async () => {
    if (!orderId || busy) return;
    setBusy(true);
    try {
      const q = await merchantService.cancelQuote(orderId);
      const fees = q?.fees ?? 0;
      setMessage(
        q?.manual
          ? t("Le remboursement du client sera traité par notre équipe. Frais d'annulation : {{b}} F, à votre charge.", { b: fees })
          : t("Le client recevra {{a}} F. Frais d'annulation : {{b}} F, à votre charge.", { a: q?.refund ?? 0, b: fees }),
      );
    } catch (e: any) {
      showToast(apiErrorMessage(e) || t("Annulation impossible. Réessayez."), "error");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!orderId || busy) return;
    setBusy(true);
    try {
      await merchantService.updateOrderStatus(orderId, "cancelByFastFood");
      showToast(t("Commande annulée. Le client est remboursé."), "success");
      setMessage(null);
      onDone();
    } catch (e: any) {
      showToast(apiErrorMessage(e) || t("Annulation impossible. Réessayez."), "error");
    } finally {
      setBusy(false);
    }
  };

  return { busy, message, ask, confirm, dismiss: () => setMessage(null) };
}
