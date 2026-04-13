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
}

export const DetailTab: React.FC<DetailTabProps> = ({ 
  menu, 
  selectedPriceIndex, 
  setSelectedPriceIndex,
  menuPrice,
  extrasPrice,
  drinksPrice,
  deliveryPrice
}) => {
  const images = menu.images && menu.images.length > 0 ? menu.images : [menu.image];

  return (
    <View style={styles.detailContainer}>
      {/* Product Header */}
      <View style={styles.productHeader}>
        <ImageSlider images={images} />
        <View style={styles.headerInfo}>
          <Text style={[styles.productTitle, styles.textDark]}>{menu.titre}</Text>
          <Text style={[styles.productDesc, styles.textGrayDark]} numberOfLines={3}>
            {/* Note: In a real app, this should come from menu.description if available */}
            Produit de qualité supérieure préparé avec soin par nos chefs Yaammoo.
          </Text>
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
          <Ionicons name="bicycle-outline" size={18} color={deliveryPrice > 0 ? "#ec4913" : "#94a3b8"} />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Livraison</Text>
            <Text style={styles.gridSubText}>{deliveryPrice} FCFA</Text>
          </View>
        </View>

        <View style={[styles.gridBtn, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 }]}>
          <Ionicons name="wallet-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Total</Text>
            <Text style={[styles.gridSubText, { fontWeight: 'bold', color: '#ec4913' }]}>
              {menuPrice + extrasPrice + drinksPrice + deliveryPrice} FCFA
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
