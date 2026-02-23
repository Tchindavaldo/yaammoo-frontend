import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Menu, Embalage, Boisson, Livraison } from '@/src/types';
import { useCheckout } from '../hooks/useCheckout';

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
    selectedPackaging, setSelectedPackaging,
    selectedDrinks, setSelectedDrinks,
    delivery, setDelivery,
    availablePackaging,
    availableDrinks,
    availableHours,
    total, createOrder
  } = useCheckout(menu);

  const [activeTab, setActiveTab] = useState<CheckoutStep>('detail');

  if (!menu) return null;

  const handlePackagingToggle = (pkg: Embalage) => {
    setSelectedPackaging(prev =>
      prev.find(p => p.type === pkg.type) ? prev.filter(p => p.type !== pkg.type) : [...prev, pkg]
    );
  };

  const handleDrinkToggle = (drink: Boisson) => {
    setSelectedDrinks(prev =>
      prev.find(d => d.type === drink.type) ? prev.filter(d => d.type !== drink.type) : [...prev, drink]
    );
  };

  const updateDelivery = (updates: Partial<Livraison>) => {
    setDelivery(prev => ({ ...prev, ...updates } as Livraison));
  };

  const renderTabChip = (key: CheckoutStep, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.bottomTabChip, activeTab === key && { backgroundColor: 'transparent' }]}
      onPress={() => setActiveTab(key)}
    >
      <Text style={styles.bottomTabLabel}>{label}</Text>
      <Ionicons name={icon as any} size={14} color="white" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} activeOpacity={1} />
        
        {/* BOITE PRINCIPALE DU BOTTOM CARD */}
        <BlurView intensity={55} tint="dark" style={styles.sheetGrid}>
          
          {/* LIGNE 1 : HEADER (item1-cmd-bottom-card) */}
          {activeTab === 'detail' && (
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerImgCard}>
                  <Image source={menu.image ? { uri: menu.image } : require('@/assets/blur3.jpg')} style={styles.headerImg} />
                </View>
                <View style={styles.headerTitleBox}>
                  <Text style={styles.headerTitle} numberOfLines={1}>{menu.titre}</Text>
                  <Text style={styles.headerPrice}>{menu.prix1} f</Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity style={[styles.hChip, styles.hChipBuy]} onPress={() => {
                  const order = createOrder();
                  if (order) onConfirm(order);
                }}>
                  <Text style={styles.hChipText}>buy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.hChip, styles.hChipAdd]}>
                  <Text style={styles.hChipText}>Add To</Text>
                  <Ionicons name="cart-outline" size={14} color="white" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.hChip, styles.hChipClose]} onPress={onClose}>
                  <Ionicons name="close-outline" size={16} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* LIGNE 2 : CONTENT (Horizontal Scroll / Items) */}
          <View style={styles.contentRow}>
            
            {/* DETAIL */}
            {activeTab === 'detail' && (
              <View style={{ flexDirection: 'row', height: '100%', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                <View style={{ width: '70%', height: '100%', overflow: 'hidden', justifyContent: 'center' }}>
                   <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                     <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', width: '100%', rowGap: 8 }}>
                       {/* Dummy details mapping */}
                       {[1,2,3,4].map(i => (
                         <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, width: '48%' }}>
                         <View style={{ flexDirection: 'column', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
                            <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>500f</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 7, height: 15 }} numberOfLines={1}>detail</Text>
                         </View>

                         <Ionicons name="add-outline" size={14} color="white" style={{ backgroundColor: 'darkred', borderRadius: 12, padding: 3, overflow: 'hidden', marginLeft: 4 }} />
                       </View>
                     ))}
                     </View>
                   </ScrollView>
                </View>

                <View style={{ width: '28%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, justifyContent: 'space-around', paddingVertical: 10 }}>
                  <View style={{ alignItems: 'flex-start', width: '100%', paddingHorizontal: 15 }}>
                    <Text style={{ color: 'white', fontSize: 17, fontWeight: 'bold' }}>2</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>quantite</Text>
                  </View>
                  <View style={{ alignItems: 'flex-start', width: '100%', paddingHorizontal: 15 }}>
                    <Text style={{ color: 'white', fontSize: 17, fontWeight: 'bold' }}>{total}f</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Montant Total</Text>
                  </View>
                </View>
              </View>
            )}

            {/* EXTRAS */}
            {activeTab === 'extra' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                {availablePackaging.map(pkg => (
                  <TouchableOpacity key={pkg.type} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 25, marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' }} onPress={() => handlePackagingToggle(pkg)}>
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: 80 }}>
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>+{pkg.prix}f</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }} numberOfLines={1}>{pkg.type}</Text>
                    </View>
                    <Ionicons name={selectedPackaging.find(p=>p.type===pkg.type) ? "checkmark" : "add-outline"} size={14} color="white" style={[{ marginLeft: 15, backgroundColor: 'darkred', borderRadius: 12, padding: 3, overflow: 'hidden' }, selectedPackaging.find(p=>p.type===pkg.type) && { backgroundColor: 'white', color: 'darkred' }]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* DRINKS */}
            {activeTab === 'drink' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                <View style={{ flexDirection: 'column' }}>
                  <View style={{ flexDirection: 'row', paddingBottom: 5 }}>
                    {availableDrinks.map(drink => (
                      <TouchableOpacity key={drink.type} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 25, marginRight: 8, marginBottom: 8, alignSelf: 'flex-start' }} onPress={() => handleDrinkToggle(drink)}>
                        <View style={{ flexDirection: 'column', alignItems: 'flex-start', maxWidth: 80 }}>
                          <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{drink.prix}f</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }} numberOfLines={1}>{drink.type}</Text>
                        </View>
                        <Ionicons name={selectedDrinks.find(d=>d.type===drink.type) ? "checkmark" : "add-outline"} size={14} color="white" style={[{ marginLeft: 15, backgroundColor: 'darkred', borderRadius: 12, padding: 3, overflow: 'hidden' }, selectedDrinks.find(d=>d.type===drink.type) && { backgroundColor: 'white', color: 'darkred' }]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* DELIVERY */}
            {activeTab === 'delivery' && (
              <View style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%', paddingHorizontal: 10, justifyContent: 'space-between', marginTop: -15 }}>
                 {/* Column 1: Type (20%) */}
                 <View style={{ display: 'flex', flexDirection: 'column', width: '22%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 8, alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                   <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15, alignSelf: 'center', marginBottom: 2 }}>
                     <Text style={{ color: 'white', fontSize: 10 }}>Type</Text>
                     <Ionicons name="add-outline" size={10} color="white" style={{ backgroundColor: 'darkred', borderRadius: 10, padding: 2, marginLeft: 4, overflow: 'hidden' }} />
                   </View>

                   {[
                     { key: 'standard', label: 'heure' },
                     { key: 'express', label: 'express' },
                     { key: 'aucune', label: 'Aucune' },
                   ].map(t => (
                     <TouchableOpacity key={t.key} style={{ paddingHorizontal: 4, paddingVertical: 4, width: '90%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, alignItems: 'center', marginBottom: 4 }} onPress={() => updateDelivery({ type: t.key as any, statut: t.key !== 'aucune' })} >
                       <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                         <Ionicons name={delivery.type === t.key ? "checkbox" : "square-outline"} size={13} color="darkred" />
                         <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>{t.label}</Text>
                       </View>
                     </TouchableOpacity>
                   ))}
                 </View>

                 {/* Right Wrapper (76%) */}
                 <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', width: '76%', justifyContent: 'space-between', height: '100%' }}>
                   
                   <View style={{ display: 'flex', flexDirection: 'column', width: '46%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 8, alignItems: 'flex-start', justifyContent: 'space-between', height: '100%' }}>
                   <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15,  marginBottom: 2 }}>
                     <Text style={{ color: 'white', fontSize: 10 }}>Auj</Text>
                     <Ionicons name="add-outline" size={10} color="white" style={{ backgroundColor: 'darkred', borderRadius: 10, padding: 2, marginLeft: 4, overflow: 'hidden' }} />
                   </View>

                   {Array.from({ length: Math.ceil(availableHours.length / 2) }).map((_, rowIndex) => {
                     const h1 = availableHours[rowIndex * 2];
                     const h2 = availableHours[rowIndex * 2 + 1];
                     return (
                       <View key={rowIndex} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                         {h1 && (
                           <TouchableOpacity style={{ paddingHorizontal: 4, paddingVertical: 4, borderRadius: 15, alignItems: 'center', marginBottom: 4 }} onPress={() => updateDelivery({ hour: h1 })} >
                             <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                               <Ionicons name={delivery.hour === h1 ? "checkbox" : "square-outline"} size={13} color="darkred" />
                               <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>{h1}</Text>
                             </View>
                           </TouchableOpacity>
                         )}

                         {h2 ? (
                           <TouchableOpacity style={{ paddingHorizontal: 4, paddingVertical: 4, borderRadius: 15, alignItems: 'center', marginLeft: 8, marginBottom: 4 }} onPress={() => updateDelivery({ hour: h2 })} >
                             <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                               <Ionicons name={delivery.hour === h2 ? "checkbox" : "square-outline"} size={13} color="darkred" />
                               <Text style={{ color: 'white', fontSize: 10, marginTop: 2 }}>{h2}</Text>
                             </View>
                           </TouchableOpacity>
                         ) : (
                           <View style={{ paddingHorizontal: 4, paddingVertical: 4, width: 40, marginLeft: 8, marginBottom: 4 }} />
                         )}
                       </View>
                     );
                   })}
                   </View>

                   {/* Column 3: Location (52%) */}
                   <View style={{ display: 'flex', flexDirection: 'column', width: '52%', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, height: '100%', padding: 4 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, marginLeft: 2, marginTop: 2 }}>
                       <Text style={{ color: 'white', fontSize: 10 }}>Localisation</Text>
                       <Ionicons name="location-outline" size={10} color="white" style={{ backgroundColor: 'darkred', borderRadius: 10, padding: 2, marginLeft: 4, overflow: 'hidden' }} />
                     </View>
                     <TextInput
                        style={{ fontSize: 10, width: '90%', marginLeft: '5%', color: 'white', textAlignVertical: 'top', flex: 1, marginTop: 6 }}
                        placeholder="Entrer une description de votre lieu exemple:  Quartier Nkomo, après le marché central, à côté de la pharmacie du soleil, immeuble bleu à 3 étages, 2ème étage, porte 204"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        value={delivery.address}
                        onChangeText={(t) => updateDelivery({ address: t })}
                     />
                   </View>
                 </View>
              </View>
            )}
          </View>

          {/* LIGNE 3 : BOTTOM TABS */}
          <View style={styles.bottomTabsRow}>
             {renderTabChip('detail', 'Détail', 'list-outline')}
             {renderTabChip('extra', 'Extra', 'add-circle-outline')}
             {renderTabChip('drink', 'Boisson', 'wine-outline')}
             {renderTabChip('delivery', 'Livraison', 'bicycle-outline')}
          </View>

        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheetGrid: {
    width: '100%',
    height: 225, // FIXED HEIGHT from rudafood SCSS
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 45,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerImgCard: {
    width: 45,
    height: 45,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'black'
  },
  headerImg: {
    width: '100%',
    height: '100%'
  },
  headerTitleBox: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerPrice: {
    color: 'white',
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  hChip: {
    backgroundColor: 'darkred',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginLeft: 6,
    shadowColor: '#ff9d9d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },
  hChipBuy: {
    paddingHorizontal: 15,
  },
  hChipAdd: {
  },
  hChipClose: {
  },
  hChipText: {
    color: 'white',
    fontSize: 12,
  },
  contentRow: {
    flex: 1,
    width: '100%',
    marginTop: 15,
    marginBottom: 10,
  },
  detailContainer: {
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  detailLeft: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  horizontalScrollPadding: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  detailRight: {
    width: 110,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    justifyContent: 'space-around',
    paddingVertical: 10,
    alignItems: 'center'
  },
  cmdDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
  },
  cmdDetailIconRight: {
    marginLeft: 7,
    backgroundColor: 'darkred',
    borderRadius: 12,
    padding: 2,
    overflow: 'hidden'
  },
  cmdDetailT1: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cmdDetailT2: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  detailRightChip: {
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  drVal: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'left'
  },
  drLbl: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left'
  },
  deliveryContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  deliveryTypesCol: {
    width: Dimensions.get('window').width * 0.2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'space-around'
  },
  dTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dTypeLbl: {
    color: 'white',
    fontSize: 11,
    marginTop: 4,
  },
  deliveryRightWrapper: {
    flexDirection: 'row',
    width: Dimensions.get('window').width * 0.75,
    justifyContent: 'space-around',
    height: '100%',
    marginLeft: 10,
  },
  deliveryHoursBox: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 10,
    maxWidth: '50%',
    height: '100%',
    position: 'relative',
    marginRight: 5,
  },
  darkRedBadgeInlineSticky: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'darkred',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  badgePlusIcon: {
    marginLeft: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: 1,
    overflow: 'hidden'
  },
  hourChip: {
    margin: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center'
  },
  hourChipText: {
    color: 'white',
    fontSize: 11
  },
  deliveryLocBox: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 10,
    width: '47%',
    height: '100%',
  },
  darkRedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'darkred',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 5
  },
  dlOCInput: {
    flex: 1,
    color: 'white',
    fontSize: 11,
    textAlignVertical: 'top'
  },
  bottomTabsRow: {
    position: 'absolute',
    bottom: -2,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 15,
  },
  bottomTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  bottomTabLabel: {
    color: 'white',
    fontSize: 11,
  }
});
