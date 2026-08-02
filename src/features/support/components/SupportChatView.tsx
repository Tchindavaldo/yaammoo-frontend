import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import type {
  SupportMessage,
  SupportThread,
  SupportTopic,
} from "../types/support.types";
import { SupportComposer } from "./SupportComposer";
import { SupportMessageBubble } from "./SupportMessageBubble";
import { SupportTopicChips } from "./SupportTopicChips";

interface Props {
  /** `null` = nouveau chat : les chips sont sélectionnables. */
  thread: SupportThread | null;
  /** Hauteur navbar + safe area bas, pour caler la saisie au-dessus. */
  bottomInset?: number;
}

/**
 * Vue conversation. En haut, les chips « objet de la discussion » (sélectionnables
 * seulement sur un nouveau chat) ; au centre les messages, en bas la saisie.
 * Design seul : l'envoi ajoute le message localement, sans appel réseau.
 */
export const SupportChatView: React.FC<Props> = ({
  thread,
  bottomInset = 0,
}) => {
  const [topic, setTopic] = useState<SupportTopic | null>(thread?.topic ?? null);
  const [messages, setMessages] = useState<SupportMessage[]>(
    thread?.messages ?? []
  );
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  /**
   * Clavier ouvert : le KeyboardAvoidingView remonte déjà la saisie, l'inset de
   * navbar ferait un vide entre l'input et le clavier. Fermé : on garde l'inset
   * plus une marge, sinon la saisie touche la barre d'onglets.
   */
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    setTopic(thread?.topic ?? null);
    setMessages(thread?.messages ?? []);
    setDraft("");
  }, [thread]);

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

  const needsTopic = !thread && !topic;

  return (
    <View style={styles.flex}>
      <SupportTopicChips
        value={topic}
        onChange={setTopic}
        readOnly={!!thread}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {needsTopic
                ? "Choisissez l'objet de votre discussion"
                : "Décrivez votre demande"}
            </Text>
            <Text style={styles.emptyText}>
              Notre équipe vous répond dans les meilleurs délais.
            </Text>
          </View>
        ) : (
          messages.map((m) => <SupportMessageBubble key={m.id} message={m} />)
        )}
      </ScrollView>

      <View style={{ paddingBottom: keyboardUp ? 8 : bottomInset + 10 }}>
        <SupportComposer
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          disabled={needsTopic}
          placeholder={
            needsTopic ? "Sélectionnez un objet ci-dessus" : "Écrire un message…"
          }
        />
      </View>
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
