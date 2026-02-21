import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface SettingItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  color?: string;
}

export const SettingItem: React.FC<SettingItemProps> = ({ 
  icon, 
  title, 
  onPress,
  color = Theme.colors.dark 
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={Theme.colors.gray[400]} />
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
