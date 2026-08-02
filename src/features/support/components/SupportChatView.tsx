import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { Toast } from "@/src/components/Toast";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";
import type {
  SupportMessage,
  SupportThread,
  SupportTopic,
} from "../types/support.types";
import { SupportComposer } from "./SupportComposer";
import { SupportMessageBubble } from "./SupportMessageBubble";
import { SupportTopicChips } from "./SupportTopicChips";

interface Props {
  /** `null` = nouveau chat : l'objet reste à choisir. */
  thread: SupportThread | null;
  /** Hauteur navbar + safe area bas, pour caler la saisie au-dessus. */
  bottomInset?: number;
  /** Remonte l'objet choisi au header (affiché sous le titre). */
  onTopicChange?: (topic: SupportTopic | null) => void;
}

/**
 * Vue conversation.
 *
 * Nouveau chat : la saisie est affichée d'emblée mais BLOQUÉE, avec les chips
 * d'objet juste au-dessus. Un tap sur la saisie déclenche un toast invitant à
 * choisir un objet. Dès la sélection, les chips disparaissent (l'objet passe
 * dans le header) et la saisie s'active.
 */
export const SupportChatView: React.FC<Props> = ({
  thread,
  bottomInset = 0,
  onTopicChange,
}) => {
  const [topic, setTopic] = useState<SupportTopic | null>(thread?.topic ?? null);
  const [messages, setMessages] = useState<SupportMessage[]>(
    thread?.messages ?? []
  );
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const paddingBottom = useKeyboardOffset(bottomInset + 10);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setTopic(thread?.topic ?? null);
    setMessages(thread?.messages ?? []);
    setDraft("");
  }, [thread]);

  useEffect(() => {
    onTopicChange?.(topic);
  }, [topic, onTopicChange]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        author: "user",
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
            <Text style={styles.emptyTitle}>
              {topic
                ? "Décrivez votre demande"
                : "Comment pouvons-nous vous aider ?"}
            </Text>
            <Text style={styles.emptyText}>
              {topic
                ? "Notre équipe vous répond dans les meilleurs délais."
                : "Choisissez l'objet de votre discussion pour démarrer."}
            </Text>
          </View>
        ) : (
          messages.map((m) => <SupportMessageBubble key={m.id} message={m} />)
        )}
      </ScrollView>

      <Animated.View style={{ paddingBottom }}>
        {/* Chips seulement tant que l'objet n'est pas choisi (ensuite : header). */}
        {!topic ? <SupportTopicChips value={topic} onChange={setTopic} /> : null}
        <SupportComposer
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          disabled={!topic}
          placeholder={
            topic ? "Écrire un message…" : "Sélectionnez d'abord un objet"
          }
          onBlockedPress={() =>
            setToast("Vous devez d'abord sélectionner un objet")
          }
        />
      </Animated.View>

      {toast ? (
        <Toast message={toast} type="info" onHide={() => setToast(null)} />
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
