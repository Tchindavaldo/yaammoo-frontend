import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Livraison } from '@/src/types';
import { styles } from '../CheckoutSheet.styles';
import { StyleSheet } from 'react-native';

interface DeliveryTabProps {
  delivery: Livraison;
  setDelivery: (delivery: Livraison) => void;
  onOpenLocation?: () => void;
  onOpenContact?: () => void;
  onOpenPeriod?: () => void;
  onOpenVoiceNote?: () => void;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({ delivery, setDelivery, onOpenLocation, onOpenContact, onOpenPeriod, onOpenVoiceNote }) => {
  const isLocationFilled = !!delivery.address;
  const isPeriodFilled = !!delivery.hour;
  const isContactFilled = !!delivery.phone;
  const isVoiceNoteFilled = !!delivery.voiceNoteUri;

  const getBtnStyle = (filled: boolean) => [
    styles.infoBtnLarge,
    filled && { borderColor: '#ec4913', borderWidth: 2, backgroundColor: 'rgba(236, 73, 19, 0.05)' }
  ];

  const getIconColor = (filled: boolean) => filled ? '#ec4913' : '#94a3b8';
  const getTextColor = (filled: boolean) => filled ? '#ec4913' : '#0f172a';

  const deliveryType = delivery.type;
  const showCards = deliveryType === 'express' || deliveryType === 'standard';
  const showPeriod = deliveryType === 'standard';

  return (
    <View style={styles.deliveryContainer}>
      {/* Info Buttons Grid — conditionnel selon le type */}
      {showCards && (
        <View style={deliveryType === 'express' ? localStyles.infoGrid3 : styles.infoGrid4}>
          <TouchableOpacity style={getBtnStyle(isLocationFilled)} onPress={onOpenLocation}>
            <Ionicons name="location-outline" size={20} color={getIconColor(isLocationFilled)} />
            <View style={styles.infoBtnText}>
              <Text style={[styles.infoBtnTitle, { color: getTextColor(isLocationFilled) }]}>Location</Text>
            </View>
          </TouchableOpacity>

          {showPeriod && (
            <TouchableOpacity style={getBtnStyle(isPeriodFilled)} onPress={onOpenPeriod}>
              <Ionicons name="time-outline" size={20} color={getIconColor(isPeriodFilled)} />
              <View style={styles.infoBtnText}>
                <Text style={[styles.infoBtnTitle, { color: getTextColor(isPeriodFilled) }]}>Period</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={getBtnStyle(isContactFilled)} onPress={onOpenContact}>
            <Ionicons name="call-outline" size={20} color={getIconColor(isContactFilled)} />
            <View style={styles.infoBtnText}>
              <Text style={[styles.infoBtnTitle, { color: getTextColor(isContactFilled) }]}>Contact</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={getBtnStyle(isVoiceNoteFilled)} onPress={onOpenVoiceNote}>
            <Ionicons name="mic-outline" size={20} color={getIconColor(isVoiceNoteFilled)} />
            <View style={styles.infoBtnText}>
              <Text style={[styles.infoBtnTitle, { color: getTextColor(isVoiceNoteFilled) }]}>Voice Notes</Text>
            </View>
          </TouchableOpacity>

          {deliveryType === 'express' && (
            <View style={localStyles.expressInfoBanner}>
              <Ionicons name="flash-outline" size={14} color="#ec4913" />
              <Text style={localStyles.expressInfoText}>Commande livrée dès que terminée</Text>
            </View>
          )}
        </View>
      )}

      {deliveryType === 'aucune' && (
        <View style={localStyles.aucuneBanner}>
          <Ionicons name="storefront-outline" size={20} color="#64748b" />
          <Text style={localStyles.aucuneText}>Vous passerez en boutique récupérer votre commande</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Select Type</Text>
      </View>

      <View style={styles.deliveryTypeGrid}>
        <TouchableOpacity 
          style={[styles.deliveryTypeBtn, delivery.type === 'express' && styles.deliveryTypeActive]}
          onPress={() => setDelivery({ ...delivery, statut: true, type: 'express' })}
        >
          <Ionicons name="flash-outline" size={22} color={delivery.type === 'express' ? '#ec4913' : '#94a3b8'} />
          <View style={styles.deliveryTypeText}>
            <Text style={[styles.deliveryTypeTitle, styles.textDark]}>Express (1000F)</Text>
            <Text style={[styles.deliveryTypeSubText, delivery.type === 'express' && { color: '#ec4913' }]}>15-25 min</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deliveryTypeBtn, delivery.type === 'standard' && styles.deliveryTypeActive]}
          onPress={() => setDelivery({ ...delivery, statut: true, type: 'standard' })}
        >
          <Ionicons name="calendar-outline" size={22} color={delivery.type === 'standard' ? '#ec4913' : '#94a3b8'} />
          <View style={styles.deliveryTypeText}>
            <Text style={[styles.deliveryTypeTitle, styles.textDark]}>Heure (500F)</Text>
            <Text style={[styles.deliveryTypeSubText, delivery.type === 'standard' && { color: '#ec4913' }]}>Scheduled</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deliveryTypeBtn, delivery.type === 'aucune' && styles.deliveryTypeActive]}
          onPress={() => setDelivery({ ...delivery, statut: false, type: 'aucune' })}
        >
          <Ionicons name="remove-circle-outline" size={22} color={delivery.type === 'aucune' ? '#ec4913' : '#94a3b8'} />
          <View style={styles.deliveryTypeText}>
            <Text style={[styles.deliveryTypeTitle, styles.textDark]}>Aucun</Text>
            <Text style={[styles.deliveryTypeSubText, delivery.type === 'aucune' && { color: '#ec4913' }]}>No rush</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  infoGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  aucuneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  aucuneText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  expressInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(236, 73, 19, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    width: '100%',
    marginTop: 4,
  },
  expressInfoText: {
    fontSize: 12,
    color: '#ec4913',
    fontStyle: 'italic',
  },
});
