"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileNameSheet } from "@/src/features/profile/components/ProfileNameSheet";
import { ProfileNameProvider } from "@/src/features/profile/hooks/useProfileNameSheet";
import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { useHomeCheckout } from "@/src/features/restaurants/hooks/useHomeCheckout";
import { CATEGORIES } from "@/src/features/restaurants/utils/homeListConfig";
import { SearchResultRow, SEARCH_ROW_HEIGHT } from "@/src/features/search/components/SearchResultRow";
import { SearchRow, useShopSearch } from "@/src/features/search/hooks/useShopSearch";
import { usePageBottomInset } from "@/src/hooks/usePageBottomInset";
import { showToast } from "@/src/services/globalToast";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Page de recherche (plats + boutiques), ouverte par l'icône loupe du header
 * du home. Liste séparée du home : FlatList à gabarit unique et hauteur fixe
 * (`getItemLayout`), pas de mesure au scroll. Filtres = catégories du home.
 */
// Hors (tabs) : le ProfileNameProvider des onglets n'est pas monté ici, sans
// lui `useRequireName` (via useHomeCheckout) plante à l'ouverture.
export default function SearchScreen() {
  return (
    <ProfileNameProvider>
      <SearchContent />
      <ProfileNameSheet />
    </ProfileNameProvider>
  );
}

function SearchContent() {
  useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = usePageBottomInset();
  // `?q=` : ouverte depuis une notification (nom du plat ou de la boutique).
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q ? String(q) : "");
  const [category, setCategory] = useState(0);
  const { results, loading, error, loadMore } = useShopSearch(query, category);
  const checkout = useHomeCheckout();

  // Le toast local du checkout home est remplacé par le toast global (R22).
  // Dans un effet : un setState pendant le rendu boucle / plante.
  const { toast, hideToast } = checkout;
  useEffect(() => {
    if (!toast) return;
    showToast(toast.message, toast.type);
    hideToast();
  }, [toast, hideToast]);

  const onPress = useCallback(
    (row: SearchRow) => checkout.onMenuClickStable(row.menu),
    [checkout.onMenuClickStable],
  );
  const renderItem = useCallback(
    ({ item }: { item: SearchRow }) => <SearchResultRow row={item} onPress={onPress} />,
    [onPress],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color={DS.ink} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={16} color={DS.faint} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("Rechercher un plat ou une boutique")}
            placeholderTextColor={DS.faint}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={DS.faint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((cat, idx) => {
            const active = category === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(idx)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as any} size={14} color={active ? DS.onInk : DS.muted} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: SEARCH_ROW_HEIGHT,
          offset: SEARCH_ROW_HEIGHT * index,
          index,
        })}
        initialNumToRender={12}
        windowSize={11}
        removeClippedSubviews
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ marginBottom: bottomInset }}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? (
              <ActivityIndicator color={DS.accent} />
            ) : (
              <Text style={styles.emptyText}>
                {error
                  ? t("Une erreur est survenue.")
                  : query.trim()
                    ? t("Aucun résultat pour \"{{a}}\"", { a: query.trim() })
                    : t("Aucun plat dans cette catégorie")}
              </Text>
            )}
          </View>
        }
      />

      <CheckoutSheet
        key={checkout.selectedMenu?.id || "checkout"}
        visible={checkout.checkoutVisible}
        onClose={checkout.closeCheckout}
        menu={checkout.selectedMenu}
        onReopen={checkout.reopenCheckout}
        onConfirm={checkout.handleConfirmOrder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.bg },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, color: DS.ink, paddingVertical: 0 },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: DS.surface,
  },
  chipActive: { backgroundColor: DS.ink },
  chipText: { fontSize: 12, fontWeight: "700", color: DS.muted },
  chipTextActive: { color: DS.onInk },
  empty: { paddingTop: 60, alignItems: "center", paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: DS.muted, textAlign: "center" },
});
