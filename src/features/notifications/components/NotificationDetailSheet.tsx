import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Theme } from '../../../theme';
import { Notification } from '../context/NotificationContext';

interface Props {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onAction: (notification: Notification) => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleDateString();
};

export const NotificationDetailSheet: React.FC<Props> = ({ visible, notification, onClose, onAction }) => {
  if (!notification) return null;
  const title = notification.title || notification.titre || 'Notification';
  const message = notification.body || notification.message || '';
  const hasOrderAction = !!(notification.orderId || ['order_new','order_status','order_cancel_by_user','order_cancel_by_merchant','order_rank_top','order_delivering'].includes(notification.type || ''));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.topRow}>
            <View style={styles.topLeft}>
              <Text style={styles.date}>{formatDate(notification.createdAt)}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            {hasOrderAction && (
              <Pressable style={styles.chip} onPress={() => onAction(notification)}>
                <Text style={styles.chipText}>Voir la commande</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.message}>{message}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Theme.colors.gray[200],
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  topLeft: { flex: 1 },
  date: {
    fontSize: 12,
    color: Theme.colors.gray[400],
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.dark,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.gray[700],
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Theme.colors.primary + '15',
    marginTop: 18,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
});
