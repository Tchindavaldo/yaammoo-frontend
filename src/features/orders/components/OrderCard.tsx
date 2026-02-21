import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Commande } from '@/src/types';
import { Theme } from '../../../theme';

interface OrderCardProps {
  order: Commande;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.menuTitle}>{order.menu.titre}</Text>
        <Text style={styles.price}>{order.prixTotal} FCFA</Text>
      </View>
      
      <View style={styles.details}>
        <DetailItem icon="cube-outline" text={`${order.quantite} x`} />
        {order.boisson.prix > 0 && (
          <DetailItem icon="beer-outline" text={order.boisson.type} />
        )}
      </View>

      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.staut) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.staut) }]}>
            {order.staut}
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>Détails</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DetailItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon as any} size={14} color={Theme.colors.gray[500]} />
    <Text style={styles.detailText}>{text}</Text>
  </View>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pendingToBuy': return Theme.colors.warning;
    case 'active': return Theme.colors.info;
    case 'completed': return Theme.colors.success;
    default: return Theme.colors.gray[600];
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  details: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  detailText: {
    fontSize: 13,
    color: Theme.colors.gray[600],
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
    paddingTop: Theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: Theme.spacing.sm,
  },
  actionText: {
    color: Theme.colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
