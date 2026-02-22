import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Commande } from '@/src/types';
import { MerchantOrderCard } from './MerchantOrderCard';

type OrderStatus = 'pending' | 'proccess' | 'finish';

interface OrderManagePanelProps {
  orders: Commande[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
}

export const OrderManagePanel: React.FC<OrderManagePanelProps> = ({
  orders,
  loading,
  onRefresh,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Grouper les commandes par date (Priorité date de livraison comme Ionic)
  const getDateKey = (order: Commande) => {
    const deliveryDate = order.livraison?.date;
    const dateStr = deliveryDate || (order as any).createdAt || (order as any).date || '';
    
    if (!dateStr) return 'Aujourd\'hui';
    
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'Aujourd\'hui';
      
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) return 'Demain';

      return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return 'Aujourd\'hui';
    }
  };

  const statusMap: Record<OrderStatus, string[]> = {
    pending: ['pending', 'pendingToBuy'],
    proccess: ['processing', 'active', 'in_progress'],
    finish: ['completed', 'finished', 'done'],
  };

  const filteredOrders = orders.filter((o) =>
    statusMap[selectedStatus].includes(o.staut)
  );

  // Dates uniques disponibles pour ce statut
  const availableDates = [...new Set(filteredOrders.map(getDateKey))];
  const today = availableDates[0] || 'Aujourd\'hui';
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dateFilteredOrders = selectedDate
    ? filteredOrders.filter((o) => getDateKey(o) === selectedDate)
    : filteredOrders;

  const counts = {
    pending: orders.filter((o) => statusMap.pending.includes(o.staut)).length,
    proccess: orders.filter((o) => statusMap.proccess.includes(o.staut)).length,
    finish: orders.filter((o) => statusMap.finish.includes(o.staut)).length,
  };

  const totalAmount = dateFilteredOrders.reduce((acc, o) => acc + (o.prixTotal || 0), 0);

  const statusTabs: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'pending', label: 'En Attente', icon: 'time-outline' },
    { key: 'proccess', label: 'En cours', icon: 'restaurant-outline' },
    { key: 'finish', label: 'Terminées', icon: 'checkmark-done-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Résumé stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>
            {selectedDate || today}
          </Text>
          <Text style={styles.summaryDate}>{currentDate}</Text>
        </View>
        <View style={styles.statPair}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{dateFilteredOrders.length}</Text>
            <Text style={styles.miniStatLabel}>Commandes</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={[styles.miniStatNum, { color: Theme.colors.success }]}>{totalAmount}F</Text>
            <Text style={styles.miniStatLabel}>Montant</Text>
          </View>
        </View>
      </View>

      {/* Filtre par date */}
      {availableDates.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {[null, ...availableDates].map((date, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.dateChip,
                (date === null ? selectedDate === null : selectedDate === date) && styles.dateChipActive,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  (date === null ? selectedDate === null : selectedDate === date) && styles.dateChipTextActive,
                ]}
              >
                {date || 'Toutes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tabs statut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusScroll}
        contentContainerStyle={styles.statusScrollContent}
      >
        {statusTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.statusTab, selectedStatus === tab.key && styles.statusTabActive]}
            onPress={() => { setSelectedStatus(tab.key); setSelectedDate(null); }}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={selectedStatus === tab.key ? Theme.colors.primary : Theme.colors.gray[400]}
            />
            <Text style={[
              styles.statusTabLabel,
              selectedStatus === tab.key && styles.statusTabLabelActive,
            ]}>
              {tab.label}
            </Text>
            <View style={[
              styles.countBadge,
              selectedStatus === tab.key && styles.countBadgeActive,
            ]}>
              <Text style={[
                styles.countBadgeText,
                selectedStatus === tab.key && styles.countBadgeTextActive,
              ]}>
                ({counts[tab.key]})
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Liste commandes */}
      <FlatList
        data={dateFilteredOrders}
        renderItem={({ item }) => (
          <MerchantOrderCard
            order={item}
            onUpdateStatus={(status) => onUpdateStatus(item.idCmd?.toString() || '', status)}
          />
        )}
        keyExtractor={(item, i) => item.idCmd?.toString() || i.toString()}
        refreshing={loading}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={
                selectedStatus === 'pending'
                  ? 'time-outline'
                  : selectedStatus === 'proccess'
                  ? 'restaurant-outline'
                  : 'checkmark-done-outline'
              }
              size={50}
              color={Theme.colors.gray[300]}
            />
            <Text style={styles.emptyText}>
              {selectedStatus === 'pending'
                ? 'Aucune commande en attente'
                : selectedStatus === 'proccess'
                ? 'Aucune commande en cours'
                : 'Aucune commande terminée'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.light,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.white,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  summaryBox: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    textTransform: 'capitalize',
  },
  summaryDate: {
    fontSize: 11,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  statPair: {
    flexDirection: 'row',
    gap: 16,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  miniStatLabel: {
    fontSize: 10,
    color: Theme.colors.gray[500],
  },
  dateScroll: {
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[50],
  },
  dateScrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Theme.colors.gray[100],
    marginRight: 8,
  },
  dateChipActive: {
    backgroundColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dateChipText: {
    fontSize: 12,
    color: Theme.colors.gray[600],
    fontWeight: '600',
  },
  dateChipTextActive: {
    color: 'white',
  },
  statusScroll: {
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  statusScrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: 6,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    marginRight: 8,
  },
  statusTabActive: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '10',
  },
  statusTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.gray[500],
  },
  statusTabLabelActive: {
    color: Theme.colors.primary,
  },
  countBadge: {
    paddingHorizontal: 4,
  },
  countBadgeActive: {},
  countBadgeText: {
    fontSize: 11,
    color: Theme.colors.gray[400],
    fontWeight: 'bold',
  },
  countBadgeTextActive: {
    color: Theme.colors.primary,
  },
  listContent: {
    padding: Theme.spacing.md,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
  },
});
