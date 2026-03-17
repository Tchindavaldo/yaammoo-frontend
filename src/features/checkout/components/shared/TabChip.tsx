import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../CheckoutSheet.styles';

interface TabChipProps {
  isActive: boolean;
  label: string;
  icon: string;
  onPress: () => void;
}

export const TabChip: React.FC<TabChipProps> = ({ isActive, label, icon, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.tabChip,
        isActive ? styles.tabChipActive : styles.tabChipInactiveLight
      ]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={isActive ? 'white' : '#475569'} 
      />
      <Text style={[
        styles.tabLabel,
        isActive ? styles.tabLabelActive : styles.tabLabelInactiveLight
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};
