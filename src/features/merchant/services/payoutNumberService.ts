import axios from "axios";
import { Config } from "@/src/api/config";
import type { PhoneCodeError, PhoneRateLimitError } from "@/src/features/auth/services/whatsappAuthService";
import { apiErrorMessage } from "@/src/api/apiError";

/**
 * Verification d'un numero de retrait (OM / MoMo), code par SMS UNIQUEMENT.
 * Memes erreurs que la connexion par numero (429 `rateLimited`, 401
 * `invalidCode`) : l'etape OTP copiee les lit telles quelles.
 * App >= 1.1.6 (`payout_number_whatsapp_min_app_version`, header x-app-version) :
 * numero deja valide sur WhatsApp par ce compte => `verified: true`, aucun SMS ni frais.
 */
export const requestPayoutNumberCode = (phoneNumber: string, network: "orange" | "mtn") => requestCode("/wallet/payout-number/request", phoneNumber, { network });

/** Frais estimes d'un code SMS (F CFA), ou null si inconnus. Le debit reel = cout reel. */
export async function getPayoutNumberFee(): Promise<number | null> {
  try {
    const { data } = await axios.get(`${Config.apiUrl}/wallet/payout-number/fee`);
    return typeof data?.data?.amount === "number" ? data.data.amount : null;
  } catch {
    return null;
  }
}
export const verifyPayoutNumberCode = (phoneNumber: string, code: string) => verifyCode("/wallet/payout-number/verify", phoneNumber, code);
/** Numeros WhatsApp verifies du compte (locaux, sans 237) ; [] si indisponible. */
export async function getVerifiedWhatsappNumbers(): Promise<string[]> {
  try {
    const { data } = await axios.get(`${Config.apiUrl}/whatsapp-number`);
    return (Array.isArray(data?.data) ? data.data : []).map((n: { phoneNumber?: string }) => String(n?.phoneNumber || "").replace(/\D/g, "").replace(/^237(?=\d{9}$)/, "")).filter(Boolean);
  } catch {
    return [];
  }
}
/** WhatsApp de la boutique : code sur WhatsApp UNIQUEMENT. App >= 1.1.6 : numero deja
 * valide comme numero de retrait => `verified: true`, aucun code (sens inverse). */
export const requestWhatsappNumberCode = (phoneNumber: string) => requestCode("/whatsapp-number/request", phoneNumber);
export const verifyWhatsappNumberCode = (phoneNumber: string, code: string) => verifyCode("/whatsapp-number/verify", phoneNumber, code);

/** `verified` : numero valide tout de suite par le backend, pas d'etape code. */
async function requestCode(path: string, phoneNumber: string, extra: Record<string, string> = {}): Promise<{ verified: boolean }> {
  try {
    const { data } = await axios.post(`${Config.apiUrl}${path}`, { phoneNumber, ...extra });
    return { verified: data?.verified === true };
  } catch (error: any) {
    if (error?.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.["retry-after"]);
      throw { rateLimited: true, retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60 } as PhoneRateLimitError;
    }
    throw { message: apiErrorMessage(error) } as Error;
  }
}

async function verifyCode(path: string, phoneNumber: string, code: string): Promise<void> {
  try {
    await axios.post(`${Config.apiUrl}${path}`, { phoneNumber, code });
  } catch (error: any) {
    if (error?.response?.status === 401) {
      const d = error.response.data ?? {};
      throw { invalidCode: true, reason: d.reason, attemptsRemaining: d.attemptsRemaining } as PhoneCodeError;
    }
    throw { message: apiErrorMessage(error) } as Error;
  }
}
