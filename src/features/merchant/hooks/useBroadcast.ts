import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import {
  FREE_PLAN,
  broadcastErrorMessage,
  broadcastService,
} from "../services/broadcastService";
import { isLocalUri, uploadImageToServer } from "../services/uploadImage";
import type {
  BroadcastDraft,
  BroadcastItem,
  BroadcastPlan,
  BroadcastState,
} from "../types/broadcast.types";

/** Résultat d'un envoi : `message` = raison du refus (quota, audience…). */
export type BroadcastSendResult = { ok: true } | { ok: false; message: string };

/**
 * Plan, villes, historique des notifications de la boutique, et envoi.
 * Chargé à l'ouverture de l'écran (`active`), pas au boot : l'écran est rare.
 *
 * @param onLoadError appelé si le chargement échoue (l'écran affiche un toast).
 */
export const useBroadcast = (active: boolean, onLoadError: () => void) => {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;

  const [plan, setPlan] = useState<BroadcastPlan>(FREE_PLAN);
  const [cities, setCities] = useState<string[]>([]);
  const [items, setItems] = useState<BroadcastItem[]>([]);
  /** Premier chargement terminé (succès ou échec) : l'état vide peut s'afficher. */
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const apply = useCallback((state: BroadcastState) => {
    setPlan(state.plan);
    setCities(state.cities);
    setItems(state.items);
  }, []);

  // Chargement à l'ouverture. Les setState restent dans les callbacks de la
  // promesse, jamais dans le corps de l'effet.
  useEffect(() => {
    if (!active || !fastFoodId) return;
    let alive = true;
    broadcastService.getState(fastFoodId).then(
      (state) => {
        if (!alive) return;
        apply(state);
        setLoaded(true);
      },
      (error) => {
        if (!alive) return;
        console.error("Error fetching broadcast state:", error);
        setLoaded(true);
        onLoadError();
      },
    );
    return () => {
      alive = false;
    };
  }, [active, fastFoodId, apply, onLoadError]);

  /** Pull-to-refresh. */
  const refresh = useCallback(async () => {
    if (!fastFoodId) return;
    setRefreshing(true);
    try {
      apply(await broadcastService.getState(fastFoodId));
    } catch (error) {
      console.error("Error fetching broadcast state:", error);
      onLoadError();
    } finally {
      setRefreshing(false);
    }
  }, [fastFoodId, apply, onLoadError]);

  /** Upload l'image locale si besoin, envoie, puis place l'envoi en tête. */
  const send = useCallback(
    async (draft: BroadcastDraft): Promise<BroadcastSendResult> => {
      if (!fastFoodId || sending) return { ok: false, message: "Envoi indisponible" };
      setSending(true);
      try {
        let imageUrl: string | undefined;
        if (draft.imageUri) {
          imageUrl = isLocalUri(draft.imageUri)
            ? await uploadImageToServer(draft.imageUri, "broadcasts")
            : draft.imageUri;
        }
        const item = await broadcastService.send(fastFoodId, {
          title: draft.title.trim(),
          body: draft.body.trim() || undefined,
          imageUrl: imageUrl || undefined,
          audience: draft.audience,
          city: draft.audience === "city" && draft.city ? draft.city : undefined,
        });
        setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
        return { ok: true };
      } catch (error) {
        console.error("Error sending broadcast:", error);
        return { ok: false, message: broadcastErrorMessage(error, "Envoi impossible, réessayez") };
      } finally {
        setSending(false);
      }
    },
    [fastFoodId, sending],
  );

  return { plan, cities, items, loaded, refreshing, sending, refresh, send };
};
