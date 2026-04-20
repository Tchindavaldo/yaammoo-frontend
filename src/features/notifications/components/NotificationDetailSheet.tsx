import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';
import { Notification } from '../context/NotificationContext';
import { getNotificationIcon } from '../utils/notificationRouting';

interface Props {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onAction: (notification: Notification) => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleString();
};

export const NotificationDetailSheet: React.FC<Props> = ({ visible, notification, onClose, onAction }) => {
  if (!notification) return null;
  const title = notification.title || notification.titre || 'Notification';
  const message = notification.body || notification.message || '';
  const iconName = getNotificationIcon(notification.type) as any;
  const hasOrderAction = !!(notification.orderId || ['order_new','order_status','order_cancel_by_user','order_cancel_by_merchant','order_rank_top','order_delivering'].includes(notification.type || ''));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconName} size={26} color={Theme.colors.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 16 }}>
          <Text style={styles.message}>{message}</Text>
        </ScrollView>

        <View style={styles.actions}>
          {hasOrderAction && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onAction(notification)}>
              <Text style={styles.primaryText}>Voir la commande</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Theme.colors.gray[300], marginBottom: 12,
  },
  header: { alignItems: 'center', marginBottom: 12 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Theme.colors.primary + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: 'bold', color: Theme.colors.dark, textAlign: 'center' },
  date: { fontSize: 12, color: Theme.colors.gray[500], marginTop: 4 },
  body: { marginTop: 8 },
  message: { fontSize: 14, lineHeight: 22, color: Theme.colors.gray[700] },
  actions: { marginTop: 12, gap: 10 },
  primaryBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: Theme.colors.primary,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Theme.colors.gray[100],
  },
  secondaryText: { color: Theme.colors.gray[700], fontSize: 14, fontWeight: '600' },
});
