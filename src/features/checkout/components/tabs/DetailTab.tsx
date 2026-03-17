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
}

export const DetailTab: React.FC<DetailTabProps> = ({ menu, selectedPriceIndex, setSelectedPriceIndex }) => {
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

      {/* Info Grid */}
      <View style={styles.gridRow}>
        <TouchableOpacity style={styles.gridBtn}>
          <Ionicons name="location-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Location</Text>
            <Text style={styles.gridSubText}>123 Way, 4B</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridBtn}>
          <Ionicons name="time-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Period</Text>
            <Text style={styles.gridSubText}>11h00-11h30</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridBtn}>
          <Ionicons name="call-outline" size={18} color="#ec4913" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>contact</Text>
            <Text style={styles.gridSubText}>696080087</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gridBtn}>
          <Ionicons name="document-text-outline" size={18} color="#94a3b8" />
          <View style={styles.gridTextCenter}>
            <Text style={[styles.gridTitle, styles.textDark]}>Notes</Text>
            <Text style={styles.gridSubText}>smal prt</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
