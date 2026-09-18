import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from '@/src/types';
import { PriceChip } from '../shared/PriceChip';
import { ImageSlider } from '../shared/ImageSlider';
import { styles } from '../CheckoutSheet.styles';

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
    [menu.optionPrix1, menu.optionPrix2, menu.optionPrix3][
      selectedPriceIndex - 1
    ] || "";

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
        <PriceChip 
          isActive={selectedPriceIndex === 1} 
          label="Small" 
          price={menu.prix1} 
          onPress={() => setSelectedPriceIndex(1)} 
        />
        <PriceChip 
          isActive={selectedPriceIndex === 2} 
          label="Med" 
          price={menu.prix2} 
          onPress={() => setSelectedPriceIndex(2)} 
        />
        <PriceChip 
          isActive={selectedPriceIndex === 3} 
          label="Large" 
          price={menu.prix3} 
          onPress={() => setSelectedPriceIndex(3)} 
        />
      </View>

      {/* Price Summary Grid */}
      <View style={styles.gridRow}>
        <View style={styles.gridBtn}>
          <Ionicons name="fast-food-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Menu</Text>
            <Text style={styles.gridSubText}>{menuPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="wine-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Boisson</Text>
            <Text style={styles.gridSubText}>{drinksPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Extras</Text>
            <Text style={styles.gridSubText}>{extrasPrice} FCFA</Text>
          </View>
        </View>

        <View style={styles.gridBtn}>
          <Ionicons name="bicycle-outline" size={18} color={isDeliveryFree || deliveryPrice > 0 ? "#ec4913" : "#94a3b8"} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Livraison</Text>
            {isDeliveryFree ? (
              <Text style={[styles.gridSubText, { fontWeight: 'bold', color: '#ec4913' }]}>Gratuit</Text>
            ) : (
              <Text style={styles.gridSubText}>{deliveryPrice} FCFA</Text>
            )}
          </View>
        </View>

        <View style={[styles.gridBtn, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}>
          <Ionicons name="wallet-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Total</Text>
            <Text style={[styles.gridSubText, { fontWeight: 'bold', color: '#ec4913' }]}>
              {totalDisplay} FCFA
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
