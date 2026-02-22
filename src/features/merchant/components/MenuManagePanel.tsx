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
  ScrollView,
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
    flexDirection: 'row',
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
});
