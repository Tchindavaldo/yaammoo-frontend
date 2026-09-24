import { Menu } from "@/src/types";
import React, { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { styles } from "../CartCheckoutSheet.styles";
import {
  MUTED,
  RecapCell,
  SECTION_HEIGHT,
  SOFT_ACCENT,
} from "./detail-hero/heroShared";
import { CartRecapBody } from "./cart-detail-hero/CartRecapBody";

/** Espace libre sous la section, avant le footer. */
const FOOTER_SPACE = 80;

/**
 * Onglet Detail du checkout PANIER — copie dediee (R16) de `HomeDetailTab` +
 * `HomeDetailHero` (home), meme design « recap photo ». Section de hauteur
 * FIXE : le footer ne bouge pas. Boisson, Extras, Livraison ouvrent leur onglet.
 */
interface CartDetailTabProps {
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

export const CartDetailTab: React.FC<CartDetailTabProps> = ({
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
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  // Livraison offerte : le total affiche n'inclut PAS la livraison.
  const totalDisplay = isDeliveryFree
    ? menuPrice + extrasPrice + drinksPrice
    : menuPrice + extrasPrice + drinksPrice + deliveryPrice;
  const images =
    menu.images && menu.images.length > 0 ? menu.images : [menu.image];
  const priceDescription =
    [menu.optionPrix1, menu.optionPrix2, menu.optionPrix3][
      selectedPriceIndex - 1
    ] || "";

  const recap: RecapCell[] = [
    { icon: "fast-food-outline", title: "Menu", value: `${menuPrice} FCFA` },
    {
      icon: "wine-outline",
      title: "Boisson",
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
      title: "Livraison",
      value: isDeliveryFree ? "Gratuit" : `${deliveryPrice} FCFA`,
      strong: isDeliveryFree,
      onPress: () => onOpenTab("delivery"),
    },
    {
      icon: "wallet-outline",
      title: "Total",
      value: `${totalDisplay} FCFA`,
      strong: true,
    },
  ];

  return (
    <View style={styles.detailContainer}>
      <View
        style={{ height: SECTION_HEIGHT, marginBottom: FOOTER_SPACE }}
        onLayout={onLayout}
      >
        {width > 0 && (
          <CartRecapBody
            menu={menu}
            images={images}
            priceDescription={priceDescription}
            selectedPriceIndex={selectedPriceIndex}
            setSelectedPriceIndex={setSelectedPriceIndex}
            recap={recap}
            width={width}
          />
        )}
      </View>
    </View>
  );
};
