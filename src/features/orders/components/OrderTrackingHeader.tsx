import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';

interface OrderTrackingHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  availableDates: Date[];
  totalOrders: number;
  totalAmount: number;
  activeStatus: string;
  onStatusChange: (status: any) => void;
  counts: {
    pending: number;
    processing: number;
    finished: number;
    delivered: number;
  };
}

export const OrderTrackingHeader: React.FC<OrderTrackingHeaderProps> = ({
  selectedDate,
  onDateChange,
  availableDates,
  totalOrders,
  totalAmount,
  activeStatus,
  onStatusChange,
  counts
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getRelativeDateLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = (target.getTime() - today.getTime()) / (1000 * 3600 * 24);
    
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Demain";
    if (diff === -1) return "Hier";
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  return (
    <View style={styles.container}>
      {/* Date Selection Row */}
      <View style={styles.dateHeader}>
        <View style={styles.dateInfo}>
          <Text style={styles.relativeDate}>{getRelativeDateLabel(selectedDate)}</Text>
          <Text style={styles.fullDate}>{selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {availableDates.map((date, idx) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateChip, isSelected && styles.activeDateChip]}
                onPress={() => onDateChange(date)}
              >
                <Text style={[styles.dateDay, isSelected && styles.activeDateText]}>
                  {date.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase()}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.activeDateText]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalOrders}</Text>
          <Text style={styles.statLbl}>Commandes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Theme.colors.success }]}>{totalAmount} F</Text>
          <Text style={styles.statLbl}>Montant Total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
        <StatusChip 
          label="Attente" 
          icon="time-outline" 
          count={counts.pending} 
          active={activeStatus === 'pending'} 
          onPress={() => onStatusChange('pending')}
        />
        <StatusChip 
          label="En cours" 
          icon="restaurant-outline" 
          count={counts.processing} 
          active={activeStatus === 'active'} 
          onPress={() => onStatusChange('active')}
        />
        <StatusChip 
          label="Terminer" 
          icon="checkmark-done-outline" 
          count={counts.finished} 
          active={activeStatus === 'finished'} 
          onPress={() => onStatusChange('finished')}
        />
        <StatusChip 
          label="Livrées" 
          icon="checkmark-circle-outline" 
          count={counts.delivered} 
          active={activeStatus === 'delivered'} 
          onPress={() => onStatusChange('delivered')}
          color={Theme.colors.success}
        />
      </ScrollView>
    </View>
  );
};

const StatusChip = ({ label, icon, count, active, onPress, color = Theme.colors.primary }: any) => (
  <TouchableOpacity 
    style={[styles.statusChip, active && { borderColor: color, backgroundColor: color + '10' }]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={16} color={active ? color : Theme.colors.gray[400]} />
    <Text style={[styles.statusLabel, active && { color: color }]}>{label}</Text>
    <Text style={[styles.statusCount, active && { color: color }]}>({count})</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    paddingTop: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  dateInfo: {
    marginRight: Theme.spacing.md,
    minWidth: 100,
  },
  relativeDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    textTransform: 'capitalize',
  },
  fullDate: {
    fontSize: 12,
    color: Theme.colors.gray[500],
  },
  dateScroll: {
    gap: 10,
  },
  dateChip: {
    width: 45,
    height: 55,
    borderRadius: 12,
    backgroundColor: Theme.colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
  },
  activeDateChip: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateDay: {
    fontSize: 10,
    color: Theme.colors.gray[500],
    fontWeight: '600',
    marginBottom: 4,
  },
  dateNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  activeDateText: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.gray[50],
    marginHorizontal: Theme.spacing.md,
    borderRadius: 16,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Theme.colors.gray[200],
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  statLbl: {
    fontSize: 11,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  statusScroll: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    gap: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.gray[500],
  },
  statusCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Theme.colors.gray[400],
  },
});
