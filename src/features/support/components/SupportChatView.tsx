import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
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
 * Nouveau chat : d'abord un état vide CENTRÉ (titre + description) avec les
 * chips d'objet en bas — pas de saisie tant qu'aucun objet n'est choisi. Dès la
 * sélection, les chips disparaissent (l'objet passe dans le header) et la
 * saisie apparaît.
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

  // Nouveau chat sans objet : écran de choix, ni messages ni saisie.
  if (!topic) {
    return (
      <View style={styles.flex}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.introText}>
            Choisissez l&apos;objet de votre discussion pour démarrer. Notre
            équipe vous répond dans les meilleurs délais.
          </Text>
        </View>

        <View style={{ paddingBottom: bottomInset + 16 }}>
          <SupportTopicChips value={topic} onChange={setTopic} />
        </View>
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
            <Text style={styles.emptyTitle}>Décrivez votre demande</Text>
            <Text style={styles.emptyText}>
              Notre équipe vous répond dans les meilleurs délais.
            </Text>
          </View>
        ) : (
          messages.map((m) => <SupportMessageBubble key={m.id} message={m} />)
        )}
      </ScrollView>

      <Animated.View style={{ paddingBottom }}>
        <SupportComposer value={draft} onChangeText={setDraft} onSend={send} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingTop: Theme.spacing.sm, paddingBottom: Theme.spacing.md },
  intro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    gap: 8,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Theme.colors.dark,
    textAlign: "center",
  },
  introText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Theme.colors.gray[600],
    textAlign: "center",
  },
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
