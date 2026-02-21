import React from 'react';
import { StyleSheet, FlatList, SafeAreaView, ActivityIndicator, View, Text } from 'react-native';
import { useNotifications, Notification } from '@/src/features/notifications/hooks/useNotifications';
import { NotificationItem } from '@/src/features/notifications/components/NotificationItem';
import { Theme } from '@/src/theme';

export default function NotificationsScreen() {
  const { notifications, loading, refresh, markAsRead } = useNotifications();

  const handleNotifPress = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id, notif.idGroup);
    }
    // Deep link or detail modal logic here
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationItem 
            notification={item} 
            onPress={handleNotifPress} 
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune notification</Text>
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
    backgroundColor: Theme.colors.white,
  },
  header: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  centered: {
    flex: 1,
    padding: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
  }
});
