import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './CheckoutSheet.styles';
import { Loader } from '../../../components/Loader';

interface CheckoutFooterProps {
  total: number;
  quantity: number;
  setQuantity: (q: number) => void;
  onAddToCart: () => void;
  onBuy: () => void;
  isLoading?: boolean;
}

export const CheckoutFooter: React.FC<CheckoutFooterProps> = ({ 
  total, 
  quantity, 
  setQuantity, 
  onAddToCart, 
  onBuy,
  isLoading
}) => {
  return (
    <View style={[styles.bottomActionBar, styles.actionBarLight]}>
      <View style={styles.priceSectionLeft}>
        <Text style={[styles.currencyText, styles.textDark]}>XAF {"\n"}{total}</Text>
      </View>

      <View style={[styles.counterContainer, styles.counterLight]}>
        <TouchableOpacity 
          style={styles.counterBtn}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Ionicons name="remove" size={18} color="black" />
        </TouchableOpacity>
        <Text style={[styles.counterText, styles.textDark]}>{quantity}</Text>
        <TouchableOpacity 
          style={[styles.counterBtn, styles.counterBtnAdd, styles.counterBtnAddLight]}
          onPress={() => setQuantity(quantity + 1)}
        >
          <Ionicons name="add" size={18} color="black" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.addToCartBtn, isLoading && { opacity: 0.7 }]} 
        onPress={onAddToCart}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader size={20} color="white" />
        ) : (
          <Text style={styles.btnText}>add To Cart</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.buyBtn} onPress={onBuy}>
        <Ionicons name="cart-outline" size={16} color="white" />
        <Text style={styles.btnText}>buy</Text>
      </TouchableOpacity>
    </View>
  );
};
