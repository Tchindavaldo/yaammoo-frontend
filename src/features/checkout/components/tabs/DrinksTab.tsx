import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Boisson } from '@/src/types';
import { styles } from '../CheckoutSheet.styles';

interface DrinksTabProps {
  availableDrinks: Boisson[];
  selectedDrinks: Boisson[];
  setSelectedDrinks: (drinks: Boisson[]) => void;
}

export const DrinksTab: React.FC<DrinksTabProps> = ({ 
  availableDrinks, 
  selectedDrinks, 
  setSelectedDrinks 
}) => {
  const toggleDrink = (item: Boisson) => {
    const isSelected = selectedDrinks.some(d => d.type === item.type);
    if (isSelected) {
      setSelectedDrinks(selectedDrinks.filter(d => d.type !== item.type));
    } else {
      setSelectedDrinks([...selectedDrinks, item]);
    }
  };

  return (
    <View style={styles.drinksContainer}>
      {availableDrinks.map((item) => {
        const isSelected = selectedDrinks.some(d => d.type === item.type);
        return (
          <TouchableOpacity 
            key={item.type}
            style={styles.drinkRow}
            onPress={() => toggleDrink(item)}
            activeOpacity={0.6}
          >
            <View style={styles.drinkLeft}>
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Ionicons name="wine-outline" size={20} color={isSelected ? '#ec4913' : '#94a3b8'} style={{ marginLeft: 12 }} />
              <Text style={[styles.drinkName, styles.textDark]}>{item.type}</Text>
            </View>
            <Text style={styles.drinkPrice}>{item.prix} F</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
