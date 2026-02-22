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
            size={8} 
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
    marginBottom: 5,
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderRadius: 20,
    marginRight: 0,
    height: 32,
  },
  chipSelected: {
    backgroundColor: '#8b0000',
  },
  text: {
    color: Theme.colors.primary,
    fontSize: 10,
    marginLeft: 4,
  },
  textSelected: {
    color: 'white',
  },
  icon: {
    fontSize: 8,
  }
});
