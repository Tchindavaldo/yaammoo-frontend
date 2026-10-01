import * as Location from "expo-location";
import { Platform } from "react-native";

/**
 * Permission de localisation « Pendant l'utilisation » : SEUL point d'entrée
 * de l'app (aucun appel direct à `requestForegroundPermissionsAsync` ailleurs).
 *
 * Android : la popup système est TOUJOURS précédée de l'écran de divulgation
 * (`LocationDisclosureModal`, monté une fois à la racine), exigé par Google
 * Play (« Obligation de divulgation bien visible et de consentement ») : quelle
 * donnée, pourquoi, avec qui elle est partagée, puis un choix explicite.
 * iOS : la popup système affiche déjà le texte d'usage d'`app.json`.
 *
 * Même principe que `backgroundPrompt` : un émetteur minimal, sans état partagé.
 */

/** Contexte de la demande : choisit le texte de l'écran de divulgation. */
export type LocationPurpose =
  /** Client, à la connexion : boutiques proches, offres de sa ville. */
  | "nearby"
  /** Client, bouton GPS de l'adresse de livraison (commande). */
  | "address"
  /** Marchand, position de la boutique (formulaire d'édition). */
  | "shop"
  /** Livreur, « Lancer » une course : position partagée au client. */
  | "delivery";

type Answer = (accepted: boolean) => void;
type Listener = (purpose: LocationPurpose, answer: Answer) => void;

let listener: Listener | null = null;
/** Écran déjà affiché : une 2e demande attend la même réponse. */
let pending: Promise<boolean> | null = null;

/** L'écran s'abonne à son montage. */
export const onLocationDisclosureRequest = (l: Listener) => {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
};

/**
 * Affiche l'écran de divulgation et attend le choix.
 * @returns true = « Continuer » (la popup système suit), false = « Non merci ».
 *   Sans écran monté, true : la popup part comme avant.
 */
const requestDisclosure = (purpose: LocationPurpose): Promise<boolean> => {
  if (pending) return pending;
  const current = listener;
  if (!current) return Promise.resolve(true);
  pending = new Promise<boolean>((resolve) => {
    let done = false;
    current(purpose, (accepted) => {
      if (done) return;
      done = true;
      pending = null;
      resolve(accepted);
    });
  });
  return pending;
};

/**
 * Demande la permission si l'OS peut encore afficher sa popup, précédée sur
 * Android de l'écran de divulgation. Déjà accordée ou refusée définitivement :
 * aucun écran, statut renvoyé tel quel.
 */
export const requestForegroundLocation = async (
  purpose: LocationPurpose,
): Promise<Location.PermissionStatus> => {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === "granted" || !current.canAskAgain) {
    return current.status;
  }
  if (Platform.OS === "android" && !(await requestDisclosure(purpose))) {
    return current.status;
  }
  return (await Location.requestForegroundPermissionsAsync()).status;
};
