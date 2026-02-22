import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Transaction } from '@/src/types';
import { TransactionItem } from '@/src/features/merchant/components/TransactionItem';

type FilterType = 'all' | 'credit' | 'debit' | 'transfer';

interface PorteFeuilleProps {
  transactions: Transaction[];
  loading: boolean;
  onRefresh: () => void;
}

export const PorteFeuillePanel: React.FC<PorteFeuilleProps> = ({
  transactions,
  loading,
  onRefresh,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const totalAmount = transactions
    .filter((t) => t.type === 'credit')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSpend = transactions
    .filter((t) => t.type === 'debit')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalAmount - totalSpend;

  const filteredTransactions = transactions.filter((t) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'credit') return t.type === 'credit';
    if (selectedFilter === 'debit') return t.type === 'debit';
    if (selectedFilter === 'transfer') return (t as any).payBy === 'transfer';
    return true;
  });

  const filters: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: 'Historique', icon: 'time-outline' },
    { key: 'credit', label: 'Dépôt', icon: 'cash-outline' },
    { key: 'debit', label: 'Retrait', icon: 'arrow-back-circle-outline' },
    { key: 'transfer', label: 'Transfert', icon: 'arrow-redo-circle-outline' },
  ];

  const handleComingSoon = (label: string) => {
    Alert.alert('Bientôt disponible', `La fonctionnalité "${label}" arrive prochainement.`);
  };

  return (
    <View style={styles.container}>
      {/* Header balance */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLbl}>Solde</Text>
            <Text style={styles.balanceVal}>{balance.toLocaleString('fr-FR')} F</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLbl}>Dépense</Text>
            <Text style={[styles.balanceVal, { color: Theme.colors.danger }]}>
              {totalSpend.toLocaleString('fr-FR')} F
            </Text>
          </View>
        </View>

        {/* Filtres segment */}
        <View style={styles.segmentRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.segment, selectedFilter === f.key && styles.segmentActive]}
              onPress={() => {
                if (f.key === 'credit' || f.key === 'transfer') {
                  handleComingSoon(f.label);
                } else {
                  setSelectedFilter(f.key);
                }
              }}
            >
              <Ionicons
                name={f.icon as any}
                size={16}
                color={selectedFilter === f.key ? Theme.colors.primary : Theme.colors.gray[400]}
              />
              <Text style={[
                styles.segmentLabel,
                selectedFilter === f.key && styles.segmentLabelActive,
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Liste des transactions */}
      <FlatList
        data={filteredTransactions}
        renderItem={({ item }) => <TransactionItem transaction={item} />}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={60} color={Theme.colors.gray[200]} />
            <Text style={styles.emptyTitle}>Pas de transaction</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => Alert.alert('Commandez!', 'Passez votre première commande depuis l\'accueil.')}
            >
              <Text style={styles.emptyBtnText}>Passer une commande</Text>
            </TouchableOpacity>
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
  balanceCard: {
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  balanceItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Theme.colors.gray[200],
  },
  balanceLbl: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    justifyContent: 'space-around',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentActive: {
    borderBottomColor: Theme.colors.primary,
  },
  segmentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.gray[400],
  },
  segmentLabelActive: {
    color: Theme.colors.primary,
  },
  listContent: {
    paddingVertical: Theme.spacing.sm,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.gray[500],
  },
  emptyBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  emptyBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
