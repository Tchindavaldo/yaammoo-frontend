import { useEffect, useRef } from "react";
import { Commande } from "@/src/types";

type Status = "pending" | "active" | "finished" | "delivered";

/**
 * Tap sur une notification de commande (`/(tabs)/orders?orderId=`) : retrouve
 * la commande dans les listes par statut et appelle `open` avec son statut
 * RÉEL (la route du push peut être en retard sur l'état de la commande).
 * Une seule fois par orderId ; attend que les commandes soient chargées.
 */
export function useFocusOrderFromNotification(
  orderId: string | undefined,
  lists: Record<Status, Commande[]>,
  open: (status: Status, order: Commande) => void,
) {
  const done = useRef<string | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    if (!orderId || done.current === orderId) return;
    for (const status of Object.keys(lists) as Status[]) {
      const order = lists[status].find((o) => o.id === orderId);
      if (!order) continue;
      done.current = orderId;
      openRef.current(status, order);
      return;
    }
  }, [orderId, lists.pending, lists.active, lists.finished, lists.delivered]);
}
