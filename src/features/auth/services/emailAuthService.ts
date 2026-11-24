import axios from "axios";
import { signInWithCustomToken } from "firebase/auth";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import { userFirestore } from "./userFirestore";
import { Users } from "@/src/types";

/**
 * Inscription par e-mail avec code (backend `POST /auth/email/*`) :
 * - `requestEmailCode` : le backend envoie un code a 6 chiffres a l'adresse ;
 * - `verifyEmailCode`  : valide le code, le backend cree le compte et renvoie
 *   un `customToken`, echange ici via `signInWithCustomToken`.
 * La connexion, elle, reste e-mail + mot de passe (Firebase).
 *
 * Temps limite sur chaque requete : sans lui, un backend muet laissait le
 * loader tourner sans fin.
 */
const TIMEOUT = 20000;
const headers = { "ngrok-skip-browser-warning": "true" };

/** Renvoi trop rapproche (429) : secondes avant le prochain envoi. */
export interface EmailRateLimitError {
  rateLimited: true;
  retryAfter: number;
}

export async function requestEmailCode(email: string): Promise<void> {
  try {
    await axios.post(`${Config.apiUrl}/auth/email/request`, { email }, { headers, timeout: TIMEOUT });
  } catch (error: any) {
    if (error?.response?.status === 429) {
      const retryAfter = Number(error.response.headers?.["retry-after"]);
      throw { rateLimited: true, retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60 } as EmailRateLimitError;
    }
    throw error;
  }
}

/** Valide le code, ouvre la session Firebase et renvoie le profil. */
export async function verifyEmailCode(
  email: string,
  code: string,
  password: string,
): Promise<Users> {
  const { data } = await axios.post(
    `${Config.apiUrl}/auth/email/verify`,
    { email, code, password },
    { headers, timeout: TIMEOUT },
  );
  const cred = await signInWithCustomToken(auth, data.customToken);
  const profile = await userFirestore.getUser(cred.user);
  if (!profile) throw new Error("profile-missing");
  return profile;
}
