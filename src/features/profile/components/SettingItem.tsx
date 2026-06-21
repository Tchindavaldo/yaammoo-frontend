import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface SettingItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  color?: string;
  /** Affiche un loader à la place du chevron et désactive le press (action en cours). */
  loading?: boolean;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  onPress,
  color = Theme.colors.dark,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={loading}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.title, { color }]}>{title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.gray[400]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
