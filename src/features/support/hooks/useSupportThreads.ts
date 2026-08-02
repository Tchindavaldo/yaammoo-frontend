import { socketService } from "@/src/services/socket";
import { useCallback, useEffect, useState } from "react";
import { supportService } from "../services/supportService";
import type { SupportThread } from "../types/support.types";

/**
 * Fils support du client : chargement HTTP + mise à jour temps réel.
 *
 * Le backend émet `support.message` sur la room `<userId>` avec le fil déjà à
 * jour ; on remplace l'entrée correspondante plutôt que de recharger la liste.
 */
export const useSupportThreads = (userId?: string, enabled = true) => {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setThreads(await supportService.getThreads(userId));
    } catch (e: any) {
      console.error("useSupportThreads:", e?.message || e);
      setError("Impossible de charger vos discussions");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  // Remonte le fil touché en tête : le backend trie par `updatedAt` desc.
  const upsert = useCallback((thread: SupportThread) => {
    setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;
    const socket = socketService.getSocket();
    const onMessage = (data: { thread?: SupportThread }) => {
      if (data?.thread) upsert(data.thread);
    };
    socket.on("support.message", onMessage);
    return () => {
      socket.off("support.message", onMessage);
    };
  }, [enabled, userId, upsert]);

  return { threads, loading, error, refresh, upsert };
};
