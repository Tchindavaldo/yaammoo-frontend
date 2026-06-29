import * as Sentry from "@sentry/react-native";
import { Config } from "@/src/api/config";

/**
 * Initialise Sentry (crash reporting JS + natif).
 *
 * Le DSN vient de `Config.sentryDsn`. Tant qu'il est vide, on n'initialise
 * pas Sentry : l'app fonctionne normalement, aucun crash n'est envoyé.
 * Dès que tu colles ton DSN dans `src/api/config.ts`, les crashs remontent
 * automatiquement sur ton dashboard sentry.io — y compris en build
 * TestFlight / App Store (release), sans brancher l'iPhone.
 */
export function initSentry() {
  if (!Config.sentryDsn) {
    if (__DEV__) {
      console.log("[Sentry] DSN absent → crash reporting désactivé.");
    }
    return;
  }

  Sentry.init({
    dsn: Config.sentryDsn,
    // Capture les erreurs JS non gérées ET les crashs natifs.
    enableNative: true,
    // Désactive l'envoi en dev pour ne pas polluer le dashboard.
    enabled: !__DEV__,
    // Traces de perf légères (ajuste/0 si tu veux uniquement les crashs).
    tracesSampleRate: 0.2,
    // Joint les derniers logs/clics avant le crash.
    attachStacktrace: true,
  });
}

/**
 * Enveloppe le composant racine pour la capture native + le touch tracking.
 * Utilisé sur l'export par défaut de `app/_layout.tsx`.
 */
export const wrapWithSentry = Sentry.wrap;

export { Sentry };
