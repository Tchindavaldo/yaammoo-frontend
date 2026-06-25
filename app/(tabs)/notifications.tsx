import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { NotificationDetailSheet } from "@/src/features/notifications/components/NotificationDetailSheet";
import { NotificationItem } from "@/src/features/notifications/components/NotificationItem";
import {
  Notification,
  useNotifications,
} from "@/src/features/notifications/hooks/useNotifications";
import { getNotificationRoute } from "@/src/features/notifications/utils/notificationRouting";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const {
    notifications,
    loading,
    refresh,
    markAsRead,
    isRead: isReadFlag,
  } = useNotifications();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuthGate();
  const HEADER_HEIGHT = 70 + insets.top;

  // For testing: force loader to persist
  const [forceLoading, setForceLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const unreadCount = notifications.filter((n) => !isReadFlag(n)).length;

  const handleNotifPress = (notif: Notification) => {
    if (!isReadFlag(notif)) {
      markAsRead(notif.id, notif.idGroup);
    }
    setSelectedNotif(notif);
    setDetailVisible(true);
  };

  const handleNotifAction = (notif: Notification) => {
    setDetailVisible(false);
    const route = getNotificationRoute(notif);
    router.push(route as any);
  };

  const markAllAsRead = () => {
    notifications
      .filter((n) => !isReadFlag(n))
      .forEach((n) => markAsRead(n.id, n.idGroup));
  };

  // Invité : les notifications sont liées au compte → on demande la connexion.
  if (!isSignedIn) {
    return (
      <GuestGate
        icon="notifications-outline"
        title="Vos notifications"
        subtitle="Connectez-vous pour suivre l'état de vos commandes et recevoir des alertes."
      >
        {null}
      </GuestGate>
    );
  }

  if ((loading && notifications.length === 0) || forceLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            Chargement des notifications...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TabHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : undefined
        }
        right={
          unreadCount > 0 ? (
            <HeaderPill
              label="Tout marquer lu"
              icon="checkmark-done-outline"
              onPress={markAllAsRead}
            />
          ) : null
        }
      />

      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handleNotifPress} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: HEADER_HEIGHT, paddingBottom: tabBarHeight + 20 },
        ]}
        progressViewOffset={HEADER_HEIGHT}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centered}>
              <Ionicons
                name="notifications-off-outline"
                size={60}
                color={Theme.colors.gray[300]}
              />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySubtitle}>
                Vous serez notifié lors de nouvelles commandes et mises à jour
              </Text>
            </View>
          ) : null
        }
      />

      <NotificationDetailSheet
        visible={detailVisible}
        notification={selectedNotif}
        onClose={() => setDetailVisible(false)}
        onAction={handleNotifAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  listContent: {
    // paddingTop géré dynamiquement
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Theme.colors.gray[500],
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.gray[400],
    textAlign: "center",
    lineHeight: 20,
  },
});
