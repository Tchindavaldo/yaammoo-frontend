import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { AddMenuSheetMultiStep } from './AddMenuSheetMultiStep';
import axios from 'axios';
import { Config } from '@/src/api/config';
import Svg, { Path, G } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type MenuManageTab = 'list' | 'dispo' | 'modif' | 'supp';

interface MenuManagePanelProps {
  menus: any[];
  onRefresh: () => void;
  onAddMenu: (menu: any) => Promise<void>;
  loading?: boolean;
}

export const MenuManagePanel: React.FC<MenuManagePanelProps> = ({
  menus,
  onRefresh,
  onAddMenu,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<MenuManageTab>('list');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState<'available' | 'unavailable' | 'delete'>('delete');
  const [menuToConfirm, setMenuToConfirm] = useState<any>(null);
  
  const slideAnim = React.useRef(new Animated.Value(230)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (confirmModalVisible) {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 230, duration: 300, useNativeDriver: true }).start();
      spinAnim.stopAnimation();
    }
  }, [confirmModalVisible]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const stats = {
    total: menus.length,
    available: menus.filter((m) => m.status === 'available' || m.disponibilite === 'available' || m.disponibilite === 'Disponible').length,
    unavailable: menus.filter((m) => m.status === 'unavailable' || m.disponibilite === 'unavailable' || m.disponibilite === 'Indisponible').length,
  };

  const openConfirmModal = (menu: any, actionType: 'available' | 'unavailable' | 'delete') => {
    setMenuToConfirm(menu);
    setConfirmActionType(actionType);
    setConfirmModalVisible(true);
  };

  const closeConfirmModal = () => {
    setConfirmModalVisible(false);
    setTimeout(() => {
      setMenuToConfirm(null);
      setUpdatingId(null);
    }, 300);
  };

  const executeConfirmAction = async () => {
    if (!menuToConfirm) return;
    setUpdatingId(menuToConfirm._id || menuToConfirm.id);
    
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    try {
      const id = menuToConfirm._id || menuToConfirm.id;
      if (confirmActionType === 'available' || confirmActionType === 'unavailable') {
        await axios.patch(`${Config.apiUrl}/menu/${id}`, { status: confirmActionType });
      } else if (confirmActionType === 'delete') {
        await axios.delete(`${Config.apiUrl}/menu/${id}`);
      }
      onRefresh();
      closeConfirmModal();
    } catch (error) {
      setUpdatingId(null);
      spinAnim.stopAnimation();
      alert('Erreur: Impossible d\'effectuer cette action');
    }
  };

  const startEdit = (menu: any) => {
    setEditingMenu(menu);
    setShowAddMenu(true);
  };

  const handleSave = async (menuData: any) => {
    if (editingMenu) {
      // modification
      await axios.put(`${Config.apiUrl}/menu/${editingMenu._id || editingMenu.id}`, menuData);
      onRefresh();
      setEditingMenu(null);
    } else {
      await onAddMenu(menuData);
    }
    setShowAddMenu(false);
  };

  const tabs: { key: MenuManageTab; label: string; icon: string }[] = [
    { key: 'list', label: 'Menu du jour', icon: 'calendar-outline' },
    { key: 'dispo', label: 'Disponibilité', icon: 'checkmark-circle-outline' },
    { key: 'modif', label: 'Modification', icon: 'create-outline' },
    { key: 'supp', label: 'Suppression', icon: 'trash-outline' },
  ];

  const renderMenuCard = (item: any, index: number, mode: 'dispo' | 'modif' | 'supp' | 'list') => {
    const name = item.name || item.titre || 'Menu';
    const status = item.status || (item.disponibilite === 'Disponible' ? 'available' : item.disponibilite === 'Indisponible' ? 'unavailable' : 'available');
    const isAvailable = status === 'available';
    const prix = item.prices?.[0]?.price || item.prix1 || 0;

    let iconName = 'trash-outline';
    if (mode === 'modif') iconName = 'create-outline';

    const showCheck = mode === 'dispo';

    return (
      <View style={styles.menuItemContainer}>
        <View style={styles.rRow}>
          <View style={styles.rColIndex}>
            <View style={styles.rChipIndex}>
              <Text style={styles.rChipIndexText}>{index + 1}</Text>
            </View>
          </View>

          <View style={styles.rColContent}>
            <Text style={styles.rNameText} numberOfLines={1}>{name}</Text>
            
            {!showCheck ? (
              <View style={styles.rDetailsRow}>
                <Text style={styles.rLabelText}>Prix</Text>
                <Text style={styles.rValPrix}>{prix}</Text>
                
                {/* Check if secondary prices exist if needed, otherwise skip */}
                {item.prices?.[1]?.price && <Text style={styles.rValPrix}>{item.prices[1].price}</Text>}
                {item.prices?.[2]?.price && <Text style={styles.rValPrix}>{item.prices[2].price}</Text>}
                
                <Text style={[styles.rLabelText, { paddingLeft: 15 }]}>statut</Text>
                <Text style={[styles.rValStatut, { color: isAvailable ? 'forestgreen' : 'darkred' }]}>
                  {isAvailable ? 'Disponible' : 'Indisponible'}
                </Text>
              </View>
            ) : (
              <View style={styles.rCheckRow}>
                <TouchableOpacity style={styles.rCheckWrapper} onPress={() => openConfirmModal(item, 'available')}>
                  <Text style={[styles.rCheckLabel, { color: 'forestgreen' }]}>Disponible</Text>
                  <View style={[styles.rCheckboxBox, { borderColor: 'darkgreen' }]}>
                    {isAvailable && <View style={[styles.rCheckboxFill, { backgroundColor: 'darkgreen' }]} />}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rCheckWrapper, { paddingLeft: 30 }]} onPress={() => openConfirmModal(item, 'unavailable')}>
                  <Text style={[styles.rCheckLabel, { color: 'darkred' }]}>Indisponible</Text>
                  <View style={[styles.rCheckboxBox, { borderColor: 'darkred' }]}>
                    {!isAvailable && <View style={[styles.rCheckboxFill, { backgroundColor: 'darkred' }]} />}
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.rColIcon}>
            {(mode === 'supp' || mode === 'modif') && (
              <TouchableOpacity onPress={() => mode === 'modif' ? startEdit(item) : openConfirmModal(item, 'delete')}>
                <Ionicons name={iconName as any} size={22} color={Theme.colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.rSeparator} />
      </View>
    );
  };

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Date Header Row */}
      <View style={styles.dateHeader}>
        <View style={styles.dateInfo}>
          <Text style={styles.relativeDate}>aujourd'hui</Text>
          <Text style={styles.fullDate}>{currentDate}</Text>
        </View>
      </View>

      {/* Stats Row (Component 1 Style - 3 columns) */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.total}</Text>
          <Text style={styles.statLbl}>Menu total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#2dd36f' }]}>{stats.available}</Text>
          <Text style={styles.statLbl}>Menu disponible</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: 'darkred' }]}>{stats.unavailable}</Text>
          <Text style={styles.statLbl}>Menu indisponible</Text>
        </View>
      </View>

      {/* Action Chips Row */}
      <View style={styles.tabRowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.subTab, activeTab === t.key && styles.subTabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Ionicons
                name={t.icon as any}
                size={14}
                color={activeTab === t.key ? 'white' : 'red'}
              />
              <Text style={[
                styles.subTabLabel,
                { color: activeTab === t.key ? 'white' : 'red' }
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <FlatList
        data={menus}
        keyExtractor={(item, i) => item._id || item.id || i.toString()}
        renderItem={({ item, index }) =>
          activeTab === 'list' || activeTab === 'dispo' || activeTab === 'modif' || activeTab === 'supp'
            ? renderMenuCard(item, index, activeTab)
            : null
        }
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={50} color={Theme.colors.gray[300]} />
            <Text style={styles.emptyText}>Aucun menu pour le moment</Text>
            <Text style={styles.emptySubText}>Créez votre premier menu</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditingMenu(null); setShowAddMenu(true); }}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <AddMenuSheetMultiStep
        visible={showAddMenu}
        onClose={() => { setShowAddMenu(false); setEditingMenu(null); }}
        onSave={handleSave}
        existingMenu={editingMenu}
      />

      {confirmModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.cfnOverlay} />
          <Animated.View style={[styles.cfnBottomCard, { transform: [{ translateY: slideAnim }] }]}>
            <BlurView intensity={55} tint="dark" style={styles.cfnGlassCard}>
              <LinearGradient
                colors={['rgba(145,24,24,0.55)', 'rgba(60,10,10,0.30)', 'rgba(0,0,0,0.0)']}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.cfnInner}>
                <View style={styles.cfnHeaderRow}>
                  <View style={[styles.cfnTitleChip]}>
                    <Text style={styles.cfnTitleText}>
                      {confirmActionType === 'delete' ? 'Voulez vous vraiment supprimer ?' : 'Changer la disponibilité ?'}
                    </Text>
                  </View>
                </View>

              <View style={styles.cfnContentRow}>
                <View style={styles.cfnImgRow}>
                  <View style={styles.cfnAvatarCard}>
                    <Image
                      source={{ uri: menuToConfirm?.coverImage || menuToConfirm?.images?.[0] || menuToConfirm?.image }}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </View>
                  <View style={styles.cfnDetails}>
                    <Text style={styles.cfnNameText} numberOfLines={1}>{menuToConfirm?.name || menuToConfirm?.titre}</Text>
                    <Text style={styles.cfnPriceText}>{menuToConfirm?.prices?.[0]?.price || menuToConfirm?.prix1} f</Text>
                  </View>
                </View>

                <View style={styles.cfnActionsCol}>
                  <TouchableOpacity
                    style={[
                      styles.cfnChip,
                      { backgroundColor: confirmActionType === 'available' ? 'darkgreen' : confirmActionType === 'delete' ? 'darkred' : '#ff9d9d', right: 110 }
                    ]}
                    onPress={executeConfirmAction}
                  >
                    <Text style={styles.cfnChipText}>
                      {confirmActionType === 'delete' ? 'Supprimer' : confirmActionType === 'available' ? 'Disponible' : 'Indisponible'}
                    </Text>
                    <Ionicons name={confirmActionType === 'delete' ? 'trash' : 'checkmark'} size={14} color="white" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cfnChip, { backgroundColor: 'darkred', right: 0 }]}
                    onPress={closeConfirmModal}
                  >
                    <Text style={styles.cfnChipText}>Annuler</Text>
                    <Ionicons name="close-circle-outline" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
            {updatingId && (
              <View style={styles.cfnLoaderOverlay}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Svg viewBox="0 0 100 100" width={100} height={100}>
                    <G>
                      <Path stroke="white" strokeWidth="6" fill="none" d="M9 50A41 41 0 0 0 91 50A41 43 0 0 1 9 50" />
                    </G>
                  </Svg>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dateInfo: {
    marginRight: 10,
  },
  relativeDate: {
    fontSize: 18,
    color: '#333',
  },
  fullDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: 'white',
  },
  statBox: {
    flex: 1,
    alignItems: 'flex-start',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statVal: {
    fontSize: 31,
    fontWeight: '900',
    color: 'black',
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.44)',
    fontWeight: 'bold',
    marginTop: 2,
  },
  tabRowContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  tabRow: {
    paddingHorizontal: 15,
    gap: 8,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    gap: 4,
    height: 32,
  },
  subTabActive: {
    backgroundColor: 'darkred',
  },
  subTabLabel: {
    fontSize: 10,
    color: 'black',
    fontWeight: 'bold',
  },
  subTabLabelActive: {
    color: 'white',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  menuCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 12,
  },
  menuImg: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  noImg: {
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
    gap: 4,
  },
  menuName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#fff5f5',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  emptySubText: {
    fontSize: 13,
    color: '#bbb',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'darkred',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  
  // NOUVEAUX STYLES FIDÈLES À RUDAFOOD POUR LES MENUS
  menuItemContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Légère ligne de séparation comme <ion-item>
  },
  rRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20, // margin: '35px 0px 35px 0' approximation
  },
  rColIndex: {
    width: '10%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  rChipIndex: {
    backgroundColor: 'rgba(56, 128, 255, 0.08)', // Ionic primary with opacity
    borderRadius: 16,
    height: 32,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rChipIndexText: {
    color: '#3880ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rColContent: {
    width: '80%',
    paddingLeft: 14,
  },
  rNameText: {
    color: '#000000a8',
    fontWeight: '900',
    fontSize: 10,
    paddingBottom: 8,
  },
  rDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rLabelText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.61)',
  },
  rValPrix: {
    paddingLeft: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'darkred',
  },
  rValStatut: {
    paddingLeft: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  rCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  rCheckWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rCheckLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
  },
  rCheckboxBox: {
    width: 15,
    height: 15,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rCheckboxFill: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  rColIcon: {
    width: '10%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rSeparator: {
    display: 'none', // La séparation se fait par le borderBottomWidth du menuItemContainer désormais
  },

  // STYLES BOTTOM CARD MODAL
  cfnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100400,
  },
  cfnBottomCard: {
    position: 'absolute',
    bottom: 40,
    width: '98%',
    marginHorizontal: '1%',
    height: 140,
    zIndex: 100500,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cfnGlassCard: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 40,
    overflow: 'hidden',
  },
  cfnInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  cfnHeaderRow: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cfnTitleChip: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  cfnTitleText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'white',
  },
  cfnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  cfnImgRow: {
    width: '40%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cfnAvatarCard: {
    width: 45,
    height: 45,
    backgroundColor: 'darkred',
    borderRadius: 22.5,
    overflow: 'hidden',
    marginLeft: 0,
    marginRight: 10,
  },
  cfnDetails: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  cfnNameText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  cfnPriceText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  cfnActionsCol: {
    width: '60%',
    height: '100%',
    position: 'relative',
  },
  cfnChip: {
    position: 'absolute',
    bottom: 30, // Fit the height correctly
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    height: 30,
  },
  cfnChipText: {
    color: 'white',
    fontSize: 12,
    marginRight: 5,
  },
  cfnLoaderOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100600,
  },
});
