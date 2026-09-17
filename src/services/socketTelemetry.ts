import { Sentry } from "@/src/services/sentry";

/**
 * Telemetrie des transitions socket, envoyee a Sentry.
 *
 * Sert a trancher une question qu'aucun log local ne peut resoudre : quand
 * l'utilisateur revient dans l'app et ne voit pas ses events, lequel des cas
 * s'est produit ? Lien mort reconnecte, lien vivant re-joint, zombie recycle,
 * ou rattrapage purement et simplement SAUTE par la garde anti-rafale.
 *
 * ⚠️ Volume : un evenement par transition, et le retour au premier plan est deja
 * protege par un cooldown de 10 s. Aucun heartbeat ici.
 */

type SocketEvent =
  | "connect"
  | "disconnect"
  | "foreground-dead"
  | "foreground-alive"
  | "zombie-recycled";

export function trackSocket(
  event: SocketEvent,
  extra: Record<string, unknown> = {},
) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    // Regroupe sur nos propres cles plutot que sur la stack trace.
    scope.setFingerprint(["socket", event]);
    scope.setTransactionName(`Socket ${event}`);
    scope.setTag("socket.event", event);
    Object.entries(extra).forEach(([k, v]) => scope.setExtra(k, v));

    // ⚠️ Retire la stack trace de CET evenement uniquement. `attachStacktrace`
    // est actif globalement (indispensable aux vraies erreurs), mais tant qu'une
    // stack est presente Sentry titre l'issue d'apres elle — d'ou les
    // « anonymous » illisibles dans le feed. Sans stack, le titre devient le
    // message. `setTransactionName` ne suffit pas : il ne renseigne que le
    // champ Culprit.
    scope.addEventProcessor((sentryEvent) => {
      delete sentryEvent.exception;
      delete sentryEvent.threads;
      return sentryEvent;
    });

    Sentry.captureMessage(`Socket ${event}`);
  });
}
