// Etat et appels de l'annulation d'une commande client (devis, confirmation,
// PUT cancelByUser). Partage par OrderLivraisonTab (qui affiche la confirmation
// a la place de tout l'onglet) et OrderCancelButton (le bouton).
import axios from "axios";
import { useState } from "react";
import { Config } from "@/src/api/config";
import { apiErrorMessage } from "@/src/api/apiError";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";
import { Commande } from "@/src/types";
import { useOrders } from "./useOrders";

export interface OrderCancel {
  busy: boolean;
  /** Texte du devis une fois demande : non nul = la confirmation est affichee. */
  confirmText: string | null;
  ask: () => Promise<void>;
  dismiss: () => void;
  cancel: (resend?: boolean) => Promise<void>;
}

export function useOrderCancel(order: Commande, onDone?: () => void): OrderCancel {
  const { refresh } = useOrders();
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState<string | null>(null);

  const cancel = async (resend = false) => {
    setBusy(true);
    try {
      const res = await axios.put(`${Config.apiUrl}/order`, { id: order.id, status: "cancelByUser", fastFoodId: (order as any).fastFoodId });
      if (res.data?.data?.cancelRequested) {
        // Boutique WhatsApp : demande transmise, le sheet reste ouvert sur « En attente… ».
        showToast(resend ? t("Demande renvoyée au restaurant.") : t("Demande d'annulation envoyée au restaurant. Vous serez prévenu de sa réponse."), "info");
        setConfirmText(null);
        await refresh(true);
        return;
      }
      showToast(t("Commande annulée. Le remboursement est en cours."), "success");
      await refresh(true);
      onDone?.();
    } catch (e: any) {
      showToast(apiErrorMessage(e) || t("Annulation impossible. Réessayez."), "error");
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    setBusy(true);
    let quote: any = null;
    try {
      const { data } = await axios.get(`${Config.apiUrl}/order/cancel-quote/${(order as any).userId}/${order.id}`);
      quote = data?.data;
    } catch (e: any) {
      setBusy(false);
      showToast(apiErrorMessage(e) || t("Annulation impossible. Réessayez."), "error");
      return;
    }
    setBusy(false);
    setConfirmText(
      quote?.manual
        ? t("Le remboursement sera traité par notre équipe.")
        : quote?.phone
          ? t("Tu recevras {{a}} F sur le {{p}}, le numéro qui a payé (frais de paiement retenus : {{b}} F).", { a: quote?.refund ?? 0, b: quote?.feesKept ?? 0, p: quote.phone })
          : t("Tu recevras {{a}} F (frais de paiement retenus : {{b}} F).", { a: quote?.refund ?? 0, b: quote?.feesKept ?? 0 }),
    );
  };

  return { busy, confirmText, ask, dismiss: () => setConfirmText(null), cancel };
}
