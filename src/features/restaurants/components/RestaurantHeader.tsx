import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Theme } from '../../../theme';

interface RestaurantHeaderProps {
  userName?: string;
  userPhoto?: string;
  location: string;
  searchVisible: boolean;
  onSearchToggle: () => void;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  userName = 'User',
  userPhoto,
  location,
  searchVisible,
  onSearchToggle,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <View style={styles.container}>
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
            <Ionicons name="notifications-outline" size={12} color="darkred" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Deuxième Barre d'outils (Greeting & Search) */}
      <View style={styles.toolbar2}>
        <View style={styles.rowGreat}>
          <Text style={styles.greatLabel}>Hello, {userName}</Text>
        </View>

        {searchVisible && (
          <View style={styles.rowSearchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Custom Placeholder"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoFocus
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 44 : 10, // Safe area minimaliste pour le haut
  },
  toolbar1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    backgroundColor: 'white',
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
    height: 33,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLocalisation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'darkred',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 25,
    height: 33, // Pour forcer la cohérence de taille avec l'avatar
  },
  localisationLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
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
