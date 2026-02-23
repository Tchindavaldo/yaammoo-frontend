import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Commande } from '@/src/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MerchantOrderCardProps {
  order: Commande;
  onUpdateStatus: (status: 'active' | 'completed' | 'cancelled') => void;
}

export const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({ order, onUpdateStatus }) => {
  const [expanded, setExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<'menu' | 'extras' | 'drinks'>('menu');
  const [expandedText, setExpandedText] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const status = ((order as any).status || order.staut).toLowerCase();
  const isPending = status === 'pending' || status === 'pendingtobuy';
  const isActive = status === 'active' || status === 'processing' || status === 'in_progress';

  const totalPrice = (order.prixTotal || (order as any).total || 0);

  const userData = (order as any).userData || {};
  const firstName = userData.firstName || userData.prenom || '';
  const lastName = userData.lastName || userData.nom || '';
  const email = userData.email || 'Utilisateur';
  const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : email;
  const userRank = (order as any).rank || 1;

  const menuName = order.menu?.titre || (order.menu as any)?.name || '—';

  const extras = (order as any).extra || order.embalage || [];
  const extrasToShow = Array.isArray(extras) ? extras : [];
  const hasExtras = extrasToShow.some((x: any) => x.status !== false);

  const drinks = (order as any).drink || [order.boisson];
  const drinksToShow = Array.isArray(drinks) ? drinks : [];
  const hasDrinks = drinksToShow.some((x: any) => x.status !== false);

  const deliveryRaw = (order as any).delivery;
  const hasDelivery = deliveryRaw?.status === true;
  const deliveryStr = order.livraison?.address || deliveryRaw?.location || 'Non spécifié';

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.wrapper}>
      {/* ─── COLLAPSED / SUMMARY ROW ─── */}
      <TouchableOpacity activeOpacity={0.85} onPress={toggleExpand} style={styles.summaryRow}>
        {/* Avatar + Nom */}
        <Ionicons name="person-circle" size={36} color="#92949c" />
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            <Text style={styles.summaryPrice}>{totalPrice} fcfa</Text>
            {'  ·  '}
            <Text>{menuName}</Text>
          </Text>
        </View>

        {/* Badges rapides */}
        <View style={styles.summaryBadges}>
          <View style={[styles.badge, { backgroundColor: hasExtras ? '#16a34a' : '#6b7280' }]}>
            <Ionicons name="fast-food-outline" size={9} color="white" />
          </View>
          <View style={[styles.badge, { backgroundColor: hasDrinks ? '#0284c7' : '#6b7280' }]}>
            <Ionicons name="beer-outline" size={9} color="white" />
          </View>
          <View style={[styles.badge, { backgroundColor: hasDelivery ? '#dc2626' : '#6b7280' }]}>
            <Ionicons name="navigate-outline" size={9} color="white" />
          </View>
        </View>

        {/* Rang + flèche */}
        <View style={styles.summaryRight}>
          <Text style={styles.summaryRank}>#{userRank}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#dc2626" />
        </View>
      </TouchableOpacity>

      {/* ─── EXPANDED FULL CARD ─── */}
      {expanded && (
        <View style={styles.fastFoodOrderCard}>

          {/* Chips tabs */}
          <View style={styles.chipsRow}>
            <View style={{ flexDirection: 'row', flex: 1, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={[styles.smallChip, activePanel === 'menu' ? styles.chipActive : styles.chipInactive]}
                onPress={() => setActivePanel('menu')}
              >
                <Ionicons name="restaurant-outline" size={12} color={activePanel === 'menu' ? 'white' : '#ccc'} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, { color: activePanel === 'menu' ? 'white' : '#ccc' }]}>Menu</Text>
              </TouchableOpacity>

              {extrasToShow.length > 0 && (
                <TouchableOpacity
                  style={[styles.smallChip, activePanel === 'extras' ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setActivePanel('extras')}
                >
                  <Ionicons name="fast-food-outline" size={12} color={activePanel === 'extras' ? 'white' : '#ccc'} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: activePanel === 'extras' ? 'white' : '#ccc' }]}>Extras +{extrasToShow.length}</Text>
                </TouchableOpacity>
              )}

              {drinksToShow.length > 0 && (
                <TouchableOpacity
                  style={[styles.smallChip, activePanel === 'drinks' ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setActivePanel('drinks')}
                >
                  <Ionicons name="beer-outline" size={12} color={activePanel === 'drinks' ? 'white' : '#ccc'} style={{ marginRight: 4 }} />
                  <Text style={[styles.chipText, { color: activePanel === 'drinks' ? 'white' : '#ccc' }]}>Boisson +{drinksToShow.length}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Boutons action circulaires */}
            <View style={styles.actionButtonsRight}>
              {isActive && (
                <TouchableOpacity style={[styles.roundActionBtn, { backgroundColor: '#8b0000', opacity: 0.5 }]} disabled>
                  <Ionicons name="arrow-back-outline" size={16} color="white" />
                </TouchableOpacity>
              )}
              {(isPending || isActive) && (
                <TouchableOpacity
                  style={[styles.roundActionBtn, { backgroundColor: 'darkred' }]}
                  onPress={() => setShowCancelModal(true)}
                >
                  <Ionicons name="close-outline" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Modal annulation inline */}
          {showCancelModal && (
            <View style={styles.cancelModalContainer}>
              <Text style={styles.cancelModalText}>Voulez-vous annuler cette commande ?</Text>
              <View style={styles.cancelModalActions}>
                <TouchableOpacity style={styles.cancelBtnNo} onPress={() => setShowCancelModal(false)}>
                  <Text style={styles.cancelBtnLabel}>Non</Text>
                  <Ionicons name="close-circle-outline" size={12} color="white" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtnYes} onPress={() => { setShowCancelModal(false); onUpdateStatus('cancelled'); }}>
                  <Text style={styles.cancelBtnLabel}>Oui</Text>
                  <Ionicons name="checkmark-circle-outline" size={12} color="white" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Panneau Menu */}
          {activePanel === 'menu' && (
            <View>
              {/* Prix */}
              <View style={styles.walletRow}>
                <Ionicons name="wallet-outline" size={16} color="#ccc" style={{ marginRight: 6 }} />
                <Text style={styles.walletText}>{totalPrice} fcfa</Text>
              </View>

              {/* Nom menu + btn valider alignés */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedText(!expandedText)}
                    style={styles.menuNameRow}
                  >
                    <Ionicons name="restaurant-outline" size={14} color="#ccc" style={[styles.menuIcon, expandedText && { opacity: 0 }]} />
                    <Text style={styles.nomCmdUser} numberOfLines={expandedText ? undefined : 1}>{menuName}</Text>
                  </TouchableOpacity>

                  <View style={styles.deliveryRow}>
                    <Ionicons name="navigate-outline" size={14} color="#ff3838" style={{ marginRight: 6, marginTop: 2 }} />
                    <Text style={styles.deliveryText} numberOfLines={2}>
                      <Text style={styles.deliveryLabel}>Livraison: </Text>
                      {deliveryStr}
                    </Text>
                  </View>
                </View>

                <View style={styles.ctnAdd}>
                  {isPending && (
                    <TouchableOpacity style={styles.validateChip} onPress={() => onUpdateStatus('active')}>
                      <Text style={styles.validateChipText}>valider</Text>
                    </TouchableOpacity>
                  )}
                  {isActive && (
                    <TouchableOpacity style={styles.validateChip} onPress={() => onUpdateStatus('completed')}>
                      <Text style={styles.validateChipText}>Terminer</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Panneau Extras */}
          {activePanel === 'extras' && (
            <View style={{ minHeight: 60 }}>
              {extrasToShow.map((ex: any, i: number) => (
                <View key={i} style={styles.extraItem}>
                  <Text style={styles.extraText}>{ex.name || ex.type}</Text>
                  <View style={[styles.itemStatusDot, ex.status === false && styles.itemStatusDotRed]}>
                    <Ionicons name={ex.status !== false ? 'checkmark' : 'close'} size={10} color="white" />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Panneau Boissons */}
          {activePanel === 'drinks' && (
            <View style={{ minHeight: 60 }}>
              {drinksToShow.map((dr: any, i: number) => (
                <View key={i} style={styles.extraItem}>
                  <Text style={styles.extraText}>{dr.name || dr.type}</Text>
                  <View style={[styles.itemStatusDot, dr.status === false && styles.itemStatusDotRed]}>
                    <Ionicons name={dr.status !== false ? 'checkmark' : 'close'} size={10} color="white" />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const RED = 'hsl(0, 100%, 15%)';
const RED_BORDER = 'hsl(0, 80%, 25%)';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0d8d8',
    backgroundColor: 'white',
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── SUMMARY ROW ──
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    gap: 8,
  },
  summaryInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  summaryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  summaryMeta: {
    fontSize: 11,
    color: '#666',
  },
  summaryPrice: {
    color: '#dc2626',
    fontWeight: '800',
  },
  summaryBadges: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRight: {
    alignItems: 'center',
    marginLeft: 6,
    gap: 2,
  },
  summaryRank: {
    fontSize: 10,
    fontWeight: '900',
    color: '#dc2626',
  },

  // ── EXPANDED CARD ──
  fastFoodOrderCard: {
    backgroundColor: RED,
    borderTopWidth: 1,
    borderTopColor: RED_BORDER,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  chipsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  smallChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 5,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: 'black',
    shadowColor: 'rgb(45, 213, 91)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  roundActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // Cancel modal inline
  cancelModalContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelModalText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    flex: 1,
    marginRight: 8,
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtnNo: {
    backgroundColor: 'darkred',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cancelBtnYes: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cancelBtnLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  // Menu panel
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  walletText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ccc',
  },
  menuNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  menuIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  nomCmdUser: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ccc',
    lineHeight: 18,
    flex: 1,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    width: '100%',
  },
  deliveryText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
    flex: 1,
  },
  deliveryLabel: {
    fontWeight: '900',
    color: '#ff3838',
  },
  ctnAdd: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    minWidth: 60,
  },
  validateChip: {
    backgroundColor: 'black',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  validateChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.1,
  },

  // Extras / Drinks panel
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  extraText: {
    fontSize: 12,
    color: '#e2e8f0',
    flex: 1,
  },
  itemStatusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10b981',
    borderWidth: 1,
    borderColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  itemStatusDotRed: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
});
