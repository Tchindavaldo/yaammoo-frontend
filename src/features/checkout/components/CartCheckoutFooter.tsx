import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './CartCheckoutSheet.styles';
import { Loader } from '../../../components/Loader';

interface CheckoutFooterProps {
  total: number;
  quantity: number;
  setQuantity: (q: number) => void;
  onBuy: () => void;
  isLoading?: boolean;
}

export const CartCheckoutFooter: React.FC<CheckoutFooterProps> = ({ 
  total, 
  quantity, 
  setQuantity, 
  onBuy,
  isLoading
}) => {
  return (
    <View style={[styles.bottomActionBar, styles.actionBarLight]}>
      <View style={[styles.priceSectionLeft, { minWidth: 60 }]}>
        <Text style={[styles.currencyText, styles.textDark]}>XAF {total}</Text>
      </View>

      <View style={[styles.counterContainer, styles.counterLight, { flex: 1, marginHorizontal: 15, justifyContent: 'center', paddingHorizontal: 1 }]}>
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

      <TouchableOpacity style={[styles.buyBtn, { paddingHorizontal: 20 }, isLoading && { opacity: 0.7 }]} onPress={onBuy} disabled={isLoading}>
        {isLoading ? (
          <Loader size={20} color="white" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            <Text style={styles.btnText}>Valider</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
