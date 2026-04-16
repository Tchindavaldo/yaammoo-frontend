import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from '@/src/types';
import { useCheckout } from '../hooks/useCheckout';
import { styles } from './CartCheckoutSheet.styles';
import axios from 'axios';
import { Config } from '@/src/api/config';

// Shared Components
import { TabChip } from './shared/TabChip';

// Tabs
import { DetailTab } from './tabs/DetailTab';
import { ExtrasTab } from './tabs/ExtrasTab';
import { DrinksTab } from './tabs/DrinksTab';
import { DeliveryTab } from './tabs/DeliveryTab';

// Footer
import { CartCheckoutFooter } from './CartCheckoutFooter';

// Overlay
import { CheckoutLocationOverlay } from './CheckoutLocationOverlay';
import { CheckoutContactOverlay } from './CheckoutContactOverlay';
import { CheckoutPeriodOverlay } from './CheckoutPeriodOverlay';
import { CheckoutVoiceNoteOverlay } from './CheckoutVoiceNoteOverlay';
import { CheckoutPaymentOverlay } from './CheckoutPaymentOverlay';

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  initialOrder?: any | null;
  onConfirm: (order: any) => void;
  onChange?: (order: any) => void;
  isCartMode?: boolean;
}

type CheckoutStep = 'detail' | 'extra' | 'drink' | 'delivery';

export const CartCheckoutSheet: React.FC<CheckoutSheetProps> = ({ visible, onClose, menu, initialOrder, onConfirm, isCartMode, onChange }) => {
  const [activeTab, setActiveTab] = useState<CheckoutStep>('detail');
  const [isLocationPopupVisible, setIsLocationPopupVisible] = useState(false);
  const [isContactPopupVisible, setIsContactPopupVisible] = useState(false);
  const [isPeriodPopupVisible, setIsPeriodPopupVisible] = useState(false);
  const [isVoiceNotePopupVisible, setIsVoiceNotePopupVisible] = useState(false);
  const [isPaymentPopupVisible, setIsPaymentPopupVisible] = useState(false);
  const [paymentKey, setPaymentKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuWithDeliveryHours, setMenuWithDeliveryHours] = useState<Menu | null>(menu);

  const {
    quantity, setQuantity,
    selectedPriceIndex, setSelectedPriceIndex,
    selectedPackaging, setSelectedPackaging,
    selectedDrinks, setSelectedDrinks,
    delivery, setDelivery,
    availablePackaging, availableDrinks,
    total, menuPrice, extrasPrice, drinksPrice, deliveryPrice,
    createOrder
  } = useCheckout(menuWithDeliveryHours, initialOrder, onChange);

  // Enrichir le menu avec les deliveryHours de la boutique
  useEffect(() => {
    if (!menu || !(menu as any).fastFoodId) {
      setMenuWithDeliveryHours(menu);
      return;
    }

    const fetchDeliveryHours = async () => {
      try {
        const response = await axios.get(`${Config.apiUrl}/fastfood/${(menu as any).fastFoodId}`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (response.data?.data?.deliveryHours || response.data?.data?.orderLeadTime) {
          setMenuWithDeliveryHours({
            ...menu,
            deliveryHours: response.data.data.deliveryHours,
            orderLeadTime: response.data.data.orderLeadTime
          } as any);
        } else {
          setMenuWithDeliveryHours(menu);
        }
      } catch {
        setMenuWithDeliveryHours(menu);
      }
    };

    fetchDeliveryHours();
  }, [menu]);

  if (!menu) return null;

  const availableHours = (menuWithDeliveryHours as any)?.deliveryHours || [];
  const orderLeadTime = (menuWithDeliveryHours as any)?.orderLeadTime || 0;

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.dismiss} />
        
        <View style={[styles.sheetContainer, styles.sheetLight]}>
          <View style={{ flex: 1 }}>
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
              
              <TouchableOpacity 
                style={styles.closeCircle} 
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              {activeTab === 'detail' && (
                <DetailTab 
                  menu={menu} 
                  selectedPriceIndex={selectedPriceIndex} 
                  setSelectedPriceIndex={setSelectedPriceIndex} 
                  menuPrice={menuPrice}
                  extrasPrice={extrasPrice}
                  drinksPrice={drinksPrice}
                  deliveryPrice={deliveryPrice}
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
                  onOpenLocation={() => setIsLocationPopupVisible(true)}
                  onOpenContact={() => setIsContactPopupVisible(true)}
                  onOpenPeriod={() => setIsPeriodPopupVisible(true)}
                  onOpenVoiceNote={() => setIsVoiceNotePopupVisible(true)}
                />
              )}
            </ScrollView>
          </View>

          <CartCheckoutFooter 
            total={total}
            quantity={quantity}
            setQuantity={setQuantity}
            isLoading={isSubmitting}
            isCartMode={isCartMode}
            onAddToCart={async () => {
              try {
                setIsSubmitting(true);
                const success = await (onConfirm(createOrder('pendingToBuy')) as any);
                if (success) onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
            onBuy={() => {
              setIsPaymentPopupVisible(true);
              setPaymentKey(prev => prev + 1);
            }}
          />

        </View>

        {isLocationPopupVisible && (
          <CheckoutLocationOverlay 
            onClose={() => setIsLocationPopupVisible(false)} 
            address={delivery.address || ''}
            note={delivery.note || ''}
            onSave={(addr, note) => setDelivery({ ...delivery, address: addr, note: note })}
          />
        )}

        {isContactPopupVisible && (
          <CheckoutContactOverlay 
            onClose={() => setIsContactPopupVisible(false)} 
            phone={delivery.phone || ''}
            onSelectPhone={(ph) => setDelivery({ ...delivery, phone: ph })}
          />
        )}

        {isPeriodPopupVisible && (
          <CheckoutPeriodOverlay
            onClose={() => setIsPeriodPopupVisible(false)}
            selectedPeriod={delivery.hour || 'Now'}
            onSelectPeriod={(period) => setDelivery({ ...delivery, hour: period })}
            availableHours={availableHours}
            orderLeadTime={orderLeadTime}
          />
        )}

        {isVoiceNotePopupVisible && (
          <CheckoutVoiceNoteOverlay 
            onClose={() => setIsVoiceNotePopupVisible(false)} 
            onSave={(uri) => setDelivery({ ...delivery, voiceNoteUri: uri })}
          />
        )}

        {isPaymentPopupVisible && (
          <CheckoutPaymentOverlay 
            key={paymentKey}
            onClose={() => setIsPaymentPopupVisible(false)}
            phone={delivery.phone || ''}
            totalAmount={total}
            onConfirm={async (payPhone) => {
              const success = await (onConfirm(createOrder('pending')) as any);
              if (success) onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
};
