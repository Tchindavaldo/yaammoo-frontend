import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SUPPORT_THREADS_MOCK } from "../data/support.mock";
import type { SupportThread } from "../types/support.types";
import { SupportChatView } from "./SupportChatView";
import { SupportThreadRow } from "./SupportThreadRow";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Deux écrans dans une même sheet : liste des discussions, puis conversation. */
type Screen = { name: "list" } | { name: "chat"; thread: SupportThread | null };

/**
 * « Contactez-nous » (Settings). Bottom sheet quasi plein écran : liste des
 * discussions passées + bouton bas « Nouveau chat » qui ouvre une conversation
 * vierge, dont l'objet se choisit en chips en haut.
 */
export const SupportChatSheet: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  const threads = SUPPORT_THREADS_MOCK;

  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setScreen({ name: "list" });
    }
    const t = Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      useNativeDriver: true,
    });
    t.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => t.stop();
  }, [visible, anim]);

  if (!mounted) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const inChat = screen.name === "chat";
  const title = inChat
    ? screen.thread
      ? screen.thread.title
      : "Nouveau chat"
    : "Contactez-nous";

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.veil, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingTop: insets.top + 6, transform: [{ translateY }] },
        ]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* En-tête */}
          <View style={styles.header}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => (inChat ? setScreen({ name: "list" }) : onClose())}
            >
              <Ionicons
                name={inChat ? "chevron-back" : "close"}
                size={22}
                color={Theme.colors.dark}
              />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          {inChat ? (
            <SupportChatView thread={screen.thread} />
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.listPad}>
                <Text style={styles.section}>Vos discussions</Text>
                {threads.length === 0 ? (
                  <View style={styles.empty}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={30}
                      color={Theme.colors.gray[500]}
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
                      onPress={(thread) => setScreen({ name: "chat", thread })}
                    />
                  ))
                )}
              </ScrollView>

              <View style={styles.footer}>
                <Pressable
                  style={styles.newChat}
                  onPress={() => setScreen({ name: "chat", thread: null })}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={Theme.colors.white}
                  />
                  <Text style={styles.newChatText}>Nouveau chat</Text>
                </Pressable>
              </View>
            </>
          )}

          <View style={{ height: insets.bottom || Theme.spacing.sm }} />
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    marginTop: 40,
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.sm,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.colors.gray[200],
  },
  headerBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.dark,
  },
  listPad: { paddingBottom: Theme.spacing.md },
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
  emptyText: { fontSize: 13.5, color: Theme.colors.gray[600] },
  footer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.gray[200],
  },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.primary,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.white,
  },
});
