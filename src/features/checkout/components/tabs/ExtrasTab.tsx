import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Embalage } from '@/src/types';
import { styles } from '../CheckoutSheet.styles';

interface ExtrasTabProps {
  availablePackaging: Embalage[];
  selectedPackaging: Embalage[];
  setSelectedPackaging: (packaging: Embalage[]) => void;
}

export const ExtrasTab: React.FC<ExtrasTabProps> = ({ 
  availablePackaging, 
  selectedPackaging, 
  setSelectedPackaging 
}) => {
  const togglePackaging = (item: Embalage) => {
    const isSelected = selectedPackaging.some(p => p.type === item.type);
    if (isSelected) {
      setSelectedPackaging(selectedPackaging.filter(p => p.type !== item.type));
    } else {
      setSelectedPackaging([...selectedPackaging, item]);
    }
  };

  return (
    <View style={styles.gridList}>
      {availablePackaging.map((item) => {
        const isSelected = selectedPackaging.some(p => p.type === item.type);
        return (
          <TouchableOpacity 
            key={item.type}
            style={styles.extraItem}
            onPress={() => togglePackaging(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.extraIconContainer, isSelected && styles.extraIconSelected]}>
              <Ionicons name="cube-outline" size={24} color={isSelected ? '#ec4913' : '#94a3b8'} />
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>1</Text>
                </View>
              )}
            </View>
            <View style={styles.extraTextCenter}>
              <Text style={[styles.extraName, styles.textDark]}>{item.type}</Text>
              <Text style={styles.extraPrice}>+{item.prix} F</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
