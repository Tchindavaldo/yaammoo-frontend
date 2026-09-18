import { auth } from "./firebase";

/**
 * Delai au-dela duquel on renonce au jeton et part sans lui.
 *
 * Genereux : un rafraichissement legitime prend moins d'une seconde sur un
 * reseau normal. Il ne s'agit pas d'etre rapide, mais de ne jamais rester
 * bloque.
 */
const TOKEN_TIMEOUT_MS = 4000;

/**
 * Jeton Firebase pour une route a authentification OPTIONNELLE, borne dans le
 * temps.
 *
 * ⚠️ `getIdToken()` declenche un appel RESEAU vers Firebase quand le jeton en
 * cache est expire, et cet appel ne passe PAS par axios : ni l'interceptor
 * hors-ligne ni l'annulation des requetes en vol ne l'atteignent. Sur un reseau
 * qui porte mal — donnees epuisees, box sans ligne — il ne rend jamais la main.
 * Le premier chargement du catalogue, celui qui leve le splash, restait alors
 * bloque pour toujours : l'app calait sur le splash screen.
 *
 * Ici le jeton ne fait qu'ENRICHIR la reponse (bonus livraison resolus pour
 * l'utilisateur) ; la route repond normalement sans lui. Renoncer est donc
 * toujours preferable a attendre.
 *
 * ⚠️ Ne pas utiliser pour une route qui EXIGE l'authentification : elle
 * repondrait 401 au lieu d'echouer franchement.
 */
export async function getOptionalIdToken(): Promise<string | null> {
  return Promise.race([
    auth.currentUser?.getIdToken().catch(() => null) ?? Promise.resolve(null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), TOKEN_TIMEOUT_MS)),
  ]);
}
