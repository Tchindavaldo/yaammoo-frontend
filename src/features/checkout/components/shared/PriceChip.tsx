import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../CheckoutSheet.styles';

interface PriceChipProps {
  isActive: boolean;
  label: string;
  price: number;
  onPress: () => void;
}

export const PriceChip: React.FC<PriceChipProps> = ({ isActive, label, price, onPress }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.sizeChip, 
        isActive ? styles.sizeChipActive : styles.sizeChipInactiveLight
      ]}
      onPress={onPress}
    >
      <Text style={[styles.sizeLabel, isActive ? styles.sizeLabelActive : styles.sizeLabelInactive]}>
        {label}
      </Text>
      <Text style={[styles.sizePrice, styles.textDark, isActive && { color: '#ec4913' }]}>
        {price > 0 ? `${price} F` : 'no ref'}
      </Text>
    </TouchableOpacity>
  );
};
