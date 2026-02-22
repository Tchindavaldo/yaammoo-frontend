import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Commande } from '@/src/types';
import { Theme } from '@/src/theme';
import moment from 'moment';

interface MerchantOrderCardProps {
  order: Commande;
  onUpdateStatus: (status: 'active' | 'completed' | 'cancelled') => void;
}

export const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({ order, onUpdateStatus }) => {
  const isPending = order.staut === 'pending';
  const isActive = order.staut === 'active';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>#ORD-{order.idCmd.toString().toUpperCase()}</Text>
          <Text style={styles.date}>{moment().format('HH:mm, DD MMM')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.staut) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.staut) }]}>
            {order.staut.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.itemRow}>
          <Text style={styles.quantity}>{order.quantite}x</Text>
          <Text style={styles.menuTitle}>{order.menu.titre}</Text>
          <Text style={styles.price}>{order.prixTotal} F</Text>
        </View>
        {order.boisson.prix > 0 && (
          <View style={styles.extraRow}>
            <Ionicons name="beer-outline" size={14} color={Theme.colors.gray[500]} />
            <Text style={styles.extraText}>{order.boisson.type}</Text>
          </View>
        )}
      </View>

      {(isPending || isActive) && (
        <View style={styles.actions}>
          {isPending && (
            <>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.cancelBtn]} 
                onPress={() => onUpdateStatus('cancelled')}
              >
                <Text style={styles.cancelText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptBtn]} 
                onPress={() => onUpdateStatus('active')}
              >
                <Text style={styles.acceptText}>Accepter</Text>
              </TouchableOpacity>
            </>
          )}
          {isActive && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.completeBtn]} 
              onPress={() => onUpdateStatus('completed')}
            >
              <Text style={styles.completeText}>Terminer la commande</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return Theme.colors.warning;
    case 'active': 
    case 'processing': return Theme.colors.info;
    case 'completed':
    case 'finished': 
    case 'delivered': return Theme.colors.success;
    case 'cancelled': return Theme.colors.danger;
    default: return Theme.colors.gray[600];
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[50],
    paddingBottom: Theme.spacing.sm,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  date: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: Theme.spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginRight: 8,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.dark,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 30,
  },
  extraText: {
    fontSize: 13,
    color: Theme.colors.gray[600],
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Theme.colors.success,
  },
  acceptText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: Theme.colors.gray[100],
  },
  cancelText: {
    color: Theme.colors.danger,
    fontWeight: '600',
  },
  completeBtn: {
    backgroundColor: Theme.colors.primary,
  },
  completeText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
