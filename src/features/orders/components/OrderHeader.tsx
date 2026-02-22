import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface OrderHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { cart: number; status: number; bonus: number };
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    { id: 'cart', label: 'Pannier', icon: 'cart-outline', count: counts.cart },
    { id: 'status', label: 'Commandes', icon: 'checkmark-circle-outline', count: counts.status },
    { id: 'bonus', label: 'Bonus', icon: 'gift-outline', count: counts.bonus },
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
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  rowSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginTop: -5,
  },
  colSegment: {
    paddingHorizontal: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'relative',
  },
  activeChip: {
    backgroundColor: 'darkred',
  },
  label: {
    fontSize: 10,
    color: 'black',
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
