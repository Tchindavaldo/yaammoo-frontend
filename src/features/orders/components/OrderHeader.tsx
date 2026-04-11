import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../../theme';

interface OrderHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: { cart: number; status: number; bonus: number };
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({ activeTab, onTabChange, counts }) => {
  const insets = useSafeAreaInsets();
  const tabs = [
    { id: 'cart', label: 'Mon pannier', icon: 'cart-outline', count: counts.cart },
    { id: 'status', label: 'Etat des commandes', icon: 'checkmark-circle-outline', count: counts.status },
    { id: 'bonus', label: 'Mes Bonus', icon: 'gift-outline', count: counts.bonus },
  ];

  return (
    <BlurView intensity={80} tint="light" style={[styles.container, { paddingTop: insets.top }]}>
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
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingBottom: 10,
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
    backgroundColor: 'rgba(236,73,19,1.00)',
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
    backgroundColor: 'rgba(236,73,19,1.00)',
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
