import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import {
  getMerchantTopicDescriptor,
  MERCHANT_SUPPORT_STATUS_LABEL,
} from "../../data/merchantSupport.constants";
import { useMerchantSupportThreads } from "../../hooks/useMerchantSupportThreads";
import type { MerchantSupportThread } from "../../types/merchantSupport.types";
import { MerchantSupportChatView } from "./MerchantSupportChatView";
import { MerchantSupportThreadRow } from "./MerchantSupportThreadRow";
import { MerchantSupportThreadsSkeleton } from "./MerchantSupportThreadsSkeleton";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Deux écrans dans le même modal : liste des fils reçus, puis conversation. */
type Screen = { name: "list" } | { name: "chat"; thread: MerchantSupportThread };

/**
 * « Messages » (Settings → Boutique). Écran PLEIN ÉCRAN calqué sur
 * DriverApplyModal. La boutique consulte les discussions ouvertes par ses
 * clients et y répond ; elle n'en crée jamais — pas de bouton « Nouveau chat ».
 */
export const MerchantSupportModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [screen, setScreen] = useState<Screen>({ name: "list" });
  const { userData } = useAuth();
  const { threads, loading, upsert } = useMerchantSupportThreads(
    userData?.fastFoodId,
    visible
  );

  // Hauteur navbar (≈58) + safe area bas.
  const TAB_BAR_HEIGHT = 58;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  // Chaque ouverture repart de la liste.
  useEffect(() => {
    if (visible) setScreen({ name: "list" });
  }, [visible]);

  if (!visible) return null;

  const inChat = screen.name === "chat";
  const thread = inChat ? screen.thread : null;
  // Côté boutique, le badge suit `supportUnreadCount` (pas les non-lus client).
  const unread = threads.reduce((n, t) => n + t.supportUnreadCount, 0);

  // En conversation : titre = client, sous-titre = objet posé par lui + statut.
  const title = thread ? thread.client.nom : "Messages";
  const subtitle = thread
    ? `${getMerchantTopicDescriptor(thread.topic).label} · ${
        MERCHANT_SUPPORT_STATUS_LABEL[thread.status]
      }`
    : loading
      ? "Chargement…"
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

      {/* Le décalage clavier est géré par useMerchantKeyboardOffset dans la vue
          chat : pas de KeyboardAvoidingView ici, les deux se cumuleraient. */}
      <View style={styles.flex}>
        {thread ? (
          <View style={[styles.flex, { paddingTop: headerHeight + 6 }]}>
            <MerchantSupportChatView
              thread={thread}
              userId={userData?.uid}
              bottomInset={bottomInset}
              onThreadUpdated={upsert}
            />
          </View>
        ) : (
          /* Tant que la requête tourne, c'est le spinner qu'on voit — même si
             des fils sont déjà en mémoire d'une ouverture précédente : sinon on
             affiche des données périmées sans aucun signe que ça recharge.
             Rendu HORS ScrollView — son `flex: 1` ne s'étirerait pas dans un
             contentContainer. Pas de titre de section ici : il décalerait le
             spinner du centre. */
          loading ? (
            <View
              style={[
                styles.flex,
                {
                  marginTop: headerHeight + 6,
                  marginBottom: bottomInset + 24,
                },
              ]}
            >
              <MerchantSupportThreadsSkeleton />
            </View>
          ) : (
            <ScrollView
              style={[styles.flex, { marginTop: headerHeight + 6 }]}
              contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
            >
              <Text style={styles.section}>Discussions reçues</Text>
              {threads.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={30}
                    color={Theme.colors.gray[400]}
                  />
                  <Text style={styles.emptyText}>
                    Aucun message de vos clients pour le moment.
                  </Text>
                </View>
              ) : (
                threads.map((t) => (
                  <MerchantSupportThreadRow
                    key={t.id}
                    thread={t}
                    onPress={(target) => setScreen({ name: "chat", thread: target })}
                  />
                ))
              )}
            </ScrollView>
          )
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
});
