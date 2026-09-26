import { useRouter } from "expo-router";
import React from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { RestaurantHeader } from "../RestaurantHeader";
import { CATEGORIES } from "../../utils/homeListConfig";

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
  const { user, userData } = useAuth();
  const router = useRouter();

  return (
    <RestaurantHeader
      userName={
        [userData?.infos?.prenom, userData?.infos?.nom].filter(Boolean).join(" ") ||
        user?.displayName ||
        "Utilisateur"
      }
      userPhoto={(userData as any)?.photoUrl || (userData as any)?.photo || ""}
      location="Banganté, Cameroun"
      unreadCount={unreadCount}
      onNotifPress={() => router.push("/(tabs)/notifications")}
      onProfilePress={() => router.push("/(tabs)/settings")}
      onCartPress={() => router.push("/(tabs)/cart")}
      onOrdersPress={() => router.push("/(tabs)/settings?section=pending")}
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
