import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Menu } from '@/src/types';
import { useCheckout } from '../hooks/useCheckout';

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  onConfirm: (order: any) => void;
}

type CheckoutStep = 'detail' | 'extra' | 'drink' | 'delivery';

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ visible, onClose, menu, onConfirm }) => {
  // UI is forced to Light Mode as per user request
  const isDark = false; 

  const {
    quantity, setQuantity,
    selectedPriceIndex, setSelectedPriceIndex,
    total, createOrder
  } = useCheckout(menu);

  const [activeTab, setActiveTab] = useState<CheckoutStep>('detail');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!menu) return null;
  
  const images = menu.images && menu.images.length > 0 ? menu.images : [menu.image];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveImageIndex(index);
  };

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  const renderTabChip = (key: CheckoutStep, label: string, icon: string) => {
    const isActive = activeTab === key;
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.tabChip,
          isActive ? styles.tabChipActive : styles.tabChipInactiveLight
        ]}
        onPress={() => setActiveTab(key)}
      >
        <Ionicons 
          name={icon as any} 
          size={16} 
          color={isActive ? 'white' : '#475569'} 
        />
        <Text style={[
          styles.tabLabel,
          isActive ? styles.tabLabelActive : styles.tabLabelInactiveLight
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPriceChip = (index: number, label: string) => {
    const isActive = selectedPriceIndex === index;
    const price = index === 1 ? menu.prix1 : index === 2 ? menu.prix2 : menu.prix3;
    
    return (
      <TouchableOpacity 
        style={[
          styles.sizeChip, 
          isActive ? styles.sizeChipActive : styles.sizeChipInactiveLight
        ]}
        onPress={() => setSelectedPriceIndex(index)}
      >
        <Text style={[styles.sizeLabel, isActive ? styles.sizeLabelActive : styles.sizeLabelInactive]}>
          {label}
        </Text>
        <Text style={[styles.sizePrice, styles.textDark, isActive && { color: '#ec4913' }]}>
          {price > 0 ? `${price} F` : 'no ref'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.sheetContainer, styles.sheetLight]}>
          {/* Tabs/Chips */}
          <View style={styles.tabsWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
              {renderTabChip('detail', 'Details', 'information-circle-outline')}
              {renderTabChip('drink', 'Drinks', 'wine-outline')}
              {renderTabChip('extra', 'Extras', 'add-circle-outline')}
              {renderTabChip('delivery', 'Delivery', 'bicycle-outline')}
            </ScrollView>
          </View>

          {/* Main Content Area */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {activeTab === 'detail' && (
              <View style={styles.detailContainer}>
                {/* Product Header */}
                <View style={styles.productHeader}>
                  <View style={styles.sliderWrapper}>
                    <FlatList
                      data={images}
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onScroll={handleScroll}
                      scrollEventThrottle={16}
                      keyExtractor={(_, index) => index.toString()}
                      renderItem={({ item }) => (
                        <Image 
                          source={item ? { uri: item } : require('@/assets/blur3.jpg')} 
                          style={styles.avatarImage} 
                        />
                      )}
                      style={styles.imageList}
                    />
                    {images.length > 1 && (
                      <View style={styles.paginationDots}>
                        {images.map((_, i) => (
                          <View 
                            key={i} 
                            style={[
                              styles.dot, 
                              activeImageIndex === i ? styles.dotActive : styles.dotInactive
                            ]} 
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.headerInfo}>
                    <Text style={[styles.productTitle, styles.textDark]}>{menu.titre}</Text>
                    <Text style={[styles.productDesc, styles.textGrayDark]} numberOfLines={3}>
                      Hand-tossed crust with premium cured pepperoni and aged mozzarella pimenter a la sauce jaune.
                    </Text>
                  </View>
                </View>

                {/* Price/Size Chips */}
                <View style={[styles.priceChipsContainer, styles.borderLight]}>
                  {renderPriceChip(1, 'Small')}
                  {renderPriceChip(2, 'Med')}
                  {renderPriceChip(3, 'Large')}
                </View>

                {/* Info Grid (4 columns, single row, justified left, no border) */}
                <View style={styles.gridRow}>
                  <TouchableOpacity style={styles.gridBtn}>
                    <Ionicons name="location-outline" size={18} color="#ec4913" />
                    <View style={styles.gridTextCenter}>
                      <Text style={[styles.gridTitle, styles.textDark]}>Location</Text>
                      <Text style={styles.gridSubText}>123 Way, 4B</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.gridBtn}>
                    <Ionicons name="time-outline" size={18} color="#ec4913" />
                    <View style={styles.gridTextCenter}>
                      <Text style={[styles.gridTitle, styles.textDark]}>Period</Text>
                      <Text style={styles.gridSubText}>11h00-11h30</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.gridBtn}>
                    <Ionicons name="call-outline" size={18} color="#ec4913" />
                    <View style={styles.gridTextCenter}>
                      <Text style={[styles.gridTitle, styles.textDark]}>contact</Text>
                      <Text style={styles.gridSubText}>696080087</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.gridBtn}>
                    <Ionicons name="document-text-outline" size={18} color="#94a3b8" />
                    <View style={styles.gridTextCenter}>
                      <Text style={[styles.gridTitle, styles.textDark]}>Notes</Text>
                      <Text style={styles.gridSubText}>smal prt</Text>
                    </View>
                  </TouchableOpacity>
                  
                </View>
              </View>
            )}

            {activeTab !== 'detail' && (
              <View style={styles.placeholderContent}>
                <Text style={styles.textDark}>Coming soon: {activeTab}</Text>
              </View>
            )}
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View style={[styles.bottomActionBar, styles.actionBarLight]}>
            <View style={styles.priceSectionLeft}>
              <Text style={[styles.currencyText, styles.textDark]}>XAF {"\n"}{total}</Text>
            </View>

            <View style={[styles.counterContainer, styles.counterLight]}>
              <TouchableOpacity 
                style={styles.counterBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={18} color="black" />
              </TouchableOpacity>
              <Text style={[styles.counterText, styles.textDark]}>{quantity}</Text>
              <TouchableOpacity 
                style={[styles.counterBtn, styles.counterBtnAdd, styles.counterBtnAddLight]}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={18} color="black" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.addToCartBtn}>
              <Text style={styles.btnText}>add To Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buyBtn} onPress={handleConfirm}>
              <Ionicons name="cart-outline" size={16} color="white" />
              <Text style={styles.btnText}>buy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    height: 384,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetLight: {
    backgroundColor: 'white',
    borderColor: 'rgba(236, 73, 19, 0.1)',
  },
  tabsWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabsContent: {
    gap: 8,
  },
  tabChip: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: '#ec4913',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabChipInactiveLight: {
    backgroundColor: '#f1f5f9',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: 'white',
  },
  tabLabelInactiveLight: {
    color: '#475569',
  },
  contentScroll: {
    flex: 1,
  },
  detailContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  avatarImage: {
    height: 64,
    width: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'white',
  },
  sliderWrapper: {
    width: 64,
    alignItems: 'center',
    gap: 4,
  },
  imageList: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paginationDots: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: '#ec4913',
    width: 10,
  },
  dotInactive: {
    backgroundColor: '#cbd5e1',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  productDesc: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: 2,
  },
  textDark: { color: '#0f172a' },
  textGrayDark: { color: '#64748b' },
  priceChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginVertical: 4,
  },
  borderLight: { borderColor: '#f1f5f9' },
  sizeChip: {
    flex: 1,
    height: 54,
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sizeChipActive: {
    backgroundColor: 'rgba(236, 73, 19, 0.05)',
    borderColor: '#ec4913',
    borderWidth: 2,
  },
  sizeChipInactiveLight: {
    borderColor: '#e2e8f0',
    backgroundColor: 'transparent',
  },
  sizeLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  sizeLabelActive: { color: '#ec4913' },
  sizeLabelInactive: { color: '#94a3b8' },
  sizePrice: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 80,
  },
  gridBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16, // rounded-2xl
    alignItems: 'center',
    justifyContent: 'space-between',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 10,
    elevation: 2,
    backgroundColor: 'white', // Ensure light background
  },
  gridTextCenter: {
    alignItems: 'center',
    marginTop: 4,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ec4913',
    marginTop: 2,
    textAlign: 'center',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
  },
  actionBarLight: { backgroundColor: 'white', borderColor: '#f1f5f9' },
  priceSectionLeft: {
    flex: 1,
    alignItems: 'flex-start', // Justify left
    justifyContent: 'center',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    lineHeight: 14,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 9999,
    height: 48,
    backgroundColor: '#f1f5f9',
  },
  counterLight: { backgroundColor: '#f1f5f9' },
  counterBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  counterBtnAdd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    backgroundColor: 'white',
  },
  counterBtnAddLight: { backgroundColor: 'white' },
  counterText: {
    width: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  addToCartBtn: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#ec4913',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buyBtn: {
    flex: 1.2,
    height: 48,
    backgroundColor: '#ec4913',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#ec4913',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  placeholderContent: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
