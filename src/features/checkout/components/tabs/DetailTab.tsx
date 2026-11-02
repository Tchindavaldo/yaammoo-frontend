import React from 'react';
import { menuPriceDescription, menuPriceOptions } from "../../utils/menuPrices";
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from '@/src/types';
import { PriceChip } from '../shared/PriceChip';
import { ImageSlider } from '../shared/ImageSlider';
import { styles } from '../CheckoutSheet.styles';
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

interface DetailTabProps {
  menu: Menu;
  selectedPriceIndex: number;
  setSelectedPriceIndex: (index: number) => void;
  menuPrice: number;
  extrasPrice: number;
  drinksPrice: number;
  deliveryPrice: number;
  isDeliveryFree?: boolean;
}

export const DetailTab: React.FC<DetailTabProps> = ({
  menu,
  selectedPriceIndex,
  setSelectedPriceIndex,
  menuPrice,
  extrasPrice,
  drinksPrice,
  deliveryPrice,
  isDeliveryFree
}) => {
  // Livraison offerte : le total affiché n'inclut PAS la livraison, et la ligne
  // Livraison affiche « Gratuit ». La requête garde le vrai prix (côté hook).
  const totalDisplay = isDeliveryFree
    ? menuPrice + extrasPrice + drinksPrice
    : menuPrice + extrasPrice + drinksPrice + deliveryPrice;
  const images = menu.images && menu.images.length > 0 ? menu.images : [menu.image];
  // Description affichée = celle du PRIX sélectionné. optionPrix1/2/3 sont les
  // miroirs aplatis de prices[].description (normalizeMenu côté home, mapping
  // du panier). Rien ne s'affiche si la description du prix est absente.
  const priceDescription =
    menuPriceDescription(menu, selectedPriceIndex);

  return (
    <View style={styles.detailContainer}>
      {/* Product Header */}
      <View style={styles.productHeader}>
        <ImageSlider images={images} />
        <View style={styles.headerInfo}>
          <Text style={[styles.productTitle, styles.textDark]}>{menu.titre}</Text>
          {!!priceDescription && (
            <Text style={[styles.productDesc, styles.textGrayDark]} numberOfLines={3}>
              {priceDescription}
            </Text>
          )}
        </View>
      </View>

      {/* Price/Size Chips */}
      <View style={[styles.priceChipsContainer, styles.borderLight]}>
        {menuPriceOptions(menu).map((opt) => (
          <PriceChip
            key={opt.index}
            isActive={selectedPriceIndex === opt.index}
            label={opt.description || t("Prix {{a}}", { a: opt.index })}
            price={opt.price}
            onPress={() => setSelectedPriceIndex(opt.index)}
          />
        ))}
      </View>

      {/* Price Summary Grid */}
      <View style={styles.gridRow}>
        <View style={styles.gridBtn}>
          <Ionicons name="fast-food-outline" size={18} color={DS.accent} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>{t("Menu")}</Text>
            <Text style={styles.gridSubText}>{menuPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="wine-outline" size={18} color={DS.accent} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>{t("Boisson")}</Text>
            <Text style={styles.gridSubText}>{drinksPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="add-circle-outline" size={18} color={DS.accent} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Extras</Text>
            <Text style={styles.gridSubText}>{extrasPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="bicycle-outline" size={18} color={isDeliveryFree || deliveryPrice > 0 ? DS.accent : "#94a3b8"} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>{t("Livraison")}</Text>
            {isDeliveryFree ? (
              <Text style={[styles.gridSubText, { fontWeight: 'bold', color: DS.accent }]}>{t("Gratuit")}</Text>
            ) : (
              <Text style={styles.gridSubText}>{deliveryPrice} FCFA</Text>
            )}
          </View>
        </View>

        <View style={[styles.gridBtn, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}>
          <Ionicons name="wallet-outline" size={18} color={DS.accent} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>{t("Total")}</Text>
            <Text style={[styles.gridSubText, { fontWeight: 'bold', color: DS.accent }]}>
              {totalDisplay} FCFA
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
