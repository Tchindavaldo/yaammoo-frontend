import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";

/** Une décision plus vieille que ça vient d'un rechargement, pas d'une réponse en direct. */
const FRESH_MS = 60 * 1000;

/**
 * Toast client (R22) quand le marchand répond à sa demande d'annulation
 * (`userOrderUpdated` porte `cancelRequest.status` accepted | refused).
 */
export function cancelRequestToast(order: any) {
  const cr = order?.cancelRequest;
  if (!cr?.resolvedAt || Date.now() - new Date(cr.resolvedAt).getTime() > FRESH_MS) return;
  if (cr.status === "accepted") showToast(t("Le restaurant a accepté l'annulation. Le remboursement est en cours."), "success");
  else if (cr.status === "refused" && cr.reason === "merchant") showToast(t("Le restaurant a refusé l'annulation : la commande est maintenue."), "info");
}
