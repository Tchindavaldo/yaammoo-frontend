"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { useRouter } from "expo-router";
import React from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useCurrentPlaceLabel } from "@/src/features/location/hooks/useCurrentPlaceLabel";
import { RestaurantHeader } from "../RestaurantHeader";
import { CATEGORIES } from "../../utils/homeListConfig";
import { t, useLanguage } from "@/src/i18n";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { useFastFoodContext } from "../../context/FastFoodContext";
import { HomeCitySheet } from "./HomeCitySheet";

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
  const { label: placeLabel, city: placeCity } = useCurrentPlaceLabel("");
  const { isMerchant, setMerchantMode } = useMerchantMode();
  const { homeCity } = useFastFoodContext();
  const [citySheet, setCitySheet] = React.useState(false);
  // Ville choisie a la main : son nom (ou « Toutes les villes »). Sinon
  // (« Ma localisation ») : le lieu PRECIS du client (quartier, arrondissement).
  // Avant le lieu precis : la ville deja connue, sinon rien (plus de
  // « Banganté » affiche puis remplace au demarrage).
  const location = homeCity.isMerchant
    ? homeCity.city || placeLabel
    : homeCity.manual ? homeCity.city || t("Toutes les villes") : placeLabel || homeCity.city || "";

  return (
    <>
    <RestaurantHeader
      userName={
        [userData?.infos?.prenom, userData?.infos?.nom].filter(Boolean).join(" ") ||
        user?.displayName ||
        t("Utilisateur")
      }
      userPhoto={(userData as any)?.photoUrl || (userData as any)?.photo || ""}
      location={location}
      onLocationPress={isMerchant ? undefined : () => setCitySheet(true)}
      onMerchantMode={isMerchant ? () => setMerchantMode(true) : undefined}
      unreadCount={unreadCount}
      onNotifPress={() => router.push("/(tabs)/notifications")}
      onProfilePress={() => router.push("/(tabs)/settings")}
      onSearchPress={() => router.push("/search")}
      onOrdersPress={() => router.push("/(tabs)/orders?section=pending")}
      searchVisible={searchOpen}
      onSearchToggle={onSearchToggle}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      categories={CATEGORIES}
      selectedCategory={selectedCategory}
      onCategorySelect={onCategorySelect}
    />
    <HomeCitySheet visible={citySheet} homeCity={homeCity} placeLabel={placeLabel} placeCity={placeCity} onClose={() => setCitySheet(false)} />
    </>
  );
};
