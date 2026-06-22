import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet as RNStyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { TabHeader } from '@/src/components/molecules/TabHeader';
import { SectionSwitcher } from '@/src/components/molecules/SectionSwitcher';
import { HeaderPill } from '@/src/components/molecules/HeaderPill';
import { DatePill } from '@/src/components/molecules/DatePill';
import { OrderManagePanel, DateOption } from '@/src/features/merchant/components/OrderManagePanel';
import { MenuManagePanel } from '@/src/features/merchant/components/MenuManagePanel';
import { PorteFeuillePanel } from '@/src/features/merchant/components/PorteFeuillePanel';
import { NoBoutiquePanel } from '@/src/features/merchant/components/NoBoutiquePanel';
import { ActivityIndicator } from '@/src/components/CustomActivityIndicator';
import { Toast } from '@/src/components/Toast';

type ActiveTab = 'commande' | 'menu' | 'historique';

// Ordre de cyclage du bouton flottant + libellé/icône par section.
const SECTIONS: { key: ActiveTab; title: string; icon: string }[] = [
  { key: 'commande', title: 'Boutique', icon: 'receipt-outline' },
  { key: 'historique', title: 'Portefeuille', icon: 'wallet-outline' },
  { key: 'menu', title: 'Mes plats', icon: 'restaurant-outline' },
];

export default function BoutiqueScreen() {
  const insets = useSafeAreaInsets();
  const { userData, loading: authLoading } = useAuth();
  const { orders, menus, loading: merchantLoading, refresh, updateStatus, addMenu } = useMerchant();
  const [activeTab, setActiveTab] = useState<ActiveTab>('commande');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(70);

  // État date remonté ici (la section "commande" en a besoin, le header l'affiche).
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);

  // Infos remontées des panels pour alimenter le header (solde portefeuille, nb plats).
  const [walletBalance, setWalletBalance] = useState(0);
  // Déclencheurs d'action exposés par les panels (retrait / ajout de menu).
  const [openWithdraw, setOpenWithdraw] = useState<(() => void) | null>(null);
  const [openAddMenu, setOpenAddMenu] = useState<(() => void) | null>(null);

  const todayISO = new Date().toISOString().substring(0, 10);
  const activeSection = SECTIONS.find((s) => s.key === activeTab) ?? SECTIONS[0];

  // Libellé de la date sélectionnée affiché sous le titre (sous-titre du header).
  const selectedDateLabel = useMemo(() => {
    const iso = selectedDate ?? todayISO;
    if (iso === todayISO) return "Aujourd'hui";
    // Autres dates : jour en lettres + date complète + année (ex. "mardi 10 juin 2026").
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate, todayISO]);


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
     <View style={{ flex: 1, backgroundColor: 'white' }}>
        <NoBoutiquePanel />
     </View>
    );
  }

  // Sous-titre du header selon la section (date / solde / nb plats).
  const headerSubtitle = useMemo(() => {
    if (activeTab === 'commande') return selectedDateLabel;
    if (activeTab === 'historique')
      return `${walletBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
    if (activeTab === 'menu') {
      const available = menus.filter(
        (m: any) =>
          m.status === 'available' ||
          m.disponibilite === 'available' ||
          m.disponibilite === 'Disponible',
      ).length;
      return `${available} plat${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''}`;
    }
    return undefined;
  }, [activeTab, selectedDateLabel, walletBalance, menus.length]);

  // Élément de droite du header selon la section (pilule, même style que "Tout marquer lu").
  const renderHeaderRight = () => {
    if (activeTab === 'commande') {
      return (
        <DatePill
          options={dateOptions}
          selected={selectedDate}
          todayISO={todayISO}
          onSelect={setSelectedDate}
        />
      );
    }
    if (activeTab === 'historique') {
      return (
        <HeaderPill
          label="Faire un retrait"
          icon="arrow-up-circle-outline"
          onPress={() => openWithdraw?.()}
        />
      );
    }
    if (activeTab === 'menu') {
      return (
        <HeaderPill
          label="Ajouter un menu"
          icon="add-circle-outline"
          onPress={() => openAddMenu?.()}
        />
      );
    }
    return null;
  };

  const renderHeader = () => (
    <TabHeader
      title={activeSection.title}
      subtitle={headerSubtitle}
      right={renderHeaderRight()}
      onHeightChange={setHeaderHeight}
    />
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
        // Pilote blur-scroll-under : le panel gère lui-même l'offset du header
        // (barre stats+chips en blur, liste qui scrolle dessous).
        return (
          <OrderManagePanel
            orders={orders}
            loading={loading}
            onRefresh={refresh}
            onUpdateStatus={handleUpdateStatus}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onDatesChange={setDateOptions}
            topOffset={headerHeight}
          />
        );
      case 'menu':
        return (
          <MenuManagePanel
            menus={menus}
            onRefresh={refresh}
            onAddMenu={handleAddMenu}
            loading={loading}
            onRegisterAddMenu={(fn) => setOpenAddMenu(() => fn)}
            topOffset={headerHeight}
          />
        );
      case 'historique':
        return (
          <PorteFeuillePanel
            onRefresh={refresh}
            onBalanceChange={setWalletBalance}
            onRegisterWithdraw={(fn) => setOpenWithdraw(() => fn)}
            topOffset={headerHeight}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {/* Pas de paddingTop ici : le contenu s'étend SOUS le header pour que le
          BlurView du TabHeader floute la liste qui scrolle dessous. Le panel
          reçoit headerHeight (topOffset) et décale lui-même son contenu. */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      {/* Switcher flottant : déploie les autres sections vers le haut */}
      <SectionSwitcher
        sections={SECTIONS.map((s) => ({ key: s.key, icon: s.icon }))}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key as ActiveTab)}
        bottom={insets.bottom + 80}
      />

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
