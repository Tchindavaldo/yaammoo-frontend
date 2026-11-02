import i18next from "i18next";
import moment from "moment";
import "moment/locale/fr";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

/**
 * Langues de l'app (i18next). Les CLES sont les textes francais eux-memes :
 * `t("Ajouter au panier")` renvoie la cle en francais, sa traduction en anglais.
 * - `locales/en.json` : traduction anglaise de chaque cle.
 * - `locales/fr.json` : surcharges francaises (changer un mot francais sans
 *   toucher au code : `"Ajouter au panier": "Mettre au panier"`).
 *
 * Initialisation SYNCHRONE (choix lu via SecureStore.getItem) : `t()` est juste
 * des le premier import. Changer de langue se fait A CHAUD, sans recharger
 * l'app : chaque composant qui affiche un texte traduit appelle `useLanguage()`
 * et se re-rend quand la langue change (etat, navigation et scroll conserves).
 */
export type AppLanguage = "fr" | "en";

export const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

const STORAGE_KEY = "app_language";

const isLang = (v: unknown): v is AppLanguage => v === "fr" || v === "en";

function readStored(): AppLanguage | null {
  try {
    const v =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(STORAGE_KEY)
        : SecureStore.getItem(STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function writeStored(lang: AppLanguage) {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(STORAGE_KEY, lang);
    else SecureStore.setItem(STORAGE_KEY, lang);
  } catch {
    // sans stockage, le choix vaut pour la session seulement
  }
}

/** Langue du telephone : anglais si le telephone est en anglais, sinon francais. */
function deviceLanguage(): AppLanguage {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "";
    return loc.toLowerCase().startsWith("en") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

const initial: AppLanguage = readStored() ?? deviceLanguage();

i18next.init({
  lng: initial,
  fallbackLng: "fr",
  resources: { fr: { translation: fr }, en: { translation: en } },
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  initAsync: false,
});

// Jours et mois des dates `moment` (historique du portefeuille).
moment.locale(initial);

/** Traduit un texte (cle = texte francais). Variables : `{{a}}`, `{{b}}`… */
export function t(key: string, vars?: Record<string, unknown>): string {
  return i18next.t(key, vars as any) as string;
}

export function getLanguage(): AppLanguage {
  return isLang(i18next.language) ? i18next.language : "fr";
}

/** Locale des dates (`toLocaleDateString`) selon la langue de l'app. */
export function dateLocale(): string {
  return getLanguage() === "en" ? "en-GB" : "fr-FR";
}

const listeners = new Set<() => void>();

function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Abonne le composant a la langue : il se re-rend quand elle change.
 * A appeler en tete de tout composant / hook qui affiche un texte traduit.
 * La valeur renvoyee sert de dependance aux `useMemo` / `useCallback` qui
 * calculent un texte traduit.
 */
export function useLanguage(): AppLanguage {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/** Enregistre la langue et l'applique a chaud a toute l'app (sans recharger). */
export async function setLanguage(lang: AppLanguage): Promise<void> {
  if (lang === getLanguage()) return;
  writeStored(lang);
  moment.locale(lang);
  await i18next.changeLanguage(lang);
  listeners.forEach((listener) => listener());
}
