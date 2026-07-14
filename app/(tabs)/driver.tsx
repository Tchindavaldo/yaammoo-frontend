import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet as RNStyleSheet } from "react-native";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { useDriver } from "@/src/features/driver/hooks/useDriver";
import { Theme } from "@/src/theme";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { DatePill } from "@/src/components/molecules/DatePill";
import {
  DriverOrderPanel,
  DateOption,
} from "@/src/features/driver/components/DriverOrderPanel";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";

// Page LIVREUR = commandes déléguées uniquement (lancer / terminer / détails).
export default function DriverScreen() {
  const { userData, loading: authLoading } = useAuth();
  const { isSignedIn } = useAuthGate();
  const { orders, loading: driverLoading, refresh, updateStatus } = useDriver();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(70);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);

  const todayISO = new Date().toISOString().substring(0, 10);

  const selectedDateLabel = useMemo(() => {
    const iso = selectedDate ?? todayISO;
    if (iso === todayISO) return "Aujourd'hui";
    return new Date(iso).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, todayISO]);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => setToast({ message, type });

  const handleUpdateStatus = async (id: string, status: string) => {
    const ok = await updateStatus(id, status);
    if (status === "delivering") {
      ok
        ? showToast("🚲 Livraison lancée !", "success")
        : showToast("Erreur lors du lancement", "error");
    } else if (status === "finished") {
      ok
        ? showToast("✅ Livraison terminée", "success")
        : showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const loading = authLoading || driverLoading;

  if (!isSignedIn) {
    return (
      <GuestGate
        icon="bicycle-outline"
        title="Mes livraisons"
        subtitle="Connectez-vous pour accéder à vos commandes déléguées."
      >
        {null}
      </GuestGate>
    );
  }

  const renderContent = () => {
    if (loading && orders.length === 0) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de vos livraisons...</Text>
        </View>
      );
    }

    return (
      <DriverOrderPanel
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
  };

  return (
    <View style={styles.container}>
      <TabHeader
        title="Livraisons"
        subtitle={selectedDateLabel}
        right={
          <DatePill
            options={dateOptions}
            selected={selectedDate}
            todayISO={todayISO}
            onSelect={setSelectedDate}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1 }}>{renderContent()}</View>

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
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
});
