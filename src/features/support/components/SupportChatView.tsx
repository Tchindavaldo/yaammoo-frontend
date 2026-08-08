import { Theme } from "@/src/theme";
import React, { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { Toast } from "@/src/components/Toast";
import { useKeyboardOffset } from "../hooks/useKeyboardOffset";
import { useSupportConversation } from "../hooks/useSupportConversation";
import type { SupportThread, SupportTopic } from "../types/support.types";
import { SupportComposer } from "./SupportComposer";
import { SupportMessageBubble } from "./SupportMessageBubble";
import { SupportMessagesSkeleton } from "./SupportMessagesSkeleton";
import { SupportTopicChips } from "./SupportTopicChips";

interface Props {
  /** `null` = nouveau chat : l'objet reste à choisir. */
  thread: SupportThread | null;
  /** Client connecté ; sans lui aucun envoi n'est possible. */
  userId?: string;
  /** Boutique concernée par la demande ; `null` = plateforme yaammoo. */
  fastFoodId?: string | null;
  /** Hauteur navbar + safe area bas, pour caler la saisie au-dessus. */
  bottomInset?: number;
  /** Remonte l'objet choisi au header (affiché sous le titre). */
  onTopicChange?: (topic: SupportTopic | null) => void;
  /** Remonte le fil créé ou mis à jour à la liste. */
  onThreadUpdated?: (thread: SupportThread) => void;
}

/**
 * Vue conversation.
 *
 * Nouveau chat : la saisie est affichée d'emblée mais BLOQUÉE, avec les chips
 * d'objet juste au-dessus. Un tap sur la saisie déclenche un toast invitant à
 * choisir un objet. La sélection débloque la saisie ; les chips ne disparaissent
 * qu'au PREMIER message envoyé (l'objet passe alors dans le header).
 */
export const SupportChatView: React.FC<Props> = ({
  thread,
  userId,
  fastFoodId = null,
  bottomInset = 0,
  onTopicChange,
  onThreadUpdated,
}) => {
  const [topic, setTopic] = useState<SupportTopic | null>(thread?.topic ?? null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const paddingBottom = useKeyboardOffset(bottomInset + 10);
  const [toast, setToast] = useState<string | null>(null);

  const {
    messages,
    loading,
    sending,
    error,
    send: sendMessage,
  } = useSupportConversation({
    userId,
    thread,
    onThreadUpdated,
  });

  useEffect(() => {
    setTopic(thread?.topic ?? null);
    setDraft("");
  }, [thread]);

  useEffect(() => {
    onTopicChange?.(topic);
  }, [topic, onTopicChange]);

  // L'erreur d'envoi remonte du hook : on la montre en toast, une seule fois.
  useEffect(() => {
    if (error) setToast(error);
  }, [error]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    // Vidé d'emblée pour que la saisie reste fluide ; restauré si l'envoi échoue.
    setDraft("");
    const ok = await sendMessage(text, topic, fastFoodId);
    if (!ok) setDraft(text);
    else requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  // Ouverture d'un fil existant : tant que le GET tourne, on ne montre QUE le
  // squelette — ni texte d'accueil, ni chips, ni saisie, qui apparaîtraient
  // une fraction de seconde avant d'être remplacés par les messages.
  if (loading) {
    return (
      <View style={styles.flex}>
        <SupportMessagesSkeleton />
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
        {/* Les chips restent tant qu'aucun message n'est parti : l'objet peut
            encore être corrigé. Au 1er envoi elles disparaissent (header). */}
        {messages.length === 0 ? (
          <SupportTopicChips value={topic} onChange={setTopic} />
        ) : null}
        <SupportComposer
          value={draft}
          onChangeText={setDraft}
          onSend={send}
          disabled={!topic || sending}
          placeholder={
            topic ? "Écrire un message…" : "Sélectionnez d'abord un objet"
          }
          onBlockedPress={() =>
            setToast(
              topic
                ? "Envoi en cours…"
                : "Vous devez d'abord sélectionner un objet"
            )
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
