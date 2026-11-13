import { Notification } from "../context/NotificationContext";

/**
 * Notification push touchée, en attente d'affichage par la page Notifications.
 *
 * Un tap sur une push n'ouvre JAMAIS directement la page cible : il mène à la
 * page Notifications, qui ouvre le mini bottom sheet de récap (même sheet que
 * depuis la liste) ; son bouton mène ensuite à la page concernée.
 */
let pending: Notification | null = null;
const listeners = new Set<() => void>();

export function setPendingPushTap(notif: Notification) {
  pending = notif;
  listeners.forEach((l) => l());
}

/** Récupère et vide la notification en attente. */
export function takePendingPushTap(): Notification | null {
  const n = pending;
  pending = null;
  return n;
}

export function onPendingPushTap(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
