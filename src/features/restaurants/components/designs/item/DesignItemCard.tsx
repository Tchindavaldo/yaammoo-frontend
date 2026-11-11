import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { useNextDeliveryTime } from "../../../utils/deliveryUtils";
import { CardVariantProps, DesignItemProps, IS_AERE, deliveryFeeLabelFor } from "./config";
import { CardV4Aere } from "./aere/CardV4Aere";
import { CardV5Aere } from "./aere/CardV5Aere";
import { CardV7Aere } from "./aere/CardV7Aere";
import { sharedStyles } from "./styles/sharedStyles";
import { CardV1, CardV2, CardV3 } from "./variants/CardV1V2V3";
import { CardV4, CardV7 } from "./variants/CardV4V7";
import { CardV5 } from "./variants/CardV5";
import { CardV6 } from "./variants/CardV6";

const VARIANTS: Record<number, React.FC<CardVariantProps>> = {
  1: CardV1,
  2: CardV2,
  3: CardV3,
  // HOME_DESIGN = "aere" : cartes 4 / 5 / 7 du dossier `aere/`.
  4: IS_AERE ? CardV4Aere : CardV4,
  5: IS_AERE ? CardV5Aere : CardV5,
  6: CardV6,
  7: IS_AERE ? CardV7Aere : CardV7,
};

/**
 * La carte elle-meme, dans sa variante de design. Elle ne connait RIEN du
 * chargement ni du squelette : c'est `DesignItem` qui l'enveloppe et decide
 * quand la reveler. Calcule une fois les valeurs derivees communes, puis
 * aiguille vers la variante (`variants/`).
 */
export const DesignItemCard: React.FC<DesignItemProps> = ({
  menu,
  variant,
  onPress,
  index = 0,
  isLast = false,
  deliveryHours = [],
  orderLeadTime = 0,
  stock = 0,
}) => {
  const deliveryTime = useNextDeliveryTime(deliveryHours, orderLeadTime);
  const Variant = VARIANTS[variant];

  if (!Variant) {
    return (
      <TouchableOpacity style={sharedStyles.defaultContainer} onPress={onPress}>
        <Text>{menu.titre}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Variant
      menu={menu}
      onPress={onPress}
      index={index}
      isLast={isLast}
      stock={stock}
      price={`${menu.prix1} F`}
      deliveryTime={deliveryTime}
      deliveryFeeLabel={deliveryFeeLabelFor(index)}
    />
  );
};
