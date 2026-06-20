import { WalletDayStatItem } from "@/src/features/merchant/components/WalletDayStatItem";
import { WithdrawOverlay } from "@/src/features/merchant/components/WithdrawOverlay";
import { useWithdraw, DEBUG_COMPLETED } from "@/src/features/merchant/hooks/useWithdraw";
import { useMerchantWallet } from "@/src/features/merchant/context/MerchantWalletContext";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type FilterType = "all" | "credit" | "debit" | "transfer";

// Barre de filtres masquée pour l'instant (Historique/Dépôt/Retrait/Transfert).
// Repasser à `true` pour la réafficher lors d'une future implémentation.
const SHOW_FILTERS = false;

interface PorteFeuilleProps {
  /** Rafraîchit le contexte marchand parent (ex. après un retrait). Optionnel. */
  onRefresh?: () => void;
}

export const PorteFeuillePanel: React.FC<PorteFeuilleProps> = ({ onRefresh }) => {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

  // Stats portefeuille : source de vérité globale (patchée par les events socket).
  const { stats, loading, refresh: refreshStats } = useMerchantWallet();

  const refreshAll = useCallback(() => {
    refreshStats();
    onRefresh?.();
  }, [refreshStats, onRefresh]);

  // Retrait : POST /wallet/withdraw + verdict socket (géré dans le hook).
  const {
    withdrawPhone,
    setWithdrawPhone,
    withdrawAmount,
    setWithdrawAmount,
    withdrawNetwork,
    setWithdrawNetwork,
    withdrawState,
    setWithdrawState,
    withdrawError,
    setWithdrawError,
    resetWithdraw,
    handleWithdrawConfirm,
  } = useWithdraw();

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: e.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Après "Retrait effectué" (completed, 5s) : fermer + refresh des stats.
  // 🐞 En mode DEBUG_COMPLETED, on ne ferme pas (l'overlay reste visible).
  useEffect(() => {
    if (DEBUG_COMPLETED) return;
    if (withdrawState === "completed") {
      const timer = setTimeout(() => {
        resetWithdraw();
        refreshAll();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [withdrawState, resetWithdraw, refreshAll]);

  // Toast d'erreur retrait.
  useEffect(() => {
    if (withdrawError) {
      Alert.alert("Retrait", withdrawError);
      setWithdrawError(null);
    }
  }, [withdrawError, setWithdrawError]);

  // Solde global réel (fourni par le backend).
  const balance = stats?.balance ?? 0;

  // Liste = une ligne par jour (series), déjà triée par le backend.
  const series = stats?.series ?? [];

  const filters: { key: FilterType; label: string; icon: string }[] = [
    { key: "all", label: "Historique", icon: "time-outline" },
    { key: "credit", label: "Dépôt", icon: "cash-outline" },
    { key: "debit", label: "Retrait", icon: "arrow-back-circle-outline" },
    { key: "transfer", label: "Transfert", icon: "arrow-redo-circle-outline" },
  ];

  const handleComingSoon = (label: string) => {
    Alert.alert(
      "Bientôt disponible",
      `La fonctionnalité "${label}" arrive prochainement.`,
    );
  };

  return (
    <View style={styles.container}>
      {/* Header balance */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLbl}>Solde</Text>
            <Text style={styles.balanceVal}>
              {balance.toLocaleString("fr-FR")} F
            </Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.balanceItem}
            activeOpacity={0.7}
            onPress={() => setWithdrawState("amount_input")}
          >
            <Text style={styles.balanceLbl}>Retrait</Text>
            <View style={styles.withdrawRow}>
              <Text
                style={[styles.balanceVal, { color: Theme.colors.primary }]}
              >
                Retirer
              </Text>
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={Theme.colors.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Filtres segment */}
        {SHOW_FILTERS && (
          <View style={styles.segmentRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.segment,
                  selectedFilter === f.key && styles.segmentActive,
                ]}
                onPress={() => {
                  if (f.key === "credit" || f.key === "transfer") {
                    handleComingSoon(f.label);
                  } else {
                    setSelectedFilter(f.key);
                  }
                }}
              >
                <Ionicons
                  name={f.icon as any}
                  size={16}
                  color={
                    selectedFilter === f.key
                      ? Theme.colors.primary
                      : Theme.colors.gray[400]
                  }
                />
                <Text
                  style={[
                    styles.segmentLabel,
                    selectedFilter === f.key && styles.segmentLabelActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Chiffre d'affaires par jour (une ligne par jour) */}
      <FlatList
        data={series}
        renderItem={({ item }) => <WalletDayStatItem stat={item} />}
        keyExtractor={(item) => item.period}
        refreshing={loading}
        onRefresh={refreshAll}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={60}
              color={Theme.colors.gray[200]}
            />
            <Text style={styles.emptyTitle}>Pas d&apos;activité</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() =>
                Alert.alert(
                  "Commandez!",
                  "Passez votre première commande depuis l'accueil.",
                )
              }
            >
              <Text style={styles.emptyBtnText}>Passer une commande</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Overlay de RETRAIT (copie adaptée du paiement panier) */}
      {withdrawState !== "idle" && (
        <WithdrawOverlay
          phone={withdrawPhone}
          onPhoneChange={setWithdrawPhone}
          amount={withdrawAmount}
          onAmountChange={setWithdrawAmount}
          onConfirm={handleWithdrawConfirm}
          withdrawState={withdrawState}
          setWithdrawState={setWithdrawState}
          network={withdrawNetwork}
          onNetworkChange={setWithdrawNetwork}
          onClose={resetWithdraw}
          onError={(msg) => Alert.alert("Retrait", msg)}
          isKeyboardVisible={isKeyboardVisible}
          bottom={Animated.add(keyboardHeight, isKeyboardVisible ? 5 : 92)}
        />
      )}
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
    flexDirection: "row",
    alignItems: "center",
    padding: Theme.spacing.lg,
    gap: Theme.spacing.lg,
  },
  balanceItem: {
    flex: 1,
  },
  withdrawRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceVal: {
    fontSize: 22,
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    justifyContent: "space-around",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Theme.spacing.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentActive: {
    borderBottomColor: Theme.colors.primary,
  },
  segmentLabel: {
    fontSize: 10,
    fontWeight: "600",
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
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
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
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
