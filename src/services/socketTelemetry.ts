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
  | "foreground-skipped"
  | "zombie-recycled";

export function trackSocket(
  event: SocketEvent,
  extra: Record<string, unknown> = {},
) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    // Sans fingerprint, Sentry groupe par stack trace et titre l'issue avec le
    // nom de la fonction emettrice ; sans transaction, il la titre « anonymous ».
    scope.setFingerprint(["socket", event]);
    scope.setTransactionName(`Socket ${event}`);
    scope.setTag("socket.event", event);
    Object.entries(extra).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureMessage(`Socket ${event}`);
  });
}
