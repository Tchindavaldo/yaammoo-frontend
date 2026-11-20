// Telemetrie TEMPORAIRE du lien QR boutique (diagnostic : page de connexion
// entrevue au demarrage a froid). Filtrer dans Sentry par le tag `diag:qr`.
// A retirer une fois la cause trouvee.
import * as Sentry from "@sentry/react-native";
import { sinceBoot } from "@/src/utils/bootClock";

export function trackQr(step: string, data: Record<string, unknown> = {}) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    scope.setTag("diag", "qr");
    scope.setTag("qr_step", step);
    scope.setContext("qr", { ...data, at: Number(sinceBoot()) });
    Sentry.captureMessage(`qr.${step}`);
  });
}
