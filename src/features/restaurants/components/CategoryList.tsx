import React from 'react';
import { FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';

interface CategoryListProps {
  categories: { name: string; icon: string }[];
  selectedCategory?: string;
  onSelect: (category: string) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={[
            styles.chip,
            selectedCategory === item.name && styles.chipSelected
          ]}
          onPress={() => onSelect(item.name)}
        >
          <Ionicons 
            name={item.icon as any} 
            size={16} 
            color={selectedCategory === item.name ? Theme.colors.white : Theme.colors.primary} 
          />
          <Text style={[
            styles.text,
            selectedCategory === item.name && styles.textSelected
          ]}>
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.name}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.lg,
  },
  contentContainer: {
    paddingHorizontal: Theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    marginRight: Theme.spacing.sm,
  },
  chipSelected: {
    backgroundColor: Theme.colors.primary,
  },
  text: {
    color: Theme.colors.primary,
    fontSize: 13,
    marginLeft: Theme.spacing.xs,
    fontWeight: '500',
  },
  textSelected: {
    color: Theme.colors.white,
  },
});
