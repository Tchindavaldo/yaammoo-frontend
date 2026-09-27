import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useMerchant } from '@/src/features/merchant/hooks/useMerchant';
import { DS, Theme } from '@/src/theme';
import { TabHeader } from '@/src/components/molecules/TabHeader';
import { BlurScope, BlurTarget } from '@/src/components/BlurTarget';
import { HeaderPill } from '@/src/components/molecules/HeaderPill';
import { ShopOrderManagePanel } from '@/src/features/merchant/components/shop/ShopOrderManagePanel';
import { ShopPageFrame } from '@/src/features/merchant/components/shop/ShopPageFrame';
import { ActivityIndicator } from '@/src/components/CustomActivityIndicator';
import { Toast } from '@/src/components/Toast';

/**
 * Settings → Boutique → « Commandes » : page entière hors (tabs), sans navbar.
 * Copie de l'écran `(tabs)/boutique` (R16) avec une pastille « Retour », sur
 * son panel dédié `ShopOrderManagePanel` et dans `ShopPageFrame` (safe-area).
 */
export default function ShopOrdersScreen() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { orders, loading: merchantLoading, refresh, updateStatus, delegateOrder, ensureLoaded } = useMerchant();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(70);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<{ label: string; count: number; amount: number }>(
    { label: 'En Attente', count: 0, amount: 0 },
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

  const handleUpdateStatus = async (id: string, status: string) => {
    const ok = await updateStatus(id, status);
    const fail = { message: 'Erreur lors de la mise à jour', type: 'error' as const };
    if (status === 'delivering') {
      setToast(ok ? { message: 'Livraison lancée', type: 'success' } : fail);
    } else if (status === 'processing') {
      setToast(ok ? { message: '✅ Commande acceptée', type: 'success' } : fail);
    } else if (status === 'finished') {
      setToast(ok ? { message: '✅ Commande terminée', type: 'success' } : fail);
    }
  };

  const loading = authLoading || merchantLoading;

  return (
    <ShopPageFrame ownFooter>
    <View style={styles.container}>
      <BlurScope>
        <TabHeader
          title="Commandes"
          subtitle={`${selectedDateLabel} · ${statusInfo.count} ${statusInfo.label.toLowerCase()}`}
          right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={() => router.back()} />}
          onHeightChange={setHeaderHeight}
        />
        <BlurTarget style={{ flex: 1 }}>
          {loading && orders.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>Chargement de votre boutique...</Text>
            </View>
          ) : (
            <ShopOrderManagePanel
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
          )}
        </BlurTarget>
      </BlurScope>

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
    </ShopPageFrame>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Theme.colors.gray[500], fontSize: 14 },
});
