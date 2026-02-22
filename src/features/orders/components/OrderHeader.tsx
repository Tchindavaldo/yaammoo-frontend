import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface OrderHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { cart: number; status: number; bonus: number };
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    { id: 'cart', label: 'Mon pannier', icon: 'cart-outline', count: counts.cart },
    { id: 'status', label: 'Etat des commandes', icon: 'checkmark-circle-outline', count: counts.status },
    { id: 'bonus', label: 'Mes Bonus', icon: 'gift-outline', count: counts.bonus },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.rowSegment}>
        {tabs.map((tab) => (
          <View key={tab.id} style={styles.colSegment}>
            <TouchableOpacity
              style={[
                styles.chip,
                activeTab === tab.id && styles.activeChip
              ]}
              onPress={() => onTabChange(tab.id)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.id ? 'white' : 'red'} 
                style={{ marginRight: 5 }}
              />
              <Text style={[
                styles.label,
                activeTab === tab.id && styles.activeLabel
              ]}>
                {tab.label}
              </Text>

              {/* Badge absolu conforme au SCSS original (top -7, right -7) */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 45 : (Platform.OS === 'android' ? 30 : 10), // Adjust for status bar
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  rowSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  colSegment: {
    paddingHorizontal: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5', // Light red for unselected chips
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20, // Ionic mode="ios" is very rounded
    position: 'relative',
    height: 32,
  },
  activeChip: {
    backgroundColor: 'darkred',
  },
  label: {
    fontSize: 9, // original was font-size: 8px or similar
    color: 'black',
    fontWeight: 'bold',
  },
  activeLabel: {
    color: 'white',
    fontWeight: 'normal',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: 'darkred',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
