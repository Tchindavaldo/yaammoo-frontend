import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet as RNStyleSheet
} from 'react-native';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useAuthGate } from '@/src/features/auth/context/AuthGateContext';
import { GuestGate } from '@/src/features/auth/components/GuestGate';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { Theme } from '@/src/theme';
import { TabHeader } from '@/src/components/molecules/TabHeader';
import { HeaderPill } from '@/src/components/molecules/HeaderPill';
import { OrderManagePanel } from '@/src/features/merchant/components/OrderManagePanel';
import { NoBoutiquePanel } from '@/src/features/merchant/components/NoBoutiquePanel';
import { ActivityIndicator } from '@/src/components/CustomActivityIndicator';
import { Toast } from '@/src/components/Toast';

// La page boutique = COMMANDES uniquement. Menu et Portefeuille sont gérés
// depuis Settings (modals). Les statuts se changent via les chips du panel.
export default function BoutiqueScreen() {
  const { userData, loading: authLoading } = useAuth();
  const { isSignedIn } = useAuthGate();
  const { orders, loading: merchantLoading, refresh, updateStatus, delegateOrder } = useMerchant();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(70);

  // État date remonté ici : le panel filtre, et le sous-titre du header indique
  // le jour affiché (le CHOIX de date passe par le bottom sheet de filtres).
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Onglet de statut actif + nb de commandes affichées, pour la pilule du header.
  const [statusInfo, setStatusInfo] = useState<{ label: string; count: number }>(
    { label: 'En Attente', count: 0 },
  );

  const todayISO = new Date().toISOString().substring(0, 10);

  const selectedDateLabel = useMemo(() => {
    const iso = selectedDate ?? todayISO;
    if (iso === todayISO) return "Aujourd'hui";
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

  const loading = authLoading || merchantLoading;

  // Invité : la boutique est liée au compte → on demande la connexion (comme
  // les autres tabs) au lieu d'afficher l'écran « Créer votre boutique ».
  if (!isSignedIn) {
    return (
      <GuestGate
        icon="storefront-outline"
        title="Votre boutique"
        subtitle="Connectez-vous pour créer et gérer votre boutique marchand."
      >
        {null}
      </GuestGate>
    );
  }

  if (!userData?.fastFoodId && !loading) {
    return (
     <View style={{ flex: 1, backgroundColor: 'white' }}>
        <NoBoutiquePanel />
     </View>
    );
  }

  const renderContent = () => {
    if (loading && orders.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
        </View>
      );
    }

    return (
      <OrderManagePanel
        orders={orders}
        loading={loading}
        onRefresh={refresh}
        onUpdateStatus={handleUpdateStatus}
        onDelegate={delegateOrder}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onStatusChange={setStatusInfo}
        topOffset={headerHeight}
      />
    );
  };

  return (
    <View style={styles.container}>
      <TabHeader
        title="Boutique"
        subtitle={selectedDateLabel}
        right={
          <HeaderPill
            label={`${statusInfo.count} cmd ${statusInfo.label.toLowerCase()}`}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      {/* Le contenu s'étend SOUS le header (blur). Le panel applique topOffset. */}
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

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
