import React, { useState } from 'react';
import { StyleSheet, FlatList, SafeAreaView, ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { useFastFoods } from '@/src/features/restaurants/hooks/useFastFoods';
import { RestaurantHeader } from '@/src/features/restaurants/components/RestaurantHeader';
import { RestaurantCard } from '@/src/features/restaurants/components/RestaurantCard';
import { CategoryList } from '@/src/features/restaurants/components/CategoryList';
import { Theme } from '@/src/theme';

const CATEGORIES = [
  { name: 'Fast Food', icon: 'fast-food-outline' },
  { name: 'Pizza', icon: 'pizza-outline' },
  { name: 'Burger', icon: 'nutrition-outline' },
  { name: 'Drinks', icon: 'beer-outline' },
];

export default function HomeScreen() {
  const { fastFoods, loading, error, refresh } = useFastFoods();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('Fast Food');

  const renderHeader = () => (
    <>
      <RestaurantHeader
        location="Banganté, Cameroun"
        searchVisible={searchOpen}
        onSearchToggle={() => setSearchOpen(!searchOpen)}
      />
      <CategoryList
        categories={CATEGORIES}
        selectedCategory={selectedCat}
        onSelect={setSelectedCat}
      />
    </>
  );

  if (loading && fastFoods.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (error && fastFoods.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
          <Text style={styles.retryText}>Ressayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={fastFoods}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <RestaurantCard 
            restaurant={item} 
            onPress={(r) => console.log('Selected:', r.nom)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  errorText: {
    color: Theme.colors.danger,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: 40,
  },
  retryBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  retryText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
});
