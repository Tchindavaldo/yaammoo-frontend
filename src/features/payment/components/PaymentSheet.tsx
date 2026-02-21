import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { usePayment, PaymentStep } from '../hooks/usePayment';

interface PaymentSheetProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: () => void;
}

export const PaymentSheet: React.FC<PaymentSheetProps> = ({ visible, onClose, amount, onSuccess }) => {
  const {
    currentStep,
    phoneNumber,
    setPhoneNumber,
    loading,
    totalToPay,
    cashoutPercentage,
    feePercentage,
    nextStep,
    prevStep,
    processPayment
  } = usePayment(amount);

  const renderContent = () => {
    switch (currentStep) {
      case PaymentStep.CONFIRM:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Confirmer le paiement</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Montant principal</Text>
              <Text style={styles.priceValue}>{amount} F</Text>
            </View>
            <TouchableOpacity style={styles.mainBtn} onPress={nextStep}>
              <Text style={styles.btnText}>Payer</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        );

      case PaymentStep.BREAKDOWN:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Détails des frais</Text>
            <View style={styles.infoBox}>
              <View style={styles.row}>
                <Text>Frais de retrait ({cashoutPercentage}%)</Text>
                <Text>{Math.round(amount * 0.02)} F</Text>
              </View>
              <View style={styles.row}>
                <Text>Frais de transaction ({feePercentage}%)</Text>
                <Text>{Math.round(amount * 0.02)} F</Text>
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValue}>{totalToPay} F</Text>
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                <Text style={styles.backBtnText}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mainBtn, { flex: 1 }]} onPress={nextStep}>
                <Text style={styles.btnText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case PaymentStep.PHONE_INPUT:
        return (
          <View style={styles.content}>
            <Text style={styles.title}>Numéro Orange Money</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 690 00 00 00"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus
            />
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={prevStep}>
                <Text style={styles.backBtnText}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.mainBtn, { flex: 1, backgroundColor: Theme.colors.success }]} 
                onPress={processPayment}
                disabled={!phoneNumber}
              >
                <Text style={styles.btnText}>Valider le paiement</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case PaymentStep.INSTRUCTIONS:
        return (
          <View style={styles.content}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.instructionText}>
              Veuillez composer le #150# sur votre téléphone pour valider la transaction.
            </Text>
          </View>
        );

      case PaymentStep.SUCCESS:
        return (
          <View style={styles.content}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={50} color="white" />
            </View>
            <Text style={styles.successTitle}>Paiement réussi !</Text>
            <TouchableOpacity style={styles.mainBtn} onPress={() => { onSuccess(); onClose(); }}>
              <Text style={styles.btnText}>Terminé</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Ionicons name="close" size={24} color={Theme.colors.gray[400]} />
          </TouchableOpacity>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    minHeight: 250,
  },
  closeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Theme.colors.dark,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  priceLabel: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  mainBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    gap: 10,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoBox: {
    width: '100%',
    backgroundColor: Theme.colors.gray[50],
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.gray[200],
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    color: Theme.colors.success,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
    justifyContent: 'center',
  },
  backBtnText: {
    color: Theme.colors.gray[600],
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Theme.colors.gray[300],
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 25,
  },
  instructionText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: Theme.colors.gray[600],
    lineHeight: 22,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.success,
    marginBottom: 30,
  }
});
