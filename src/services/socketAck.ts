/**
 * Dédoublonnage + ACK pour les events socket rejoués par le backend.
 *
 * Le backend garantit la livraison : un event envoyé à un user hors ligne reste
 * en base et est rejoué au `join_user`. Tant que le front n'a pas appelé le
 * callback `ack`, le backend considère l'event non reçu et le rejouera.
 *
 * Deux obligations côté front (gérées ici une fois pour toutes) :
 *  1. Appeler `ack()` à la fin de CHAQUE handler (succès ou erreur).
 *  2. Dédoublonner via `__eventId` : un même event peut arriver en live PUIS
 *     être rejoué (ou rejoué plusieurs fois). On ne le traite qu'une seule fois.
 */

// Ids déjà traités (vie = session de l'app). Borné pour éviter une fuite mémoire.
const seen = new Set<string>();
const MAX_SEEN = 2000;

const remember = (eventId: string) => {
  seen.add(eventId);
  if (seen.size > MAX_SEEN) {
    // Purge la plus ancienne moitié (Set garde l'ordre d'insertion).
    const toDrop = seen.size - MAX_SEEN / 2;
    let i = 0;
    for (const id of seen) {
      if (i++ >= toDrop) break;
      seen.delete(id);
    }
  }
};

type SocketAck = (() => void) | undefined;

/**
 * Enrobe un handler d'event : dédoublonne via `data.__eventId` puis ACK.
 * Le second argument d'un listener socket.io (quand le serveur émet avec ack)
 * est le callback d'acquittement.
 *
 * Usage : socket.on("wallet.credited", withAck((data) => { ...patch store... }));
 */
export const withAck = <T = any>(handler: (data: T) => void) => {
  return (data: T, ack?: SocketAck) => {
    const eventId = (data as any)?.__eventId as string | undefined;

    // Déjà traité → on ré-acquitte sans rejouer la logique.
    if (eventId && seen.has(eventId)) {
      ack?.();
      return;
    }

    if (eventId) remember(eventId);

    try {
      handler(data);
    } catch (err) {
      console.error("Socket handler error:", err);
    } finally {
      // ACK même en cas d'erreur : sinon le backend rejoue en boucle un event
      // qui plante. La donnée est récupérable via un refresh manuel/au reconnect.
      ack?.();
    }
  };
};
