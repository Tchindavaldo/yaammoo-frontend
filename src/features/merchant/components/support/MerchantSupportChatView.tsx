import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMerchantKeyboardOffset } from "../../hooks/useMerchantKeyboardOffset";
import type {
  MerchantSupportMessage,
  MerchantSupportThread,
} from "../../types/merchantSupport.types";
import { MerchantSupportBubble } from "./MerchantSupportBubble";
import { MerchantSupportComposer } from "./MerchantSupportComposer";

interface Props {
  thread: MerchantSupportThread;
  /** Hauteur navbar + safe area bas, pour caler la saisie au-dessus. */
  bottomInset?: number;
}

/**
 * Conversation vue par la BOUTIQUE. Pas de chips d'objet : celui-ci est posé
 * par le client à la création du fil et n'est pas modifiable ici — il est
 * rappelé dans le header. Design seul : l'envoi reste local.
 */
export const MerchantSupportChatView: React.FC<Props> = ({
  thread,
  bottomInset = 0,
}) => {
  const [messages, setMessages] = useState<MerchantSupportMessage[]>(
    thread.messages
  );
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const paddingBottom = useMerchantKeyboardOffset(bottomInset + 10);

  useEffect(() => {
    setMessages(thread.messages);
    setDraft("");
  }, [thread]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        // La boutique répond : côté backend c'est l'auteur `support`.
        author: "support",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

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
