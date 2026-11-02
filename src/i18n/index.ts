import i18next from "i18next";
import moment from "moment";
import "moment/locale/fr";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { DevSettings, Platform } from "react-native";
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
 * des le premier import, y compris dans les constantes de module. Changer de
 * langue enregistre le choix puis recharge l'app.
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

/** Enregistre la langue puis recharge l'app pour l'appliquer partout. */
export async function setLanguage(lang: AppLanguage): Promise<void> {
  if (lang === getLanguage()) return;
  writeStored(lang);
  await i18next.changeLanguage(lang);
  if (Platform.OS === "web") {
    globalThis.location?.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}
