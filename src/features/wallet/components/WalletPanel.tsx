import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { WalletTransactionItem } from '@/src/features/wallet/components/WalletTransactionItem';
import { useWallet } from '@/src/features/wallet/context/WalletContext';

type FilterType = 'all' | 'credit' | 'debit' | 'transfer';

// Barre de filtres masquée pour l'instant (Historique/Dépôt/Retrait/Transfert).
// Repasser à `true` pour la réafficher lors d'une future implémentation.
const SHOW_FILTERS = false;

interface WalletPanelProps {
  /** Remonte le solde courant au header parent. */
  onBalanceChange?: (balance: number) => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({ onBalanceChange }) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const { transactions, loading, refresh } = useWallet();

  const totalAmount = transactions
    .filter((t) => t.type === 'credit')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSpend = transactions
    .filter((t) => t.type === 'debit')
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalAmount - totalSpend;

  // Remonte le solde au header (sous-titre).
  useEffect(() => {
    onBalanceChange?.(balance);
  }, [balance, onBalanceChange]);

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
      {/* Solde + dépôt/retrait gérés par le header de page (TabHeader). */}

      {/* Filtres segment */}
      {SHOW_FILTERS && (
        <View style={styles.balanceCard}>
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
      )}

      {/* Liste des transactions */}
      <FlatList
        data={filteredTransactions}
        renderItem={({ item }) => <WalletTransactionItem transaction={item} />}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={refresh}
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
    backgroundColor: Theme.colors.white,
  },
  balanceCard: {
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
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
