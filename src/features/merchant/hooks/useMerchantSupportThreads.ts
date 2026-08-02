import { socketService } from "@/src/services/socket";
import { useCallback, useEffect, useState } from "react";
import { merchantSupportService } from "../services/merchantSupportService";
import type { MerchantSupportThread } from "../types/merchantSupport.types";

/**
 * Fils reçus par la boutique : chargement HTTP + temps réel.
 *
 * Le backend émet `support.message` sur la room `<fastFoodId>` avec le fil déjà
 * à jour ; on remplace l'entrée concernée plutôt que de recharger la liste.
 */
export const useMerchantSupportThreads = (
  fastFoodId?: string,
  enabled = true
) => {
  const [threads, setThreads] = useState<MerchantSupportThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!fastFoodId) return;
    setLoading(true);
    setError(null);
    try {
      setThreads(await merchantSupportService.getThreads(fastFoodId));
    } catch (e: any) {
      console.error("useMerchantSupportThreads:", e?.message || e);
      setError("Impossible de charger les discussions");
    } finally {
      setLoading(false);
    }
  }, [fastFoodId]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  const upsert = useCallback((thread: MerchantSupportThread) => {
    setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
  }, []);

  useEffect(() => {
    if (!enabled || !fastFoodId) return;
    const socket = socketService.getSocket();
    const onMessage = (data: { thread?: MerchantSupportThread }) => {
      if (data?.thread) upsert(data.thread);
    };
    socket.on("support.message", onMessage);
    return () => {
      socket.off("support.message", onMessage);
    };
  }, [enabled, fastFoodId, upsert]);

  return { threads, loading, error, refresh, upsert };
};
