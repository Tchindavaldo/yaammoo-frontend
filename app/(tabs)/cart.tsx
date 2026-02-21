import React, { useState } from 'react';
import { StyleSheet, FlatList, SafeAreaView, ActivityIndicator, View, Text } from 'react-native';
import { useOrders } from '@/src/features/orders/hooks/useOrders';
import { OrderHeader } from '@/src/features/orders/components/OrderHeader';
import { OrderCard } from '@/src/features/orders/components/OrderCard';
import { Theme } from '@/src/theme';

export default function OrdersScreen() {
  const { loading, pending, active, refresh } = useOrders();
  const [currentTab, setCurrentTab] = useState('cart');

  const getData = () => {
    switch (currentTab) {
      case 'cart': return pending;
      case 'status': return active;
      case 'bonus': return [];
      default: return [];
    }
  };

  const renderHeader = () => (
    <OrderHeader
      activeTab={currentTab}
      onTabChange={setCurrentTab}
      counts={{
        cart: pending.length,
        status: active.length,
        bonus: 0 // Mocked for now
      }}
    />
  );

  if (loading && getData().length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={getData()}
        renderItem={({ item }) => <OrderCard order={item} />}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={refresh}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucune commande trouvée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.light,
  },
  centered: {
    flex: 1,
    padding: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
  }
});
