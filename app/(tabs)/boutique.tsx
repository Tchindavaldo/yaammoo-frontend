import React, { useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { OrderManagePanel } from '@/src/features/merchant/components/OrderManagePanel';
import { MenuManagePanel } from '@/src/features/merchant/components/MenuManagePanel';
import { PorteFeuillePanel } from '@/src/features/merchant/components/PorteFeuillePanel';
import { NoBoutiquePanel } from '@/src/features/merchant/components/NoBoutiquePanel';

const TabItem = ({ label, active, onPress, count, icon }: any) => (
  <View style={styles.colSegment}>
    <TouchableOpacity
      style={[styles.chip, active && styles.activeChip]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={12}
        color={active ? 'white' : 'red'}
      />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  </View>
);

type ActiveTab = 'commande' | 'menu' | 'historique';

export default function BoutiqueScreen() {
  const { userData, loading: authLoading } = useAuth();
  const { orders, menus, transactions, loading: merchantLoading, stats, refresh, updateStatus, addMenu } = useMerchant();
  const [activeTab, setActiveTab] = useState<ActiveTab>('commande');

  const handleAddMenu = async (newMenu: any) => {
    await addMenu(newMenu);
  };

  const loading = authLoading || merchantLoading;

  // If no fast food associated with account, show creation UI
  if (!userData?.fastFoodId && !loading) {
    return (
     <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <NoBoutiquePanel />
     </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.rowSegment}>
        <TabItem
          label="Mon porte feuille"
          icon="wallet-outline"
          active={activeTab === 'historique'}
          onPress={() => setActiveTab('historique')}
          count={0}
        />
        <TabItem
          label="Commande"
          icon="receipt-outline"
          active={activeTab === 'commande'}
          onPress={() => setActiveTab('commande')}
          count={stats.pendingOrders}
        />
        <TabItem
          label="Menu"
          icon="restaurant-outline"
          active={activeTab === 'menu'}
          onPress={() => setActiveTab('menu')}
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
    backgroundColor: 'white',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 45 : (Platform.OS === 'android' ? 30 : 10),
    backgroundColor: 'white',
    paddingBottom: 10,
  },
  rowSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  colSegment: {
    paddingRight: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'relative',
    height: 32,
    gap: 4,
  },
  activeChip: {
    backgroundColor: 'darkred',
  },
  label: {
    fontSize: 9,
    color: 'black',
    fontWeight: 'bold',
  },
  activeLabel: {
    color: 'white',
    fontWeight: 'normal',
  },
  badge: {
    backgroundColor: 'darkred',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 4,
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
