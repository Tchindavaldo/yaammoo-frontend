import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../theme';
import { Commande } from '@/src/types';

interface OrderCardProps {
  order: Commande;
  onDelete?: (id: string) => void;
  onUpdateQuantity?: (id: string, newQty: number) => void;
  showActions?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  onDelete, 
  onUpdateQuantity,
  showActions = true 
}) => {
  const [activePanel, setActivePanel] = useState<'menu' | 'extra' | 'drink'>('menu');
  
  const isPending = order.staut === 'pendingToBuy';

  const handleDelete = () => {
    Alert.alert(
      'Annuler la commande',
      'Voulez-vous vraiment retirer cet article du panier ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui, retirer', style: 'destructive', onPress: () => onDelete?.(order.idCmd) }
      ]
    );
  };

  return (
    <View style={styles.outerContainer}>
      <View style={styles.cardContainer}>
        {/* Row 1: Segment Chips & Action Buttons */}
        <View style={styles.headerRow}>
          <View style={styles.chipScroll}>
             <TouchableOpacity 
               style={[styles.segmentChip, activePanel === 'menu' && styles.activeChip]}
               onPress={() => setActivePanel('menu')}
             >
                <Ionicons name="restaurant-outline" size={14} color={activePanel === 'menu' ? 'white' : 'black'} />
                <Text style={[styles.chipLabel, activePanel === 'menu' && styles.activeChipLabel]}>Menu</Text>
             </TouchableOpacity>

             {(order.embalage && order.embalage.length > 0) && (
               <TouchableOpacity 
                 style={[styles.segmentChip, activePanel === 'extra' && styles.activeChip]}
                 onPress={() => setActivePanel('extra')}
               >
                  <Ionicons name="fast-food-outline" size={14} color={activePanel === 'extra' ? 'white' : 'black'} />
                  <Text style={[styles.chipLabel, activePanel === 'extra' && styles.activeChipLabel]}>Extras +{order.embalage.length}</Text>
               </TouchableOpacity>
             )}

             {(order.boisson && order.boisson.type !== 'Aucune') && (
               <TouchableOpacity 
                 style={[styles.segmentChip, activePanel === 'drink' && styles.activeChip]}
                 onPress={() => setActivePanel('drink')}
               >
                  <Ionicons name="beer-outline" size={14} color={activePanel === 'drink' ? 'white' : 'black'} />
                  <Text style={[styles.chipLabel, activePanel === 'drink' && styles.activeChipLabel]}>Boisson +1</Text>
               </TouchableOpacity>
             )}
          </View>

          {showActions && isPending && (
            <View style={styles.actionButtons}>
               <TouchableOpacity style={styles.roundBtn} onPress={() => {}}>
                  <Ionicons name="arrow-back-outline" size={16} color="white" />
               </TouchableOpacity>
               <TouchableOpacity style={[styles.roundBtn, { marginLeft: 8 }]} onPress={handleDelete}>
                  <Ionicons name="close-outline" size={16} color="white" />
               </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content Area */}
        <View style={styles.contentBody}>
           {activePanel === 'menu' && (
             <View>
               {/* Total Price */}
               <View style={styles.infoRow}>
                 <Ionicons name="wallet-outline" size={14} color="black" />
                 <Text style={styles.infoText}>{order.prixTotal} fcfa</Text>
               </View>

               {/* Menu Name */}
               <View style={styles.infoRow}>
                 <Ionicons name="restaurant-outline" size={14} color="black" />
                 <Text style={[styles.infoText, { fontWeight: 'bold' }]} numberOfLines={1}>
                   {order.menu.titre}
                 </Text>
               </View>

               {/* Delivery Location */}
               <View style={styles.infoRow}>
                 <Ionicons name="navigate-outline" size={14} color="red" />
                 <Text style={styles.addressLabel}>Livraison:</Text>
                 <Text style={styles.addressText} numberOfLines={1}>
                   {order.livraison?.address || 'Quartier Nkomo, Cameroun'}
                 </Text>
               </View>
             </View>
           )}

           {activePanel === 'extra' && (
             <View style={styles.panelContent}>
               {order.embalage?.map((e, i) => (
                 <Text key={i} style={styles.panelItem}>• {e.type} ({e.prix}F)</Text>
               ))}
             </View>
           )}

           {activePanel === 'drink' && (
             <View style={styles.panelContent}>
               <Text style={styles.panelItem}>• {order.boisson?.type} ({order.boisson?.prix}F)</Text>
             </View>
           )}
        </View>

        {/* Quantity Selector (Bottom Right) */}
        {showActions && isPending && (
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
               style={styles.quantityChip}
               onPress={() => {}} // Ces actions devront être liées aux props de mise à jour
            >
               <TouchableOpacity onPress={() => order.quantite > 1 && onUpdateQuantity?.(order.idCmd, order.quantite - 1)}>
                <Ionicons name="remove-circle" size={24} color="white" />
               </TouchableOpacity>
               <Text style={styles.quantityText}>{order.quantite || 1}</Text>
               <TouchableOpacity onPress={() => onUpdateQuantity?.(order.idCmd, order.quantite + 1)}>
                <Ionicons name="add-circle" size={24} color="white" />
               </TouchableOpacity>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 15,
    marginBottom: 26,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 10,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35,
  },
  chipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  segmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 6,
    transform: [{ scale: 0.95 }],
  },
  activeChip: {
    backgroundColor: '#2dd36f', // Ionic success color
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
    color: 'black',
  },
  activeChipLabel: {
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'darkred',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBody: {
    paddingLeft: 5,
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    marginLeft: 8,
    color: 'black',
  },
  addressLabel: {
    fontSize: 11,
    color: 'red',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  panelContent: {
    paddingVertical: 10,
  },
  panelItem: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
  },
  quantityContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  quantityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'darkred',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopLeftRadius: 20,
    gap: 8,
  },
  quantityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 15,
    textAlign: 'center',
  },
});
