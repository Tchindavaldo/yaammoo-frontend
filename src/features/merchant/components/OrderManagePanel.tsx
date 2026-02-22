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

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const getRelativeDateLabel = (dateKey: string | null) => {
    if (!dateKey || dateKey === 'Aujourd\'hui') return "aujourd'hui";
    return dateKey;
  };

  return (
    <View style={styles.container}>
      {/* Date Header Row */}
      <View style={styles.dateHeader}>
        <View style={styles.dateInfo}>
          <Text style={styles.relativeDate}>{getRelativeDateLabel(selectedDate)}</Text>
          <Text style={styles.fullDate}>{currentDate}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {availableDates.map((date, idx) => {
            const isSelected = (selectedDate === null && date === today) || selectedDate === date;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                  {date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Row (Component 1 Style) */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
             <Text style={styles.statVal}>{dateFilteredOrders.length}</Text>
             <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>cmd</Text>
          </View>
          <Text style={styles.statLbl}>Commandes effectue</Text>
        </View>
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.statVal}>{totalAmount}</Text>
            <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>fcfa</Text>
          </View>
          <Text style={styles.statLbl}>Montant Total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <View style={styles.statusScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContent}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statusTab, selectedStatus === tab.key && styles.statusTabActive]}
              onPress={() => { setSelectedStatus(tab.key); setSelectedDate(null); }}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={selectedStatus === tab.key ? 'white' : 'red'}
              />
              <Text style={[
                styles.statusTabLabel,
                { color: selectedStatus === tab.key ? 'white' : 'red' },
              ]}>
                {tab.label}
              </Text>
              <Text style={[
                styles.statusTabLabel,
                { fontWeight: '900', marginLeft: 4, color: selectedStatus === tab.key ? 'white' : 'red' },
              ]}>
                ({counts[tab.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
    backgroundColor: 'white',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dateInfo: {
    marginRight: 10,
    minWidth: 100,
  },
  relativeDate: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#333',
    textTransform: 'capitalize',
  },
  fullDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dateScroll: {
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#fff5f5',
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: 'darkred',
  },
  dateChipText: {
    fontSize: 12,
    color: 'black',
    fontWeight: 'bold',
  },
  dateChipTextActive: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  statBox: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statVal: {
    fontSize: 31,
    fontWeight: '900',
    color: 'black',
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.44)',
    fontWeight: 'bold',
    marginTop: 2,
  },
  statusScrollContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusScrollContent: {
    paddingHorizontal: 15,
    gap: 8,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    marginRight: 8,
    height: 32,
  },
  statusTabActive: {
    backgroundColor: 'darkred',
  },
  statusTabLabel: {
    fontSize: 10,
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusTabLabelActive: {
    color: 'white',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
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
