import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { styles } from '../CheckoutSheet.styles';
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

interface PriceChipProps {
  isActive: boolean;
  label: string;
  price: number;
  onPress: () => void;
}

export const PriceChip: React.FC<PriceChipProps> = ({ isActive, label, price, onPress }) => {
  useLanguage();
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
      <Text style={[styles.sizePrice, styles.textDark, isActive && { color: DS.accent }]}>
        {price > 0 ? `${price} F` : t("Prix non défini")}
      </Text>
    </TouchableOpacity>
  );
};
