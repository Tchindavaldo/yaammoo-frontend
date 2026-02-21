import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';
import { Notification } from '../hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  return (
    <TouchableOpacity 
      style={[styles.container, !notification.isRead && styles.unread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: Theme.colors.primary + '15' }]}>
        <Ionicons name="notifications-outline" size={24} color={Theme.colors.primary} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, !notification.isRead && styles.bold]}>{notification.titre}</Text>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
        <Text style={styles.date}>{new Date(notification.createdAt).toLocaleDateString()}</Text>
      </View>

      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    alignItems: 'center',
  },
  unread: {
    backgroundColor: Theme.colors.primary + '05',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: Theme.colors.dark,
    marginBottom: 2,
  },
  bold: {
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
    color: Theme.colors.gray[600],
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: Theme.colors.gray[400],
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary,
    marginLeft: Theme.spacing.sm,
  },
});
