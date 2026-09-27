import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { DS, Theme } from '../../../theme';
import { Notification } from '../context/NotificationContext';
import { useNotifications } from '../hooks/useNotifications';
import { getNotificationIcon } from '../utils/notificationRouting';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
}

const AVATAR = 44;

/** Date façon messagerie : heure aujourd'hui, jour de la semaine sur 7 jours, sinon jj/mm/aa. */
const formatWhen = (value: string | number | Date): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hier';
  if (days < 7) {
    const w = d.toLocaleDateString('fr-FR', { weekday: 'long' });
    return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Ligne de notification façon liste de discussions : avatar rond, titre + date
 * sur la première ligne, message + point non lu sur la seconde, séparateur
 * aligné sur le texte.
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress }) => {
  const { isRead } = useNotifications();
  const read = isRead(notification);
  const title = notification.title || notification.titre || 'Notification';
  const message = notification.body || notification.message || '';
  const iconName = getNotificationIcon(notification.type) as any;

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(notification)} activeOpacity={0.6}>
      {/* Annonce de boutique : sa photo sert d'avatar ; sinon l'icône du type. */}
      {notification.imageUrl ? (
        <Image source={{ uri: notification.imageUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.iconAvatar]}>
          <Ionicons name={iconName} size={19} color={read ? DS.ink : DS.accent} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={[styles.date, !read && styles.dateUnread]}>
            {formatWhen(notification.createdAt)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.message} numberOfLines={1}>{message}</Text>
          {!read && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Theme.spacing.md,
    backgroundColor: DS.bg,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: DS.surface,
  },
  iconAvatar: { alignItems: 'center', justifyContent: 'center' },
  // Séparateur porté par le bloc texte : il démarre après l'avatar.
  body: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 11,
    paddingRight: Theme.spacing.md,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 15.5, fontWeight: '500', color: DS.ink },
  date: { fontSize: 12.5, color: DS.faint },
  dateUnread: { color: DS.accent },
  message: { flex: 1, fontSize: 14, color: DS.muted },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: DS.accent,
  },
});
