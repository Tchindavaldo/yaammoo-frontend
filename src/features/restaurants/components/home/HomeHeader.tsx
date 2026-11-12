"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { useRouter } from "expo-router";
import React from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useCurrentPlaceLabel } from "@/src/features/location/hooks/useCurrentPlaceLabel";
import { RestaurantHeader } from "../RestaurantHeader";
import { CATEGORIES } from "../../utils/homeListConfig";
import { t, useLanguage } from "@/src/i18n";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";

interface Props {
  unreadCount: number;
  searchOpen: boolean;
  onSearchToggle: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

/**
 * En-tête du home : `RestaurantHeader` avec le nom et la photo du compte et les
 * raccourcis de navigation. La recherche et la catégorie restent pilotées par
 * l'écran (le deep-link `?shop=` ouvre la recherche depuis l'écran).
 */
export const HomeHeader: React.FC<Props> = ({
  unreadCount,
  searchOpen,
  onSearchToggle,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
}) => {
  useLanguage();
  const { user, userData } = useAuth();
  const router = useRouter();
  const placeLabel = useCurrentPlaceLabel();
  const { isMerchant, setMerchantMode } = useMerchantMode();

  return (
    <RestaurantHeader
      userName={
        [userData?.infos?.prenom, userData?.infos?.nom].filter(Boolean).join(" ") ||
        user?.displayName ||
        t("Utilisateur")
      }
      userPhoto={(userData as any)?.photoUrl || (userData as any)?.photo || ""}
      location={placeLabel}
      onMerchantMode={isMerchant ? () => setMerchantMode(true) : undefined}
      unreadCount={unreadCount}
      onNotifPress={() => router.push("/(tabs)/notifications")}
      onProfilePress={() => router.push("/(tabs)/settings")}
      onCartPress={() => router.push("/(tabs)/cart")}
      onOrdersPress={() => router.push("/(tabs)/orders?section=pending")}
      searchVisible={searchOpen}
      onSearchToggle={onSearchToggle}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      categories={CATEGORIES}
      selectedCategory={selectedCategory}
      onCategorySelect={onCategorySelect}
    />
  );
};
