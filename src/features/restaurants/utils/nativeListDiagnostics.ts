import { Sentry } from "@/src/services/sentry";

/**
 * Rapports de fluidite de la liste NATIVE du home (`onDiagnostics`, iOS).
 *
 * Le natif n'en envoie qu'en TestFlight et en debug (`HLPerfMonitor.enabled`),
 * jamais en build App Store. Ils partent UNIQUEMENT dans le journal de
 * l'iPhone (`logReport`), plus vers Sentry : un rapport par geste de scroll
 * (`kind: "scroll"` : `dropped`/`hitches`/`worstMs`, `mainBusy`, mouvement
 * `motion`/`stalls`/`jumps`, `events` des 3 premiers gestes) et par arrivee
 * de page (`kind: "apply"`). Detail des champs : `architecture/restaurants.md`.
 */

let announced = false;

/** Une fois par lancement : preuve que la build embarque bien la liste native. */
export const announceNativeList = () => {
  if (announced) return;
  announced = true;
  console.log("[NATIVE] liste native du home active");
  Sentry.captureMessage("home-list: liste native active", {
    level: "info",
    tags: { home_list: "native" },
  });
};

/** Taille d'un morceau : le journal systeme coupe une ligne vers 1 000 caracteres. */
const LOG_CHUNK = 800;
let logSeq = 0;

/**
 * Journal du telephone, lisible en direct depuis l'ordinateur (en USB) :
 * iPhone `idevicesyslog -m "[HL]"`, Android `adb logcat -s ReactNativeJS | grep "\[HL\]"`. Ligne `[HL] <rapport> <morceau>/<total> <json>`,
 * le JSON etant decoupe pour ne pas etre tronque. Passe par le JS : un `NSLog`
 * natif sort masque (`<private>`) en release sous iOS 26, `console.log` non.
 */
export const reportNativeDiagnostics = (r: Record<string, any>) => {
  const json = JSON.stringify(r);
  const count = Math.max(1, Math.ceil(json.length / LOG_CHUNK));
  logSeq += 1;
  for (let i = 0; i < count; i++) {
    console.log(`[HL] ${logSeq} ${i + 1}/${count} ${json.slice(i * LOG_CHUNK, (i + 1) * LOG_CHUNK)}`);
  }
};
