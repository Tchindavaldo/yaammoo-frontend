import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
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
      prev.find(p => p.type === pkg.type)
        ? prev.filter(p => p.type !== pkg.type)
        : [...prev, pkg]
    );
  };

  const handleDrinkToggle = (drink: Boisson) => {
    setSelectedDrinks(prev =>
      prev.find(d => d.type === drink.type)
        ? prev.filter(d => d.type !== drink.type)
        : [...prev, drink]
    );
  };

  const updateDelivery = (updates: Partial<Livraison>) => {
    setDelivery(prev => ({ ...prev, ...updates } as Livraison));
  };

  const renderTab = (key: CheckoutStep, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === key && styles.activeTab]}
      onPress={() => setActiveTab(key)}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={activeTab === key ? Theme.colors.primary : Theme.colors.gray[400]}
      />
      <Text style={[styles.tabLabel, activeTab === key && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>{menu.titre}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.gray[400]} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* PANNEAU DETAIL */}
              {activeTab === 'detail' && (
                <View style={styles.panel}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quantité</Text>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        onPress={() => setQuantity(Math.max(1, quantity - 1))}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="remove" size={24} color="white" />
                      </TouchableOpacity>
                      <View style={styles.qtyDisplay}>
                        <Text style={styles.qtyNum}>{quantity}</Text>
                        <Text style={styles.qtyLbl}>portion{quantity > 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setQuantity(quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Ionicons name="add" size={24} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoVal}>{menu.prix1} F</Text>
                      <Text style={styles.infoLbl}>Prix Unitaire</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={[styles.infoVal, { color: Theme.colors.primary }]}>{total} F</Text>
                      <Text style={styles.infoLbl}>Sous-total</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* PANNEAU EXTRAS (Packaging) */}
              {activeTab === 'extra' && (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>Emballage & Suppléments</Text>
                  <View style={styles.optionsList}>
                    {availablePackaging.map(pkg => (
                      <TouchableOpacity
                        key={pkg.type}
                        style={[
                          styles.optionCard,
                          selectedPackaging.find(p => p.type === pkg.type) && styles.selectedCard
                        ]}
                        onPress={() => handlePackagingToggle(pkg)}
                      >
                        <View style={styles.optionInfo}>
                          <Text style={[
                            styles.optionName,
                            selectedPackaging.find(p => p.type === pkg.type) && styles.selectedText
                          ]}>{pkg.type}</Text>
                          <Text style={styles.optionPrice}>+{pkg.prix} F</Text>
                        </View>
                        <Ionicons
                          name={selectedPackaging.find(p => p.type === pkg.type) ? "checkbox" : "square-outline"}
                          size={24}
                          color={selectedPackaging.find(p => p.type === pkg.type) ? Theme.colors.primary : Theme.colors.gray[300]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* PANNEAU BOISSONS */}
              {activeTab === 'drink' && (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>Boissons fraîches</Text>
                  <View style={styles.drinkGrid}>
                    {availableDrinks.map(drink => (
                      <TouchableOpacity
                        key={drink.type}
                        style={[
                          styles.drinkCard,
                          selectedDrinks.find(d => d.type === drink.type) && styles.selectedDrinkCard
                        ]}
                        onPress={() => handleDrinkToggle(drink)}
                      >
                        <View style={styles.drinkIcon}>
                          <Ionicons
                            name="wine-outline"
                            size={20}
                            color={selectedDrinks.find(d => d.type === drink.type) ? "white" : Theme.colors.gray[400]}
                          />
                        </View>
                        <Text style={[
                          styles.drinkName,
                          selectedDrinks.find(d => d.type === drink.type) && styles.selectedDrinkText
                        ]}>{drink.type}</Text>
                        <Text style={styles.drinkPrice}>{drink.prix} F</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* PANNEAU LIVRAISON */}
              {activeTab === 'delivery' && (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>Options de Livraison</Text>

                  {/* Type */}
                  <View style={styles.deliveryTypes}>
                    {[
                      { key: 'standard', label: 'Standard (500F)', icon: 'bicycle-outline' },
                      { key: 'express', label: 'Express (1000F)', icon: 'flash-outline' },
                      { key: 'aucune', label: 'Sur place', icon: 'restaurant-outline' },
                    ].map(t => (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.typeCard,
                          delivery.type === t.key && styles.selectedTypeCard
                        ]}
                        onPress={() => updateDelivery({ type: t.key as any, statut: t.key !== 'aucune' })}
                      >
                        <Ionicons
                          name={t.icon as any}
                          size={18}
                          color={delivery.type === t.key ? "white" : Theme.colors.gray[500]}
                        />
                        <Text style={[styles.typeText, delivery.type === t.key && styles.selectedTypeText]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Heure */}
                  {delivery.type !== 'aucune' && (
                    <>
                      <Text style={styles.subTitle}>Heure souhaitée</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
                        {availableHours.map(h => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.hourChip, delivery.hour === h && styles.selectedHour]}
                            onPress={() => updateDelivery({ hour: h })}
                          >
                            <Text style={[styles.hourText, delivery.hour === h && styles.selectedText]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.subTitle}>Adresse de livraison</Text>
                      <TextInput
                        style={styles.addressInput}
                        placeholder="Ex: Quartier Nkomo, immeuble bleu porte 204..."
                        multiline
                        numberOfLines={3}
                        value={delivery.address}
                        onChangeText={(text) => updateDelivery({ address: text })}
                      />
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>

          {/* Tabs Navigation */}
          <View style={styles.tabsContainer}>
            {renderTab('detail', 'Détail', 'list-outline')}
            {renderTab('extra', 'Extra', 'add-circle-outline')}
            {renderTab('drink', 'Boisson', 'wine-outline')}
            {renderTab('delivery', 'Livraison', 'bicycle-outline')}
          </View>

          {/* Footer - Final confirm */}
          <BlurView intensity={80} tint="light" style={styles.footer}>
            <View style={styles.totalBlock}>
              <Text style={styles.totalLbl}>Total à payer</Text>
              <Text style={styles.totalVal}>{total} F</Text>
            </View>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                const order = createOrder();
                if (order) onConfirm(order);
              }}
            >
              <Text style={styles.confirmBtnText}>Commander</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    padding: Theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Theme.colors.gray[200],
    borderRadius: 2,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 25,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
  },
  panel: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.gray[600],
    marginTop: 16,
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginTop: 10,
  },
  qtyBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  qtyDisplay: {
    alignItems: 'center',
  },
  qtyNum: {
    fontSize: 42,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  qtyLbl: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    marginTop: -5,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: Theme.colors.gray[50],
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  infoVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  infoLbl: {
    fontSize: 11,
    color: Theme.colors.gray[500],
    marginTop: 4,
    textTransform: 'uppercase',
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.gray[50],
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: Theme.colors.primary,
    backgroundColor: Theme.colors.primary + '05',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.dark,
  },
  selectedText: {
    color: Theme.colors.primary,
  },
  optionPrice: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  drinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  drinkCard: {
    width: '31%',
    backgroundColor: Theme.colors.gray[50],
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  selectedDrinkCard: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  drinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  drinkName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: Theme.colors.gray[700],
  },
  selectedDrinkText: {
    color: 'white',
  },
  drinkPrice: {
    fontSize: 10,
    color: Theme.colors.gray[400],
    marginTop: 4,
  },
  deliveryTypes: {
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.gray[50],
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
  },
  selectedTypeCard: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.gray[700],
  },
  selectedTypeText: {
    color: 'white',
  },
  hourScroll: {
    marginTop: 4,
  },
  hourChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Theme.colors.gray[100],
    marginRight: 10,
  },
  selectedHour: {
    backgroundColor: Theme.colors.primary,
  },
  hourText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.gray[600],
  },
  addressInput: {
    backgroundColor: Theme.colors.gray[50],
    borderWidth: 1,
    borderColor: Theme.colors.gray[200],
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.primary,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.gray[400],
  },
  activeTabLabel: {
    color: Theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
  },
  totalBlock: {
    gap: 2,
  },
  totalLbl: {
    fontSize: 12,
    color: Theme.colors.gray[500],
  },
  totalVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
