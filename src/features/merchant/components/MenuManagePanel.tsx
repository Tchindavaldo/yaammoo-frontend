import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { AddMenuSheetMultiStep } from './AddMenuSheetMultiStep';
import axios from 'axios';
import { Config } from '@/src/api/config';

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

  const stats = {
    total: menus.length,
    available: menus.filter((m) => m.status === 'available' || m.disponibilite === 'available').length,
    unavailable: menus.filter((m) => m.status === 'unavailable' || m.disponibilite === 'unavailable').length,
  };

  const toggleDisponibilite = async (menu: any) => {
    const currentStatus = menu.status || menu.disponibilite || 'available';
    const newStatus = currentStatus === 'available' ? 'unavailable' : 'available';
    try {
      setUpdatingId(menu._id || menu.id);
      await axios.patch(`${Config.apiUrl}/menu/${menu._id || menu.id}`, { status: newStatus });
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la disponibilité');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteMenu = async (menu: any) => {
    Alert.alert(
      'Supprimer le menu',
      `Voulez-vous vraiment supprimer "${menu.name || menu.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingId(menu._id || menu.id);
              await axios.delete(`${Config.apiUrl}/menu/${menu._id || menu.id}`);
              onRefresh();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer ce menu');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
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

  const renderMenuCard = (item: any, mode: 'dispo' | 'modif' | 'supp' | 'list') => {
    const name = item.name || item.titre || 'Menu';
    const status = item.status || item.disponibilite || 'available';
    const isAvailable = status === 'available';
    const imageUrl = item.coverImage || item.images?.[0] || item.image;
    const id = item._id || item.id;
    const isUpdating = updatingId === id;

    return (
      <View style={styles.menuCard}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.menuImg} />
        ) : (
          <View style={[styles.menuImg, styles.noImg]}>
            <Ionicons name="fast-food-outline" size={24} color={Theme.colors.gray[400]} />
          </View>
        )}

        <View style={styles.menuInfo}>
          <Text style={styles.menuName}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isAvailable ? '#e6f9ee' : '#fdecea' }]}>
            <Text style={[styles.statusText, { color: isAvailable ? Theme.colors.success : Theme.colors.danger }]}>
              {isAvailable ? 'Disponible' : 'Indisponible'}
            </Text>
          </View>
        </View>

        {isUpdating ? (
          <ActivityIndicator color={Theme.colors.primary} />
        ) : (
          <>
            {mode === 'dispo' && (
              <Switch
                value={isAvailable}
                onValueChange={() => toggleDisponibilite(item)}
                trackColor={{ false: Theme.colors.gray[200], true: '#86efac' }}
                thumbColor={isAvailable ? Theme.colors.success : Theme.colors.gray[400]}
              />
            )}
            {mode === 'modif' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                <Ionicons name="create-outline" size={20} color={Theme.colors.primary} />
              </TouchableOpacity>
            )}
            {mode === 'supp' && (
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteMenu(item)}>
                <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLbl}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Theme.colors.success }]}>{stats.available}</Text>
          <Text style={styles.statLbl}>Disponible</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Theme.colors.danger }]}>{stats.unavailable}</Text>
          <Text style={styles.statLbl}>Indisponible</Text>
        </View>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.subTab, activeTab === t.key && styles.subTabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons
              name={t.icon as any}
              size={14}
              color={activeTab === t.key ? Theme.colors.primary : Theme.colors.gray[400]}
            />
            <Text style={[styles.subTabLabel, activeTab === t.key && styles.subTabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={menus}
        keyExtractor={(item, i) => item._id || item.id || i.toString()}
        renderItem={({ item }) =>
          activeTab === 'list' || activeTab === 'dispo' || activeTab === 'modif' || activeTab === 'supp'
            ? renderMenuCard(item, activeTab === 'list' ? 'dispo' : activeTab)
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

      {/* Multi-step sheet */}
      <AddMenuSheetMultiStep
        visible={showAddMenu}
        onClose={() => { setShowAddMenu(false); setEditingMenu(null); }}
        onSave={handleSave}
        existingMenu={editingMenu}
      />
    </>
  );
};

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.white,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.gray[50],
    borderRadius: Theme.borderRadius.md,
  },
  statNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  statLbl: {
    fontSize: 11,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    paddingHorizontal: Theme.spacing.sm,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: Theme.colors.primary,
  },
  subTabLabel: {
    fontSize: 10,
    color: Theme.colors.gray[400],
    fontWeight: '600',
  },
  subTabLabelActive: {
    color: Theme.colors.primary,
  },
  listContent: {
    padding: Theme.spacing.md,
    paddingBottom: 90,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: Theme.spacing.md,
  },
  menuImg: {
    width: 56,
    height: 56,
    borderRadius: Theme.borderRadius.md,
  },
  noImg: {
    backgroundColor: Theme.colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
    gap: 6,
  },
  menuName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.dark,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: '#fdecea',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.gray[500],
  },
  emptySubText: {
    fontSize: 13,
    color: Theme.colors.gray[400],
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
