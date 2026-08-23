import axios from "axios";
import { signInWithCustomToken } from "firebase/auth";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import { Users } from "@/src/types";
import { userFirestore } from "./userFirestore";

/**
 * Authentification par WhatsApp — deux endpoints backend.
 *
 * `POST /auth/phone/request`  → envoie le code, renvoie un `verificationId`
 * `POST /auth/phone/verify`   → valide le code, renvoie un `customToken`
 *
 * ⚠️ Le `customToken` n'est PAS un token d'acces : il ne fonctionne pas dans
 * un en-tete `Authorization`. Il faut l'echanger via `signInWithCustomToken`,
 * puis lire l'`idToken` de l'utilisateur ainsi connecte. Sans cet echange,
 * tous les appels proteges repondent 401.
 */

/** Reponse de `POST /auth/phone/request`. */
export interface PhoneRequestResult {
  verificationId: string;
  phoneNumber: string;
  /** Duree de validite du code, en secondes. */
  expiresIn: number;
}

/** Envoi limite par le backend (429) : il faut patienter. */
export interface PhoneRateLimitError {
  rateLimited: true;
  /** Secondes a attendre, lues dans l'en-tete `Retry-After`. */
  retryAfter: number;
}

/** Code refuse par le backend (401). */
export interface PhoneCodeError {
  invalidCode: true;
  reason?: string;
  attemptsRemaining?: number;
}

export interface PhoneVerifyResult {
  /** `true` a la premiere connexion : le profil reste a completer. */
  isNewUser: boolean;
  userData: Users | null;
}

/** Profil, envoye a l'INSCRIPTION seulement — ignore sur une connexion. */
export interface PhoneProfile {
  nom?: string;
  prenom?: string;
  age?: number;
  email?: string;
}

const headers = {
  "ngrok-skip-browser-warning": "true",
  "Content-Type": "application/json",
};

/** `true` si l'erreur est un envoi limite (429). */
export function isRateLimited(e: unknown): e is PhoneRateLimitError {
  return !!e && (e as PhoneRateLimitError).rateLimited === true;
}

/** `true` si l'erreur est un code refuse (401). */
export function isInvalidCode(e: unknown): e is PhoneCodeError {
  return !!e && (e as PhoneCodeError).invalidCode === true;
}

/**
 * Demande l'envoi d'un code sur WhatsApp.
 *
 * @throws {PhoneRateLimitError} sur 429 — l'appelant affiche un compte a
 * rebours de `retryAfter` secondes sur le bouton « renvoyer ».
 */
export async function requestPhoneCode(
  phoneNumber: string,
): Promise<PhoneRequestResult> {
  try {
    const { data } = await axios.post(
      `${Config.apiUrl}/auth/phone/request`,
      { phoneNumber },
      { headers },
    );
    return data;
  } catch (error: any) {
    if (error?.response?.status === 429) {
      // `Retry-After` est en secondes. Absent ou illisible : une minute par
      // defaut, plutot que de laisser l'utilisateur reessayer dans le vide.
      const header = error.response.headers?.["retry-after"];
      const retryAfter = Number(header);
      throw {
        rateLimited: true,
        retryAfter: Number.isFinite(retryAfter) ? retryAfter : 60,
      } as PhoneRateLimitError;
    }
    throw error;
  }
}

/**
 * Verifie le code et connecte l'utilisateur.
 *
 * @throws {PhoneCodeError} sur 401 — code refuse, avec le motif et le nombre
 * de tentatives restantes.
 */
export async function verifyPhoneCode(
  phoneNumber: string,
  code: string,
  profile?: PhoneProfile,
): Promise<PhoneVerifyResult> {
  let customToken: string;
  let isNewUser: boolean;

  try {
    const { data } = await axios.post(
      `${Config.apiUrl}/auth/phone/verify`,
      // Les champs de profil ne servent qu'a l'inscription : le backend les
      // ignore sur une connexion, on peut donc toujours les envoyer.
      { phoneNumber, code, ...profile },
      { headers },
    );
    customToken = data.customToken;
    isNewUser = !!data.isNewUser;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      const d = error.response.data ?? {};
      throw {
        invalidCode: true,
        reason: d.reason ?? d.data?.reason,
        attemptsRemaining: d.attemptsRemaining ?? d.data?.attemptsRemaining,
      } as PhoneCodeError;
    }
    throw error;
  }

  // ⚠️ ECHANGE OBLIGATOIRE : le `customToken` n'ouvre aucune session a lui
  // seul. C'est `signInWithCustomToken` qui cree l'utilisateur Firebase, dont
  // l'`idToken` sert ensuite aux appels proteges.
  const cred = await signInWithCustomToken(auth, customToken);
  const userData = await userFirestore.getUser(cred.user);

  return { isNewUser, userData };
}
