import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNotifications,
  Notification,
} from "@/src/features/notifications/hooks/useNotifications";
import { NotificationItem } from "@/src/features/notifications/components/NotificationItem";
import { Theme } from "@/src/theme";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";

export default function NotificationsScreen() {
  const { notifications, loading, refresh, markAsRead } = useNotifications();
  const tabBarHeight = useTabBarHeight();

  // For testing: force loader to persist
  const [forceLoading, setForceLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotifPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id, notif.idGroup);
    }
  };

  const markAllAsRead = () => {
    notifications
      .filter((n) => !n.isRead)
      .forEach((n) => markAsRead(n.id, n.idGroup));
  };

  if ((loading && notifications.length === 0) || forceLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            Chargement des notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
      </View>

      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handleNotifPress} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 20 },
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
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
    // paddingBottom géré dynamiquement avec useTabBarHeight
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
