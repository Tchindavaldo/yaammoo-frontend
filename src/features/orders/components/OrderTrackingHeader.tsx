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
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const getRelativeDateLabel = (date: Date) => {
    if (isToday(date)) return "aujourd'hui";
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  };

  return (
    <View style={styles.container}>
      {/* Date Selection Row */}
      <View style={styles.dateHeader}>
        <View style={styles.dateInfo}>
          <Text style={styles.relativeDate}>{getRelativeDateLabel(selectedDate)}</Text>
          <Text style={styles.fullDate}>{selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {availableDates.map((date, idx) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1, 3); // "Dim"
            
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dateChip, isSelected && styles.activeDateChip]}
                onPress={() => onDateChange(date)}
              >
                <Text style={[styles.dateDay, isSelected && styles.activeDateText]}>
                  {formattedDay}
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
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
             <Text style={styles.statVal}>{totalOrders}</Text>
             <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>cmd</Text>
          </View>
          <Text style={styles.statLbl}>Commandes effectue</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.statVal}>{totalAmount}</Text>
            <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>fcfa</Text>
          </View>
          <Text style={styles.statLbl}>Montant Total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
        <StatusChip 
          label="Cmds en Attente" 
          icon="time-outline" 
          count={counts.pending} 
          active={activeStatus === 'pending'} 
          onPress={() => onStatusChange('pending')}
        />
        <StatusChip 
          label="Cmds en cours" 
          icon="restaurant-outline" 
          count={counts.processing} 
          active={activeStatus === 'active'} 
          onPress={() => onStatusChange('active')}
        />
        <StatusChip 
          label="Cmds en Terminer" 
          icon="checkmark-done-outline" 
          count={counts.finished} 
          active={activeStatus === 'finished'} 
          onPress={() => onStatusChange('finished')}
        />
        <StatusChip 
          label="Cmds Livrées" 
          icon="checkmark-circle-outline" 
          count={counts.delivered} 
          active={activeStatus === 'delivered'} 
          onPress={() => onStatusChange('delivered')}
          activeColor="#2dd36f"
          inactiveBg="#e8f5e9"
          inactiveIconColor="#2dd36f"
        />
      </ScrollView>
    </View>
  );
};

const StatusChip = ({ 
  label, icon, count, active, onPress, 
  activeColor = 'darkred', 
  inactiveBg = '#fff5f5',
  inactiveIconColor = 'red' 
}: any) => (
  <TouchableOpacity 
    style={[styles.statusChip, { backgroundColor: active ? activeColor : inactiveBg }]}
    onPress={onPress}
  >
    <Ionicons name={icon as any} size={14} color={active ? 'white' : inactiveIconColor} />
    <Text style={[styles.statusLabel, { color: active ? 'white' : inactiveIconColor }]}>{label}</Text>
    <Text style={[styles.statusCount, { color: active ? 'white' : inactiveIconColor }]}>({count})</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  dateInfo: {
    marginRight: 10,
    minWidth: 80,
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
    gap: 5,
    paddingRight: 15,
  },
  dateChip: {
    width: 60,
    height: 30, // Small screen height
    borderRadius: 10,
    backgroundColor: '#fff5f5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  activeDateChip: {
    backgroundColor: 'darkred',
    shadowColor: 'darkred',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  dateDay: {
    fontSize: 10,
    color: '#8b0000bf',
    marginRight: 2,
  },
  dateNum: {
    fontSize: 10,
    fontWeight: '300',
    color: 'darkred',
  },
  activeDateText: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 5,
    marginTop: -5,
  },
  statBox: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statDivider: {
    width: 0,
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
    marginTop: -2,
  },
  statusScroll: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    gap: 6,
    height: 28,
  },
  statusLabel: {
    fontSize: 10,
    color: 'black',
    fontWeight: 'bold',
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '900',
    color: 'black',
    marginLeft: 2,
  },
});
