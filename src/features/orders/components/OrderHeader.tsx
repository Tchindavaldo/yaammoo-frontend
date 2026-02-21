import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme } from '../../../theme';

interface OrderHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { cart: number; status: number; bonus: number };
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ activeTab, onTabChange, counts }) => {
  const tabs = [
    { id: 'cart', label: 'Mon pannier', icon: 'cart-outline', count: counts.cart },
    { id: 'status', label: 'État', icon: 'checkmark-circle-outline', count: counts.status },
    { id: 'bonus', label: 'Mes Bonus', icon: 'gift-outline', count: counts.bonus },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.segmentedContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel
            ]}>
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.gray[100],
    borderRadius: Theme.borderRadius.lg,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  activeTab: {
    backgroundColor: Theme.colors.white,
    shadowColor: Theme.colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.gray[600],
  },
  activeTabLabel: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
});
