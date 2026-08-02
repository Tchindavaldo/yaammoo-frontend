import { socketService } from "@/src/services/socket";
import { useCallback, useEffect, useRef, useState } from "react";
import { supportService } from "../services/supportService";
import type {
  SupportMessage,
  SupportThread,
  SupportTopic,
} from "../types/support.types";

interface Options {
  userId?: string;
  /** Fil ouvert depuis l'historique ; `null` = nouveau chat. */
  thread: SupportThread | null;
  /** Remonte le fil (créé ou mis à jour) à la liste. */
  onThreadUpdated?: (thread: SupportThread) => void;
}

/**
 * Conversation support côté client : messages, envoi, temps réel.
 *
 * Le premier message d'un nouveau chat crée le fil (`POST /support/threads`) ;
 * les suivants passent par `POST /support/threads/:id/messages`.
 */
export const useSupportConversation = ({
  userId,
  thread,
  onThreadUpdated,
}: Options) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Id du fil courant : posé par la création quand on part d'un nouveau chat. */
  const threadIdRef = useRef<string | null>(thread?.id ?? null);

  useEffect(() => {
    threadIdRef.current = thread?.id ?? null;
    setMessages([]);
    setError(null);

    if (!thread) return;
    let cancelled = false;
    setLoading(true);
    supportService
      .getMessages(thread.id)
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch((e) => {
        console.error("useSupportConversation:", e?.message || e);
        if (!cancelled) setError("Impossible de charger les messages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // L'ouverture du fil vaut lecture.
    supportService.markRead(thread.id).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [thread]);

  // Temps réel : n'accepte que les messages du fil affiché.
  useEffect(() => {
    const socket = socketService.getSocket();
    const onMessage = (data: { threadId?: string; message?: SupportMessage }) => {
      if (!data?.message || data.threadId !== threadIdRef.current) return;
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
  }, []);

  /**
   * Envoie un message. `topic` n'est utilisé que pour la création du fil.
   * @returns true si l'envoi a abouti.
   */
  const send = useCallback(
    async (text: string, topic: SupportTopic | null, fastFoodId?: string | null) => {
      const body = text.trim();
      if (!body || !userId || sending) return false;

      setSending(true);
      setError(null);
      try {
        const current = threadIdRef.current;
        const res = current
          ? await supportService.sendMessage(current, { userId, text: body })
          : await supportService.createThread({
              userId,
              topic: topic as SupportTopic,
              text: body,
              fastFoodId: fastFoodId ?? null,
            });

        threadIdRef.current = res.thread.id;
        // Le socket renvoie le même message : on deduplique par id.
        setMessages((prev) =>
          prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]
        );
        onThreadUpdated?.(res.thread);
        return true;
      } catch (e: any) {
        console.error("useSupportConversation send:", e?.message || e);
        setError("Message non envoyé, réessayez");
        return false;
      } finally {
        setSending(false);
      }
    },
    [userId, sending, onThreadUpdated]
  );

  return { messages, loading, sending, error, send };
};
