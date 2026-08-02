import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getThreadName,
  getTopicDescriptor,
  SUPPORT_DEFAULT_NAME,
  SUPPORT_THREADS_MOCK,
} from "../data/support.mock";
import type { SupportThread, SupportTopic } from "../types/support.types";
import { SupportChatView } from "./SupportChatView";
import { SupportThreadRow } from "./SupportThreadRow";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Deux écrans dans le même modal : liste des discussions, puis conversation. */
type Screen = { name: "list" } | { name: "chat"; thread: SupportThread | null };

/**
 * « Contactez-nous » (Settings). Écran PLEIN ÉCRAN calqué sur DriverApplyModal
 * (View absolue + TabHeader qui floute le settings). Liste des discussions
 * passées + bouton bas « Nouveau chat » qui ouvre une conversation vierge dont
 * l'objet se choisit en chips en haut.
 */
export const SupportChatSheet: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  /** Objet de la conversation courante, remonté par la vue chat pour le header. */
  const [chatTopic, setChatTopic] = useState<SupportTopic | null>(null);
  const threads = SUPPORT_THREADS_MOCK;

  // Hauteur navbar (≈58) + safe area bas, pour caler le bouton au-dessus.
  const TAB_BAR_HEIGHT = 58;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;
  // Espace réservé sous la liste = bouton (52) + marges + navbar.
  const listBottomPad = bottomInset + 52 + 32;

  // Chaque ouverture repart de la liste.
  useEffect(() => {
    if (visible) {
      setScreen({ name: "list" });
      setChatTopic(null);
    }
  }, [visible]);

  const handleTopicChange = useCallback(
    (topic: SupportTopic | null) => setChatTopic(topic),
    []
  );

  if (!visible) return null;

  const inChat = screen.name === "chat";
  const thread = inChat ? screen.thread : null;
  const unread = threads.reduce((n, t) => n + t.unreadCount, 0);

  // En conversation, le titre est l'interlocuteur (boutique ou yaammoo).
  const title = inChat
    ? thread
      ? getThreadName(thread)
      : SUPPORT_DEFAULT_NAME
    : "Contactez-nous";
  // En conversation, le sous-titre porte le seul objet de la discussion.
  const chatSubtitle = chatTopic
    ? getTopicDescriptor(chatTopic).label
    : "Choisissez l'objet de votre demande";
  const subtitle = inChat
    ? chatSubtitle
    : unread > 0
      ? `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`
      : `${threads.length} discussion${threads.length > 1 ? "s" : ""}`;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title={title}
        subtitle={subtitle}
        right={
          <HeaderPill
            label="Retour"
            icon="arrow-back-outline"
            onPress={() => (inChat ? setScreen({ name: "list" }) : onClose())}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      {/* Le décalage clavier est géré par useKeyboardOffset dans la vue chat :
          pas de KeyboardAvoidingView ici, les deux se cumuleraient. */}
      <View style={styles.flex}>
        {inChat ? (
          <View style={[styles.flex, { paddingTop: headerHeight + 6 }]}>
            <SupportChatView
              thread={thread}
              bottomInset={bottomInset}
              onTopicChange={handleTopicChange}
            />
          </View>
        ) : (
          <>
            <ScrollView
              style={[styles.flex, { marginTop: headerHeight + 6 }]}
              contentContainerStyle={{ paddingBottom: listBottomPad }}
            >
              <Text style={styles.section}>Vos discussions</Text>
              {threads.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={30}
                    color={Theme.colors.gray[400]}
                  />
                  <Text style={styles.emptyText}>
                    Aucune discussion pour le moment.
                  </Text>
                </View>
              ) : (
                threads.map((t) => (
                  <SupportThreadRow
                    key={t.id}
                    thread={t}
                    onPress={(target) => setScreen({ name: "chat", thread: target })}
                  />
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.newChat, { bottom: bottomInset + 16 }]}
              onPress={() => setScreen({ name: "chat", thread: null })}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.newChatText}>Nouveau chat</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2000 },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  flex: { flex: 1 },
  section: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: Theme.colors.gray[600],
  },
  empty: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 13.5, color: Theme.colors.gray[400] },
  newChat: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
  },
  newChatText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
