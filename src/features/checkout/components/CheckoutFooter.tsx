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
  /** Mode review Apple : le bouton « buy » devient « order » (commande directe). */
  reviewMode?: boolean;
  /** Loader dans le bouton order pendant l'envoi de la commande (review). */
  isOrdering?: boolean;
}

export const CheckoutFooter: React.FC<CheckoutFooterProps> = ({ 
  total, 
  quantity, 
  setQuantity, 
  onAddToCart,
  onBuy,
  isLoading,
  reviewMode,
  isOrdering,
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

      <TouchableOpacity
        style={[styles.buyBtn, isOrdering && { opacity: 0.7 }]}
        onPress={onBuy}
        disabled={isOrdering}
      >
        {isOrdering ? (
          <Loader size={18} color="white" />
        ) : (
          <>
            <Ionicons name={reviewMode ? "checkmark-circle-outline" : "cart-outline"} size={16} color="white" />
            <Text style={styles.btnText}>{reviewMode ? "order" : "buy"}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
