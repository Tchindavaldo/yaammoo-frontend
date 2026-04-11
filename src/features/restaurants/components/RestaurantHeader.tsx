import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../../../theme';

interface RestaurantHeaderProps {
  userName?: string;
  userPhoto?: string;
  location: string;
  searchVisible: boolean;
  onSearchToggle: () => void;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  categories: { name: string; icon: any }[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  userName = 'User',
  userPhoto,
  location,
  searchVisible,
  onSearchToggle,
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <BlurView intensity={80} tint="light" style={[styles.container, { paddingTop: insets.top }]}>
      {/* Première Barre d'outils (Icons & Location) - Equivalent ion-toolbar baseline */}
      <View style={styles.toolbar1}>
        <View style={styles.colAvatar}>
          <View style={styles.imgProfile}>
            <Image
              source={userPhoto ? { uri: userPhoto } : require('../../../../assets/images/user.png')}
              style={styles.avatarImg}
              contentFit="cover"
            />
          </View>
        </View>
        
        <View style={styles.colLocation}>
          <TouchableOpacity style={styles.chipLocalisation}>
            <Ionicons name="location-sharp" size={12} color="white" />
            <Text style={styles.localisationLabel}>{location}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.colNotification}>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={12} color="rgba(236,73,19,1.00)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((cat, idx) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <TouchableOpacity 
              key={idx} 
              style={[styles.catChip, isSelected && styles.catChipActive]}
              onPress={() => onCategorySelect(cat.name)}
            >
              <Ionicons 
                name={cat.icon} 
                size={14} 
                color={isSelected ? 'rgba(236,73,19,1.00)' : 'rgba(236,73,19,1.00)'} 
              />
              <Text style={[styles.catLabel, isSelected && styles.catLabelActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  toolbar1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  colAvatar: {
    paddingLeft: 8,
    paddingRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgProfile: {
    height: 33,
    width: 33,
    borderRadius: 16.5,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  colLocation: {
    flex: 1,
    height: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLocalisation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236,73,19,1.00)',
    paddingHorizontal: 14,
    borderRadius: 25,
    height: 33, // Pour forcer la cohérence de taille avec l'avatar
  },
  localisationLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '300',
    marginLeft: 4,
  },
  colNotification: {
    paddingLeft: 5,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBtn: {
    padding: 2,
  },
  categoryBar: {
    paddingVertical: 12,
  },
  categoryContent: {
    paddingHorizontal: 8,
    gap: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 25,
    gap: 6,
  },
  catChipActive: {
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: 'rgba(236,73,19,1.00)',
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(236,73,19,1.00)',
  },
  catLabelActive: {
    color: 'rgba(236,73,19,1.00)',
  },
  toolbar2: {
    backgroundColor: 'white',
  },
  rowGreat: {
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  greatLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: 'black',
  },
  rowSearchBar: {
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  searchInput: {
    backgroundColor: '#efefef',
    height: 40,
    borderRadius: 40,
    paddingHorizontal: 15,
    fontSize: 14,
  },
});
