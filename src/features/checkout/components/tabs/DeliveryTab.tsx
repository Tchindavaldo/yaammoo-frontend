import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Livraison } from '@/src/types';
import { styles } from '../CheckoutSheet.styles';

interface DeliveryTabProps {
  delivery: Livraison;
  setDelivery: (delivery: Livraison) => void;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({ delivery, setDelivery }) => {
  return (
    <View style={styles.deliveryContainer}>
      {/* Info Buttons Grid */}
      <View style={styles.infoGrid4}>
        <TouchableOpacity style={styles.infoBtnLarge}>
          <Ionicons name="location-outline" size={20} color="#ec4913" />
          <View style={styles.infoBtnText}>
            <Text style={[styles.infoBtnTitle, styles.textDark]}>Location</Text>
            <Text style={styles.infoBtnSubText}>{delivery.address || '123 Way, 4B'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoBtnLarge}>
          <Ionicons name="time-outline" size={20} color="#ec4913" />
          <View style={styles.infoBtnText}>
            <Text style={[styles.infoBtnTitle, styles.textDark]}>Period</Text>
            <Text style={styles.infoBtnSubText}>{delivery.hour || '11h00 - 11h30'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoBtnLarge}>
          <Ionicons name="call-outline" size={20} color="#ec4913" />
          <View style={styles.infoBtnText}>
            <Text style={[styles.infoBtnTitle, styles.textDark]}>contact</Text>
            <Text style={styles.infoBtnSubText}>696080087</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.infoBtnLarge}>
          <Ionicons name="document-text-outline" size={20} color="#94a3b8" />
          <View style={styles.infoBtnText}>
            <Text style={[styles.infoBtnTitle, styles.textDark]}>Notes</Text>
            <Text style={styles.infoBtnSubText}>smal prt</Text>
          </View>
        </TouchableOpacity>
      </View>

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
            <Text style={[styles.deliveryTypeTitle, styles.textDark]}>Express</Text>
            <Text style={[styles.deliveryTypeSubText, delivery.type === 'express' && { color: '#ec4913' }]}>15-25 min</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.deliveryTypeBtn, delivery.type === 'standard' && styles.deliveryTypeActive]}
          onPress={() => setDelivery({ ...delivery, statut: true, type: 'standard' })}
        >
          <Ionicons name="calendar-outline" size={22} color={delivery.type === 'standard' ? '#ec4913' : '#94a3b8'} />
          <View style={styles.deliveryTypeText}>
            <Text style={[styles.deliveryTypeTitle, styles.textDark]}>Heure</Text>
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
