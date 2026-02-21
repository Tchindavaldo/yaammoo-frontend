import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Theme } from '../../../theme';

interface RestaurantHeaderProps {
  userName?: string;
  userPhoto?: string;
  location: string;
  searchVisible: boolean;
  onSearchToggle: () => void;
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  userName = 'User',
  userPhoto,
  location,
  searchVisible,
  onSearchToggle,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.profileContainer}>
          <Image
            source={{ uri: userPhoto || 'https://via.placeholder.com/35' }}
            style={styles.profilePic}
          />
        </View>
        <View style={styles.locationContainer}>
          <TouchableOpacity style={styles.locationBtn}>
            <Ionicons name="location-sharp" size={16} color={Theme.colors.white} />
            <Text style={styles.locationText}>{location}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.greetingRow}>
        <Text style={styles.greetingText}>Good morning, {userName}!</Text>
      </View>

      {searchVisible && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={Theme.colors.gray[500]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    backgroundColor: Theme.colors.white,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  profileContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  locationContainer: {
    flex: 1,
    alignItems: 'center',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.xl,
  },
  locationText: {
    color: Theme.colors.white,
    fontSize: 12,
    marginLeft: 5,
  },
  notifBtn: {
    padding: Theme.spacing.xs,
  },
  greetingRow: {
    marginBottom: Theme.spacing.sm,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  searchRow: {
    marginBottom: Theme.spacing.md,
  },
  searchInput: {
    backgroundColor: Theme.colors.gray[100],
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    fontSize: 14,
  },
});
