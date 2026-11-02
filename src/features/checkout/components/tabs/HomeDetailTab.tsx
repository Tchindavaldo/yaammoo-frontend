import { Menu } from "@/src/types";
import { menuPriceDescription } from "../../utils/menuPrices";
import React from "react";
import { View } from "react-native";
import { styles } from "../CheckoutSheet.styles";
import { HomeDetailHero } from "./HomeDetailHero";
import { MUTED, RecapCell, SOFT_ACCENT } from "./detail-hero/heroShared";
import { t, useLanguage } from "@/src/i18n";

/**
 * Onglet Detail du checkout HOME — copie dediee de `DetailTab` (R16), qui
 * reste utilise tel quel par le panier (`CartCheckoutSheet`).
 *
 * Difference : en-tete produit + tailles + recap fusionnes en un seul bloc
 * photo (`HomeDetailHero`) de hauteur fixe ; le footer ne bouge pas. Les
 * cases Boisson, Extras, Livraison ouvrent l'onglet correspondant.
 */

interface HomeDetailTabProps {
  /** Ouvre un onglet du checkout (tap sur une case du recap). */
  onOpenTab: (tab: "drink" | "extra" | "delivery") => void;
  menu: Menu;
  selectedPriceIndex: number;
  setSelectedPriceIndex: (index: number) => void;
  menuPrice: number;
  extrasPrice: number;
  drinksPrice: number;
  deliveryPrice: number;
  isDeliveryFree?: boolean;
}

export const HomeDetailTab: React.FC<HomeDetailTabProps> = ({
  onOpenTab,
  menu,
  selectedPriceIndex,
  setSelectedPriceIndex,
  menuPrice,
  extrasPrice,
  drinksPrice,
  deliveryPrice,
  isDeliveryFree,
}) => {
  useLanguage();
  // Livraison offerte : le total affiche n'inclut PAS la livraison, et la ligne
  // Livraison affiche « Gratuit ». La requete garde le vrai prix (cote hook).
  const totalDisplay = isDeliveryFree
    ? menuPrice + extrasPrice + drinksPrice
    : menuPrice + extrasPrice + drinksPrice + deliveryPrice;
  const images =
    menu.images && menu.images.length > 0 ? menu.images : [menu.image];
  // Description affichee = celle du PRIX selectionne (optionPrix1/2/3).
  const priceDescription =
    menuPriceDescription(menu, selectedPriceIndex);

  const recap: RecapCell[] = [
    { icon: "fast-food-outline", title: t("Menu"), value: `${menuPrice} FCFA` },
    {
      icon: "wine-outline",
      title: t("Boisson"),
      value: `${drinksPrice} FCFA`,
      onPress: () => onOpenTab("drink"),
    },
    {
      icon: "add-circle-outline",
      title: "Extras",
      value: `${extrasPrice} FCFA`,
      onPress: () => onOpenTab("extra"),
    },
    {
      icon: "bicycle-outline",
      iconColor: isDeliveryFree || deliveryPrice > 0 ? SOFT_ACCENT : MUTED,
      title: t("Livraison"),
      value: isDeliveryFree ? t("Gratuit") : `${deliveryPrice} FCFA`,
      strong: isDeliveryFree,
      onPress: () => onOpenTab("delivery"),
    },
    {
      icon: "wallet-outline",
      title: t("Total"),
      value: `${totalDisplay} FCFA`,
      strong: true,
    },
  ];

  return (
    <View style={styles.detailContainer}>
      <HomeDetailHero
        menu={menu}
        images={images}
        priceDescription={priceDescription}
        selectedPriceIndex={selectedPriceIndex}
        setSelectedPriceIndex={setSelectedPriceIndex}
        recap={recap}
      />
    </View>
  );
};
