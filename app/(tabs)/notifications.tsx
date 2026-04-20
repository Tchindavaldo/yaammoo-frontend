import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import {
  useNotifications,
  Notification,
} from "@/src/features/notifications/hooks/useNotifications";
import { NotificationItem } from "@/src/features/notifications/components/NotificationItem";
import { NotificationDetailSheet } from "@/src/features/notifications/components/NotificationDetailSheet";
import { getNotificationRoute } from "@/src/features/notifications/utils/notificationRouting";
import { useRouter } from "expo-router";
import { Theme } from "@/src/theme";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";

const isReadFlag = (n: Notification) => {
  if (typeof n.isRead === 'boolean') return n.isRead;
  if (typeof n.isRead === 'string') {
    try { const p = JSON.parse(n.isRead); return Array.isArray(p) ? p.length > 0 : !!p; } catch { return false; }
  }
  return false;
};

export default function NotificationsScreen() {
  const { notifications, loading, refresh, markAsRead } = useNotifications();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
      <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={Theme.colors.primary}
            />
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </BlurView>

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
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.primary,
    marginTop: 2,
    fontWeight: "600",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + "10",
  },
  markAllText: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: "600",
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
