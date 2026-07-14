import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Theme } from "@/src/theme";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { driverService, StoreOption } from "../services/driverService";
import { Toast } from "@/src/components/Toast";

interface DriverApplyModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran : un utilisateur postule pour devenir livreur d'une ou
 * plusieurs boutiques. Champ vide → liste LOCALE (home) par défaut ; dès qu'il
 * tape → recherche SERVEUR (debounce) pour trouver au-delà du local.
 * Multi-sélection puis un seul envoi (une demande par boutique).
 * Rendu comme WalletManageModal (View absolue, header qui floute le settings).
 */
export const DriverApplyModal: React.FC<DriverApplyModalProps> = ({
  visible,
  onClose,
}) => {
  const { userData } = useAuth();
  const { fastFoods } = useFastFoods();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(70);

  // Hauteur navbar (≈58) + safe area bas, pour caler le bouton au-dessus.
  const TAB_BAR_HEIGHT = 58;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;
  // Espace réservé sous la liste = bouton (52) + marges + navbar, pour que le
  // dernier item ne passe jamais sous le bouton fixe.
  const listBottomPad = bottomInset + 52 + 32;
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [serverResults, setServerResults] = useState<StoreOption[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const q = query.trim();
  const isSearching = q.length > 0;

  // Liste locale (home) mappée en StoreOption pour un rendu uniforme.
  const localStores: StoreOption[] = useMemo(
    () => fastFoods.map((f) => ({ id: f.id, nom: f.nom || (f as any).name || "Boutique" })),
    [fastFoods],
  );

  // Recherche serveur debouncée dès qu'on tape (sinon on montre le local).
  useEffect(() => {
    if (!isSearching) {
      setServerResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await driverService.searchFastFoods(q);
        setServerResults(res);
      } catch {
        setServerResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, isSearching]);

  const data = isSearching ? serverResults : localStores;

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = async () => {
    if (selectedIds.length === 0 || !userData?.uid) return;
    setSubmitting(true);
    try {
      await driverService.apply(userData.uid, selectedIds);
      setToast({
        message: `Demande${selectedIds.length > 1 ? "s" : ""} envoyée${selectedIds.length > 1 ? "s" : ""} ✅`,
        type: "success",
      });
      setTimeout(onClose, 900);
    } catch {
      setToast({ message: "Échec de l'envoi de la demande", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Devenir livreur"
        subtitle={
          selectedIds.length > 0
            ? `${selectedIds.length} boutique${selectedIds.length > 1 ? "s" : ""} sélectionnée${selectedIds.length > 1 ? "s" : ""}`
            : "Choisissez vos boutiques"
        }
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <View style={[styles.body, { paddingTop: headerHeight + 12 }]}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Theme.colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une boutique…"
            placeholderTextColor={Theme.colors.gray[400]}
            value={query}
            onChangeText={setQuery}
          />
          {searching && <ActivityIndicator size="small" color={Theme.colors.primary} />}
        </View>

        {/* Hint : la liste par défaut (locale) n'est pas exhaustive. */}
        {!isSearching && (
          <Text style={styles.hint}>
            Tapez pour rechercher toutes les boutiques
          </Text>
        )}

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: listBottomPad }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => toggle(item.id)}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name="storefront-outline" size={20} color={Theme.colors.primary} />
                </View>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.nom}
                </Text>
                <Ionicons
                  name={selected ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={selected ? Theme.colors.primary : Theme.colors.gray[300]}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            searching ? null : (
              <Text style={styles.empty}>Aucune boutique trouvée</Text>
            )
          }
        />

        {/* Blur derrière le bouton : les items qui scrollent dessous sont floutés. */}
        <BlurView
          tint="light"
          intensity={40}
          style={[styles.footerBlur, { height: bottomInset + 76 }]}
          pointerEvents="none"
        />

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { bottom: bottomInset + 12 },
            (selectedIds.length === 0 || submitting) && { opacity: 0.5 },
          ]}
          disabled={selectedIds.length === 0 || submitting}
          onPress={submit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>
              Envoyer {selectedIds.length > 0 ? `(${selectedIds.length})` : "ma demande"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2000 },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  body: { flex: 1, paddingHorizontal: 16 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Theme.colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: Theme.colors.dark },
  hint: {
    fontSize: 12,
    color: Theme.colors.gray[400],
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
    backgroundColor: "#fff",
  },
  rowSelected: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + "08",
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: "600", color: Theme.colors.dark },
  empty: { textAlign: "center", color: Theme.colors.gray[400], marginTop: 40 },
  footerBlur: {
    position: "absolute",
    left: -16,
    right: -16,
    bottom: 0,
  },
  submitBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 52,
    borderRadius: 14,
    backgroundColor: Theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
