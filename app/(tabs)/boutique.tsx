import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet as RNStyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { OrderManagePanel } from '@/src/features/merchant/components/OrderManagePanel';
import { MenuManagePanel } from '@/src/features/merchant/components/MenuManagePanel';
import { PorteFeuillePanel } from '@/src/features/merchant/components/PorteFeuillePanel';
import { NoBoutiquePanel } from '@/src/features/merchant/components/NoBoutiquePanel';
import { ActivityIndicator } from '@/src/components/CustomActivityIndicator';
import { Toast } from '@/src/components/Toast';

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
  const insets = useSafeAreaInsets();
  const { userData, loading: authLoading } = useAuth();
  const { orders, menus, transactions, loading: merchantLoading, stats, refresh, updateStatus, addMenu } = useMerchant();
  const [activeTab, setActiveTab] = useState<ActiveTab>('commande');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const ok = await updateStatus(id, status);
    if (status === 'delivering') {
      ok ? showToast('🚲 Livraison lancée !', 'success') : showToast('Erreur lors du lancement', 'error');
    } else if (status === 'processing') {
      ok ? showToast('✅ Commande acceptée', 'success') : showToast('Erreur lors de la mise à jour', 'error');
    } else if (status === 'finished') {
      ok ? showToast('✅ Commande terminée', 'success') : showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleAddMenu = async (newMenu: any) => {
    await addMenu(newMenu);
  };

  const loading = authLoading || merchantLoading;

  if (!userData?.fastFoodId && !loading) {
    return (
     <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
        <NoBoutiquePanel />
     </View>
    );
  }

  const renderHeader = () => (
    <BlurView intensity={80} tint="light" style={[styles.header, { paddingTop: insets.top }]}>
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
    </BlurView>
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

    const contentWrapperStyle = { flex: 1 };

    switch (activeTab) {
      case 'commande':
        return (
          <View style={contentWrapperStyle}>
            {renderHeader()}
            <OrderManagePanel
              orders={orders}
              loading={loading}
              onRefresh={refresh}
              onUpdateStatus={handleUpdateStatus}
            />
          </View>
        );
      case 'menu':
        return (
          <View style={contentWrapperStyle}>
            {renderHeader()}
            <MenuManagePanel
              menus={menus}
              onRefresh={refresh}
              onAddMenu={handleAddMenu}
              loading={loading}
            />
          </View>
        );
      case 'historique':
        return (
          <View style={contentWrapperStyle}>
            {renderHeader()}
            <PorteFeuillePanel
              transactions={transactions}
              loading={loading}
              onRefresh={refresh}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
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
    backgroundColor: 'rgba(236,73,19,1.00)',
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
    backgroundColor: 'rgba(236,73,19,1.00)',
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
