import React, { useState } from 'react';
import { StyleSheet, FlatList, SafeAreaView, ActivityIndicator, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { OrderCard } from '@/src/features/orders/components/OrderCard';
import { MenuItem } from '@/src/features/menu/components/MenuItem';
import { TransactionItem } from '@/src/features/merchant/components/TransactionItem';
import { AddMenuSheet } from '@/src/features/merchant/components/AddMenuSheet';

export default function BoutiqueScreen() {
  const { orders, menus, transactions, loading, stats, refresh } = useMerchant();
  const [activeTab, setActiveTab] = useState<'commande' | 'menu' | 'historique'>('commande');
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddMenu = async (newMenu: any) => {
    // Logic to call merchantService.addMenu will go here
    setShowAddMenu(false);
    refresh();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statsRow}>
        <StatCard label="Recettes" value={`${stats.completedOrders * 2000} F`} icon="wallet-outline" color={Theme.colors.success} />
        <StatCard label="Commandes" value={stats.totalOrders.toString()} icon="receipt-outline" color={Theme.colors.primary} />
      </View>
      
      <View style={styles.tabs}>
        <TabItem 
          label="Commandes" 
          active={activeTab === 'commande'} 
          onPress={() => setActiveTab('commande')} 
          count={stats.pendingOrders}
        />
        <TabItem 
          label="Menu" 
          active={activeTab === 'menu'} 
          onPress={() => setActiveTab('menu')} 
        />
        <TabItem 
          label="Finances" 
          active={activeTab === 'historique'} 
          onPress={() => setActiveTab('historique')} 
        />
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading && orders.length === 0) {
      return <ActivityIndicator style={{ marginTop: 50 }} color={Theme.colors.primary} />;
    }

    switch (activeTab) {
      case 'commande':
        return (
          <FlatList
            data={orders}
            renderItem={({ item }) => <OrderCard order={item} />}
            keyExtractor={(item) => item.idCmd}
            refreshing={loading}
            onRefresh={refresh}
            ListEmptyComponent={<EmptyState message="Aucune commande reçue" />}
          />
        );
      case 'menu':
        return (
          <FlatList
            data={menus}
            renderItem={({ item }) => <MenuItem menu={item} />}
            keyExtractor={(item, index) => index.toString()}
            ListEmptyComponent={<EmptyState message="Votre menu est vide" />}
          />
        );
      case 'historique':
        return (
          <FlatList
            data={transactions}
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<EmptyState message="Aucune transaction trouvée" />}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
      {activeTab === 'menu' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddMenu(true)}>
          <Ionicons name="add" size={30} color={Theme.colors.white} />
        </TouchableOpacity>
      )}
      <AddMenuSheet 
        visible={showAddMenu} 
        onClose={() => setShowAddMenu(false)} 
        onSave={handleAddMenu} 
      />
    </SafeAreaView>
  );
}

const StatCard = ({ label, value, icon, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  </View>
);

const TabItem = ({ label, active, onPress, count }: any) => (
  <TouchableOpacity 
    style={[styles.tab, active && styles.activeTab]} 
    onPress={onPress}
  >
    <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    {count > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.empty}>
    <Ionicons name="document-text-outline" size={50} color={Theme.colors.gray[300]} />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.light,
  },
  header: {
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[200],
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.lg,
    gap: Theme.spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Theme.colors.gray[500],
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.gray[100],
    borderRadius: Theme.borderRadius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.pill,
  },
  activeTab: {
    backgroundColor: Theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.gray[600],
  },
  activeTabLabel: {
    color: Theme.colors.primary,
  },
  badge: {
    backgroundColor: Theme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  badgeText: {
    color: Theme.colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: Theme.spacing.md,
    color: Theme.colors.gray[500],
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});
