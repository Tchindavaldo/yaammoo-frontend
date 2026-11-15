import axios from "axios";
import { Config } from "@/src/api/config";
import type { PhoneCodeError, PhoneRateLimitError } from "@/src/features/auth/services/whatsappAuthService";

/**
 * Verification d'un numero de retrait (OM / MoMo), code par SMS UNIQUEMENT.
 * Memes erreurs que la connexion par numero (429 `rateLimited`, 401
 * `invalidCode`) : l'etape OTP copiee les lit telles quelles.
 */
export const requestPayoutNumberCode = (phoneNumber: string) => requestCode("/wallet/payout-number/request", phoneNumber);
export const verifyPayoutNumberCode = (phoneNumber: string, code: string) => verifyCode("/wallet/payout-number/verify", phoneNumber, code);
/** WhatsApp de la boutique : code sur WhatsApp UNIQUEMENT. */
export const requestWhatsappNumberCode = (phoneNumber: string) => requestCode("/whatsapp-number/request", phoneNumber);
export const verifyWhatsappNumberCode = (phoneNumber: string, code: string) => verifyCode("/whatsapp-number/verify", phoneNumber, code);

async function requestCode(path: string, phoneNumber: string): Promise<void> {
  try {
    await axios.post(`${Config.apiUrl}${path}`, { phoneNumber });
  } catch (error: any) {
    if (error?.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.["retry-after"]);
      throw { rateLimited: true, retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60 } as PhoneRateLimitError;
    }
    throw { message: error?.response?.data?.message } as Error;
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
    throw { message: error?.response?.data?.message } as Error;
  }
}
