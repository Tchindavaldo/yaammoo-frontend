import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { Toast } from "@/src/components/Toast";
import { useMerchantKeyboardOffset } from "../../hooks/useMerchantKeyboardOffset";
import { useMerchantSupportConversation } from "../../hooks/useMerchantSupportConversation";
import type { MerchantSupportThread } from "../../types/merchantSupport.types";
import { MerchantSupportBubble } from "./MerchantSupportBubble";
import { MerchantSupportComposer } from "./MerchantSupportComposer";
import { MerchantSupportMessagesSkeleton } from "./MerchantSupportMessagesSkeleton";

interface Props {
  thread: MerchantSupportThread;
  /** Compte marchand connecté ; sans lui aucune réponse n'est possible. */
  userId?: string;
  /** Hauteur navbar + safe area bas, pour caler la saisie au-dessus. */
  bottomInset?: number;
  /** Remonte le fil mis à jour à la liste. */
  onThreadUpdated?: (thread: MerchantSupportThread) => void;
}

/**
 * Conversation vue par la BOUTIQUE. Pas de chips d'objet : celui-ci est posé
 * par le client à la création du fil et n'est pas modifiable ici — il est
 * rappelé dans le header.
 */
export const MerchantSupportChatView: React.FC<Props> = ({
  thread,
  userId,
  bottomInset = 0,
  onThreadUpdated,
}) => {
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const paddingBottom = useMerchantKeyboardOffset(bottomInset + 10);

  const { messages, loading, sending, error, send: reply } =
    useMerchantSupportConversation({ userId, thread, onThreadUpdated });

  useEffect(() => {
    setDraft("");
  }, [thread]);

  useEffect(() => {
    if (error) setToast(error);
  }, [error]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    // Vidé d'emblée pour garder la saisie fluide ; restauré si l'envoi échoue.
    setDraft("");
    const ok = await reply(text);
    if (!ok) setDraft(text);
    else requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  // Ouverture d'un fil : tant que le GET tourne, on ne montre QUE le squelette
  // — ni texte d'accueil, ni barre de réponse, qui apparaîtraient une fraction
  // de seconde avant d'être remplacés par les messages.
  if (loading) {
    return (
      <View style={styles.flex}>
        <MerchantSupportMessagesSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            {/* Le cas « en chargement » est pris par le squelette au-dessus :
                ici le fil est bel et bien vide. */}
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
              Répondez au client pour démarrer la discussion.
            </Text>
          </View>
        ) : (
          messages.map((m) => (
            <MerchantSupportBubble key={m.id} message={m} />
          ))
        )}
      </ScrollView>

      <Animated.View style={{ paddingBottom }}>
        <MerchantSupportComposer
          value={draft}
          onChangeText={setDraft}
          onSend={send}
        />
      </Animated.View>

      {toast ? (
        <Toast message={toast} type="error" onHide={() => setToast(null)} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingTop: Theme.spacing.sm, paddingBottom: Theme.spacing.md },
  empty: {
    paddingTop: 48,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.dark,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Theme.colors.gray[600],
    textAlign: "center",
  },
});
