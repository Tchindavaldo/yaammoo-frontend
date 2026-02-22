import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { OrderManagePanel } from '@/src/features/merchant/components/OrderManagePanel';
import { MenuManagePanel } from '@/src/features/merchant/components/MenuManagePanel';
import { PorteFeuillePanel } from '@/src/features/merchant/components/PorteFeuillePanel';

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

const TabItem = ({ label, active, onPress, count, icon }: any) => (
  <TouchableOpacity
    style={[styles.tab, active && styles.activeTab]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={16}
      color={active ? Theme.colors.primary : Theme.colors.gray[400]}
    />
    <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{label}</Text>
    {count > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

type ActiveTab = 'commande' | 'menu' | 'historique';

export default function BoutiqueScreen() {
  const { orders, menus, transactions, loading, stats, refresh, updateStatus, addMenu } = useMerchant();
  const [activeTab, setActiveTab] = useState<ActiveTab>('commande');

  const handleAddMenu = async (newMenu: any) => {
    await addMenu(newMenu);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Stats globales */}
      <View style={styles.statsRow}>
        <StatCard
          label="Recettes"
          value={`${(stats.totalRevenue || 0).toLocaleString('fr-FR')} F`}
          icon="wallet-outline"
          color={Theme.colors.success}
        />
        <StatCard
          label="Commandes"
          value={stats.totalOrders.toString()}
          icon="receipt-outline"
          color={Theme.colors.primary}
        />
        <StatCard
          label="En attente"
          value={stats.pendingOrders.toString()}
          icon="time-outline"
          color={Theme.colors.warning || '#f59e0b'}
        />
      </View>

      {/* Onglets de navigation */}
      <View style={styles.tabs}>
        <TabItem
          label="Commandes"
          icon="cart-outline"
          active={activeTab === 'commande'}
          onPress={() => setActiveTab('commande')}
          count={stats.pendingOrders}
        />
        <TabItem
          label="Menu"
          icon="fast-food-outline"
          active={activeTab === 'menu'}
          onPress={() => setActiveTab('menu')}
          count={0}
        />
        <TabItem
          label="Finances"
          icon="bar-chart-outline"
          active={activeTab === 'historique'}
          onPress={() => setActiveTab('historique')}
          count={0}
        />
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading && orders.length === 0 && menus.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'commande':
        return (
          <OrderManagePanel
            orders={orders}
            loading={loading}
            onRefresh={refresh}
            onUpdateStatus={(id, status) => updateStatus(id, status)}
          />
        );
      case 'menu':
        return (
          <MenuManagePanel
            menus={menus}
            onRefresh={refresh}
            onAddMenu={handleAddMenu}
            loading={loading}
          />
        );
      case 'historique':
        return (
          <PorteFeuillePanel
            transactions={transactions}
            loading={loading}
            onRefresh={refresh}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.light,
  },
  header: {
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[200],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Theme.colors.gray[50],
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs || 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: Theme.colors.gray[600],
    marginBottom: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Theme.colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    fontWeight: '600',
  },
  activeTabLabel: {
    color: Theme.colors.primary,
  },
  badge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
});
