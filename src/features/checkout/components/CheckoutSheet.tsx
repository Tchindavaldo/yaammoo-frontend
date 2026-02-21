import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Menu, Embalage, Boisson } from '@/src/types';
import { useCheckout } from '../hooks/useCheckout';

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  onConfirm: (order: any) => void;
}

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({ visible, onClose, menu, onConfirm }) => {
  const {
    quantity, setQuantity,
    selectedPackaging, setSelectedPackaging,
    selectedDrink, setSelectedDrink,
    delivery, setDelivery,
    total, createOrder
  } = useCheckout(menu);

  const [step, setStep] = useState<'details' | 'extras' | 'delivery'>('details');

  if (!menu) return null;

  const handlePackagingToggle = (pkg: Embalage) => {
    setSelectedPackaging(prev => 
      prev.find(p => p.type === pkg.type) 
        ? prev.filter(p => p.type !== pkg.type)
        : [...prev, pkg]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>{menu.titre}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Theme.colors.gray[400]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {step === 'details' && (
              <View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quantité</Text>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity 
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="remove" size={24} color={Theme.colors.dark} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity 
                      onPress={() => setQuantity(quantity + 1)}
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={24} color={Theme.colors.dark} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Emballage</Text>
                  <View style={styles.optionsRow}>
                    {[new Embalage('Sac', 100), new Embalage('Boîte', 200)].map(pkg => (
                      <TouchableOpacity 
                        key={pkg.type}
                        style={[
                          styles.optionBtn,
                          selectedPackaging.find(p => p.type === pkg.type) && styles.selectedOption
                        ]}
                        onPress={() => handlePackagingToggle(pkg)}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedPackaging.find(p => p.type === pkg.type) && styles.selectedOptionText
                        ]}>{pkg.type} (+{pkg.prix} F)</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Additional steps can be added here for Drinks and Delivery */}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{total} FCFA</Text>
            </View>
            <TouchableOpacity 
              style={styles.confirmBtn}
              onPress={() => onConfirm(createOrder())}
            >
              <Text style={styles.confirmBtnText}>Ajouter au panier</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    padding: Theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: Theme.colors.gray[300],
    borderRadius: 2.5,
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  closeBtn: {
    position: 'absolute',
    right: Theme.spacing.md,
    top: Theme.spacing.md + 10,
  },
  content: {
    padding: Theme.spacing.lg,
  },
  section: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.gray[800],
    marginBottom: Theme.spacing.md,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.gray[100],
    borderRadius: Theme.borderRadius.md,
    alignSelf: 'center',
  },
  qtyBtn: {
    padding: Theme.spacing.md,
  },
  qtyText: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: Theme.spacing.xl,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  optionBtn: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: Theme.colors.gray[600],
  },
  selectedOptionText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  footer: {
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[100],
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: Theme.colors.gray[500],
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  confirmBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  confirmBtnText: {
    color: Theme.colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
