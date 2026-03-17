import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Menu } from '@/src/types';
import { useCheckout } from '../hooks/useCheckout';
import { styles } from './CheckoutSheet.styles';

// Shared Components
import { TabChip } from './shared/TabChip';

// Tabs
import { DetailTab } from './tabs/DetailTab';
import { ExtrasTab } from './tabs/ExtrasTab';
import { DrinksTab } from './tabs/DrinksTab';
import { DeliveryTab } from './tabs/DeliveryTab';

// Footer
import { CheckoutFooter } from './CheckoutFooter';

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  onConfirm: (order: any) => void;
}

type CheckoutStep = 'detail' | 'extra' | 'drink' | 'delivery';

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ visible, onClose, menu, onConfirm }) => {
  const {
    quantity, setQuantity,
    selectedPriceIndex, setSelectedPriceIndex,
    selectedPackaging, setSelectedPackaging,
    selectedDrinks, setSelectedDrinks,
    delivery, setDelivery,
    availablePackaging, availableDrinks,
    total, createOrder
  } = useCheckout(menu);

  const [activeTab, setActiveTab] = useState<CheckoutStep>('detail');

  if (!menu) return null;

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheetContainer, styles.sheetLight]}>
          <View style={styles.tabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
              <TabChip 
                isActive={activeTab === 'detail'} 
                label="Details" 
                icon="information-circle-outline" 
                onPress={() => setActiveTab('detail')} 
              />
              <TabChip 
                isActive={activeTab === 'drink'} 
                label="Drinks" 
                icon="wine-outline" 
                onPress={() => setActiveTab('drink')} 
              />
              <TabChip 
                isActive={activeTab === 'extra'} 
                label="Extras" 
                icon="add-circle-outline" 
                onPress={() => setActiveTab('extra')} 
              />
              <TabChip 
                isActive={activeTab === 'delivery'} 
                label="Delivery" 
                icon="bicycle-outline" 
                onPress={() => setActiveTab('delivery')} 
              />
            </ScrollView>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'detail' && (
              <DetailTab 
                menu={menu} 
                selectedPriceIndex={selectedPriceIndex} 
                setSelectedPriceIndex={setSelectedPriceIndex} 
              />
            )}

            {activeTab === 'extra' && (
              <ExtrasTab 
                availablePackaging={availablePackaging}
                selectedPackaging={selectedPackaging}
                setSelectedPackaging={setSelectedPackaging}
              />
            )}

            {activeTab === 'drink' && (
              <DrinksTab 
                availableDrinks={availableDrinks}
                selectedDrinks={selectedDrinks}
                setSelectedDrinks={setSelectedDrinks}
              />
            )}

            {activeTab === 'delivery' && (
              <DeliveryTab 
                delivery={delivery}
                setDelivery={setDelivery}
              />
            )}
          </ScrollView>

          <CheckoutFooter 
            total={total}
            quantity={quantity}
            setQuantity={setQuantity}
            onAddToCart={() => {}} // TODO: Implement if needed
            onBuy={handleConfirm}
          />
        </View>
      </View>
    </Modal>
  );
};
