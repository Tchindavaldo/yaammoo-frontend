import { socketService } from "@/src/services/socket";
import { useCallback, useEffect, useState } from "react";
import { merchantSupportService } from "../services/merchantSupportService";
import type {
  MerchantSupportMessage,
  MerchantSupportThread,
} from "../types/merchantSupport.types";

interface Options {
  /** Compte marchand connecté ; sans lui aucune réponse n'est possible. */
  userId?: string;
  thread: MerchantSupportThread;
  /** Remonte le fil mis à jour à la liste. */
  onThreadUpdated?: (thread: MerchantSupportThread) => void;
}

/**
 * Conversation vue par la boutique : messages, réponse, temps réel.
 * La boutique ne crée jamais de fil — elle répond seulement.
 */
export const useMerchantSupportConversation = ({
  userId,
  thread,
  onThreadUpdated,
}: Options) => {
  const [messages, setMessages] = useState<MerchantSupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setError(null);
    setLoading(true);

    merchantSupportService
      .getMessages(thread.id)
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch((e) => {
        console.error("useMerchantSupportConversation:", e?.message || e);
        if (!cancelled) setError("Impossible de charger les messages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // L'ouverture du fil vaut lecture côté boutique.
    merchantSupportService.markRead(thread.id).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thread]);

  // Temps réel : n'accepte que les messages du fil affiché.
  useEffect(() => {
    const socket = socketService.getSocket();
    const onMessage = (data: {
      threadId?: string;
      message?: MerchantSupportMessage;
    }) => {
      if (!data?.message || data.threadId !== thread.id) return;
      setMessages((prev) =>
        prev.some((m) => m.id === data.message!.id)
          ? prev
          : [...prev, data.message!]
      );
    };
    socket.on("support.message", onMessage);
    return () => {
      socket.off("support.message", onMessage);
    };
  }, [thread.id]);

  /** @returns true si la réponse est partie. */
  const send = useCallback(
    async (text: string) => {
      const body = text.trim();
      if (!body || !userId || sending) return false;

      setSending(true);
      setError(null);
      try {
        const res = await merchantSupportService.reply(thread.id, {
          userId,
          text: body,
        });
        // Le socket renvoie le même message : on deduplique par id.
        setMessages((prev) =>
          prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
        );
        onThreadUpdated?.(res.thread);
        return true;
      } catch (e: any) {
        console.error("useMerchantSupportConversation send:", e?.message || e);
        setError("Message non envoyé, réessayez");
        return false;
      } finally {
        setSending(false);
      }
    },
    [userId, sending, thread.id, onThreadUpdated]
  );

  return { messages, loading, sending, error, send };
};
