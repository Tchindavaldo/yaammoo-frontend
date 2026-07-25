import axios from "axios";
import { Config } from "@/src/api/config";
import { DeliveryOffer } from "@/src/types";

/**
 * Vérification d'un code bonus AVANT commande — `POST /bonus/verify`.
 *
 * Lecture seule : ne consomme rien. Appelé quand le user saisit un code et
 * valide la sélection de zone/période, pour savoir si la livraison devient
 * offerte. Le code n'est retenu que si `valid === true`.
 */

export interface VerifyBonusResult {
  valid: boolean;
  /** Renseigné quand `valid === false` : code_not_found, expiré, épuisé… */
  reason?: string;
  bonusId?: string | null;
  bonusName?: string | null;
  type?: string;
  deliveryOffer?: DeliveryOffer | null;
  /** Message lisible renvoyé par le backend (affiché en toast d'erreur). */
  message?: string;
}

/** Messages par défaut si le backend n'en fournit pas pour la raison donnée. */
const REASON_MESSAGES: Record<string, string> = {
  code_not_found: "Code bonus introuvable.",
  expired: "Ce code bonus a expiré.",
  exhausted: "Ce code bonus a déjà été utilisé.",
  wrong_fastfood: "Ce code ne s'applique pas à cette boutique.",
};

export const verifyBonusCode = async (
  code: string,
  fastFoodId?: string | null,
): Promise<VerifyBonusResult> => {
  try {
    const response = await axios.post(`${Config.apiUrl}/bonus/verify`, {
      code: code.trim(),
      ...(fastFoodId ? { fastFoodId } : {}),
    });

    const data = response.data?.data ?? {};
    const message = response.data?.message;

    if (!data.valid) {
      return {
        valid: false,
        reason: data.reason,
        message:
          message || REASON_MESSAGES[data.reason] || "Code bonus invalide.",
      };
    }

    return {
      valid: true,
      bonusId: data.bonusId ?? null,
      bonusName: data.bonusName ?? null,
      type: data.type,
      deliveryOffer: data.deliveryOffer ?? null,
      message,
    };
  } catch (error: any) {
    const raw = error.response?.data?.message;
    const message = Array.isArray(raw)
      ? raw.map((e: any) => e?.message).filter(Boolean).join(" • ")
      : raw;
    return {
      valid: false,
      reason: "request_failed",
      message: message || "Vérification du code impossible. Réessayez.",
    };
  }
};
