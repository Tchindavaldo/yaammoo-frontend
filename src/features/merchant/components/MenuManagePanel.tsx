import { Config } from "@/src/api/config";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { AddMenuSheetMultiStep } from "./AddMenuSheetMultiStep";

interface MenuManagePanelProps {
  menus: any[];
  onRefresh: () => void;
  onAddMenu: (menu: any) => Promise<void>;
  loading?: boolean;
  /** Expose au parent l'action "ouvrir l'ajout de menu" (déclenchée depuis la pilule du header). */
  onRegisterAddMenu?: (open: () => void) => void;
  /** Hauteur du header de page : la barre stats+chips s'y cale (en blur), la liste scrolle dessous. */
  topOffset?: number;
}

export const MenuManagePanel: React.FC<MenuManagePanelProps> = ({
  menus,
  onRefresh,
  onAddMenu,
  loading,
  onRegisterAddMenu,
  topOffset = 0,
}) => {
  const [barHeight, setBarHeight] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  // Vue de la zone liste : plats disponibles / indisponibles / formulaire d'ajout inline.
  const [view, setView] = useState<"available" | "unavailable">("available");

  // Expose l'ouverture de l'ajout de menu au header (pilule "Ajouter"). Une seule fois au montage.
  React.useEffect(() => {
    onRegisterAddMenu?.(() => {
      setEditingMenu(null);
      setShowAddMenu(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState<
    "available" | "unavailable" | "delete"
  >("delete");
  const [menuToConfirm, setMenuToConfirm] = useState<any>(null);

  const slideAnim = React.useRef(new Animated.Value(230)).current;
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (confirmModalVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 230,
        duration: 300,
        useNativeDriver: true,
      }).start();
      spinAnim.stopAnimation();
    }
  }, [confirmModalVisible]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const isMenuAvailable = (m: any) =>
    !(
      m.status === "unavailable" ||
      m.disponibilite === "unavailable" ||
      m.disponibilite === "Indisponible"
    );

  const availableMenus = menus.filter(isMenuAvailable);
  const unavailableMenus = menus.filter((m) => !isMenuAvailable(m));

  const stats = {
    total: menus.length,
    available: availableMenus.length,
    unavailable: unavailableMenus.length,
  };

  // Liste affichée selon la vue active (unavailable → indispo, sinon disponibles).
  const visibleMenus =
    view === "unavailable" ? unavailableMenus : availableMenus;

  const openConfirmModal = (
    menu: any,
    actionType: "available" | "unavailable" | "delete",
  ) => {
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
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    try {
      const id = menuToConfirm._id || menuToConfirm.id;
      if (
        confirmActionType === "available" ||
        confirmActionType === "unavailable"
      ) {
        await axios.patch(`${Config.apiUrl}/menu/${id}`, {
          status: confirmActionType,
        });
      } else if (confirmActionType === "delete") {
        await axios.delete(`${Config.apiUrl}/menu/${id}`);
      }
      // ⚠️ Pas de onRefresh() ici : le backend émet fastFoodMenuUpdated /
      // fastFoodMenuDeleted → upsert/remove socket met déjà le state à jour.
      // Un refetch mettrait loading=true → pull-refresh fantôme.
      closeConfirmModal();
    } catch (error) {
      setUpdatingId(null);
      spinAnim.stopAnimation();
      alert("Erreur: Impossible d'effectuer cette action");
    }
  };

  const startEdit = (menu: any) => {
    setEditingMenu(menu);
    setShowAddMenu(true);
  };

  const handleSave = async (menuData: any) => {
    if (editingMenu) {
      // modification — pas de onRefresh() : fastFoodMenuUpdated (socket) met
      // déjà le state à jour. Un refetch déclencherait un pull-refresh fantôme.
      await axios.put(
        `${Config.apiUrl}/menu/${editingMenu._id || editingMenu.id}`,
        menuData,
      );
      setEditingMenu(null);
    } else {
      await onAddMenu(menuData);
    }
    setShowAddMenu(false);
  };

  const renderMenuCard = (item: any, index: number) => {
    const name = item.name || item.titre || "Menu";
    const status =
      item.status ||
      (item.disponibilite === "Disponible"
        ? "available"
        : item.disponibilite === "Indisponible"
          ? "unavailable"
          : "available");
    const isAvailable = status === "available";
    const prix = item.prices?.[0]?.price || item.prix1 || 0;
    const menuImage = item.coverImage || item.images?.[0] || item.image;
    const statusColor = isAvailable ? "#2dd36f" : "rgba(236,73,19,1.00)";

    return (
      <View style={styles.menuRowWrapper}>
        <View style={styles.menuSummaryRow}>
          {/* Avatar image ronde + pastille statut (calque MerchantOrderCard) */}
          <View style={styles.menuAvatarContainer}>
            {menuImage ? (
              <Image
                source={{ uri: menuImage }}
                style={styles.menuAvatarImage}
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <Ionicons name="fast-food" size={20} color="#ec4913" />
            )}
            <View
              style={[styles.menuStatusDot, { backgroundColor: statusColor }]}
            />
          </View>

          {/* Infos : prix EN HAUT, titre EN BAS (calque commande) */}
          <View style={styles.menuSummaryInfo}>
            <View style={styles.menuTopRow}>
              <View style={styles.menuTitleContainer}>
                <Text style={styles.menuPrice}>{prix} F</Text>
                <Text style={styles.menuName} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              {/* Stock disponible du plat */}
              <View style={styles.menuRankContainer}>
                <Ionicons name="cube-outline" size={13} color="#6b7280" />
                <Text style={styles.menuRankBadge}>{item.stock ?? 0}</Text>
              </View>
            </View>

            <View style={styles.menuBottomRow}>
              {/* Chip prix + chip statut sur la même ligne */}
              <View style={styles.menuChipsRow}>
                <View style={[styles.menuInfoChip]}>
                  <Ionicons name="pricetag-outline" size={13} color="#9ca3af" />
                  <Text style={styles.menuInfoChipText}>
                    {`${item.prices?.length || 1} prix`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.menuInfoChip,
                    {
                      backgroundColor: statusColor + "14",
                      borderColor: statusColor + "22",
                    },
                  ]}
                >
                  <Ionicons name="ellipse" size={8} color={statusColor} />
                  <Text
                    style={[styles.menuInfoChipText, { color: statusColor }]}
                  >
                    {isAvailable ? "Disponible" : "Indisponible"}
                  </Text>
                </View>
              </View>

              {/* Action à droite : Modifier */}
              <TouchableOpacity
                style={styles.menuActionBtn}
                onPress={() => startEdit(item)}
              >
                <Ionicons name="create-outline" size={15} color="white" />
                <Text style={styles.menuActionBtnText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const listTopPad = topOffset + barHeight;

  const filterChips: {
    key: "available" | "unavailable";
    label: string;
    icon: string;
  }[] = [
    { key: "available", label: "Disponible", icon: "checkmark-circle-outline" },
    { key: "unavailable", label: "Indisponible", icon: "close-circle-outline" },
  ];

  // Barre fixe (stats + chips) calée sous le header de page, style OrderManagePanel.
  const fixedBar = (
    <View
      style={[styles.fixedBar, { top: topOffset }]}
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
    >
      {/* Stats Row : 2 box {valeur}{unité orange} / label */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statValRow}>
            <Text style={styles.statVal}>{stats.available}</Text>
            <Text style={styles.statUnit}>plat</Text>
          </View>
          <Text style={styles.statLbl}>Menu disponible</Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statValRow}>
            <Text style={styles.statVal}>{stats.unavailable}</Text>
            <Text style={styles.statUnit}>plat</Text>
          </View>
          <Text style={styles.statLbl}>Menu indisponible</Text>
        </View>
      </View>

      {/* Chips Row : filtres Disponible / Indisponible à gauche, Ajouter à droite */}
      <View style={styles.statusRow}>
        <View style={styles.filterGroup}>
          {filterChips.map((c) => {
            const isActive = view === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.statusTab, isActive && styles.statusTabActive]}
                onPress={() => setView(c.key)}
              >
                <Ionicons
                  name={c.icon as any}
                  size={14}
                  color={isActive ? "white" : Theme.colors.primary}
                />
                <Text
                  style={[
                    styles.statusTabLabel,
                    { color: isActive ? "white" : Theme.colors.primary },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => {
            setEditingMenu(null);
            setShowAddMenu(true);
          }}
        >
          <Ionicons name="add-circle" size={15} color="white" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Liste filtrée (disponible / indisponible). L'ajout et la modification
          passent tous deux par le Modal en bas de ce composant. */}
      <FlatList
          data={visibleMenus}
          keyExtractor={(item, i) => item._id || item.id || i.toString()}
          renderItem={({ item, index }) => renderMenuCard(item, index)}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: listTopPad + 15 },
          ]}
          scrollIndicatorInsets={{ top: listTopPad }}
          progressViewOffset={listTopPad}
          refreshing={loading}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="fast-food-outline"
                size={50}
                color={Theme.colors.gray[300]}
              />
              <Text style={styles.emptyText}>
                {view === "unavailable"
                  ? "Aucun plat indisponible"
                  : "Aucun plat disponible"}
              </Text>
              <Text style={styles.emptySubText}>
                {menus.length === 0
                  ? "Créez votre premier menu"
                  : "Aucun plat dans cette catégorie"}
              </Text>
            </View>
          }
        />

      {/* Modal d'AJOUT / MODIFICATION (bouton "Ajouter" ou crayon d'un item). */}
      <AddMenuSheetMultiStep
        visible={showAddMenu}
        onClose={() => {
          setShowAddMenu(false);
          setEditingMenu(null);
        }}
        onSave={handleSave}
        existingMenu={editingMenu}
      />

      {confirmModalVisible && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.cfnOverlay} />
          <Animated.View
            style={[
              styles.cfnBottomCard,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <BlurView intensity={55} tint="dark" style={styles.cfnGlassCard}>
              <LinearGradient
                colors={[
                  "rgba(145,24,24,0.55)",
                  "rgba(60,10,10,0.30)",
                  "rgba(0,0,0,0.0)",
                ]}
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
                      {confirmActionType === "delete"
                        ? "Voulez vous vraiment supprimer ?"
                        : "Changer la disponibilité ?"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cfnContentRow}>
                  <View style={styles.cfnImgRow}>
                    <View style={styles.cfnAvatarCard}>
                      <Image
                        source={{
                          uri:
                            menuToConfirm?.coverImage ||
                            menuToConfirm?.images?.[0] ||
                            menuToConfirm?.image,
                        }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </View>
                    <View style={styles.cfnDetails}>
                      <Text style={styles.cfnNameText} numberOfLines={1}>
                        {menuToConfirm?.name || menuToConfirm?.titre}
                      </Text>
                      <Text style={styles.cfnPriceText}>
                        {menuToConfirm?.prices?.[0]?.price ||
                          menuToConfirm?.prix1}{" "}
                        f
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cfnActionsCol}>
                    <TouchableOpacity
                      style={[
                        styles.cfnChip,
                        {
                          backgroundColor:
                            confirmActionType === "available"
                              ? "darkgreen"
                              : confirmActionType === "delete"
                                ? "rgba(236,73,19,1.00)"
                                : "#ff9d9d",
                          right: 110,
                        },
                      ]}
                      onPress={executeConfirmAction}
                    >
                      <Text style={styles.cfnChipText}>
                        {confirmActionType === "delete"
                          ? "Supprimer"
                          : confirmActionType === "available"
                            ? "Disponible"
                            : "Indisponible"}
                      </Text>
                      <Ionicons
                        name={
                          confirmActionType === "delete" ? "trash" : "checkmark"
                        }
                        size={14}
                        color="white"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.cfnChip,
                        { backgroundColor: "rgba(236,73,19,1.00)", right: 0 },
                      ]}
                      onPress={closeConfirmModal}
                    >
                      <Text style={styles.cfnChipText}>Annuler</Text>
                      <Ionicons
                        name="close-circle-outline"
                        size={14}
                        color="white"
                      />
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
                      <Path
                        stroke="white"
                        strokeWidth="6"
                        fill="none"
                        d="M9 50A41 41 0 0 0 91 50A41 43 0 0 1 9 50"
                      />
                    </G>
                  </Svg>
                </Animated.View>
              </View>
            )}
          </Animated.View>
        </View>
      )}

      {/* Barre fixe (stats + chips) en blur, par-dessus la liste. */}
      {fixedBar}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  // Barre fixe (stats + chips) calée sous le header de page.
  fixedBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: "hidden",
    backgroundColor: "white",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    alignItems: "flex-start",
    backgroundColor: Theme.colors.primary + "10",
    padding: 10,
    borderRadius: 10,
  },
  statValRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statVal: {
    fontSize: 31,
    fontWeight: "900",
    color: "black",
  },
  statUnit: {
    fontSize: 25,
    color: Theme.colors.primary,
    marginLeft: 8,
    fontWeight: "900",
  },
  statLbl: {
    fontSize: 11,
    color: "rgba(0,0,0,0.44)",
    fontWeight: "bold",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    height: 32,
    backgroundColor: "rgba(236,73,19,1.00)",
    shadowColor: "rgba(236,73,19,1.00)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    fontSize: 11,
    color: "white",
    fontWeight: "900",
  },
  statusTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + "10",
    height: 32,
    gap: 4,
  },
  statusTabActive: {
    backgroundColor: "rgba(236,73,19,1.00)",
  },
  statusTabLabel: {
    fontSize: 10,
    color: "black",
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#999",
  },
  emptySubText: {
    fontSize: 13,
    color: "#bbb",
  },
  // Item de menu calqué sur MerchantOrderCard (item commande boutique).
  menuRowWrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 16,
  },
  menuSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 0,
    backgroundColor: "white",
  },
  menuAvatarContainer: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  menuAvatarImage: {
    width: 48,
    height: 53,
    borderRadius: 24,
  },
  menuStatusDot: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "white",
    zIndex: 10,
  },
  menuSummaryInfo: {
    flex: 1,
  },
  menuTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  menuTitleContainer: {
    flexDirection: "column",
    flex: 1,
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ec4913",
  },
  menuName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 1,
  },
  menuRankContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f3f4f6",
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  menuRankBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
  },
  menuBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    flexShrink: 1,
  },
  menuInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  menuInfoChipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9ca3af",
  },
  menuActionBtn: {
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    marginLeft: 6,
  },
  menuActionBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  // STYLES BOTTOM CARD MODAL
  cfnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100400,
  },
  cfnBottomCard: {
    position: "absolute",
    bottom: 40,
    width: "98%",
    marginHorizontal: "1%",
    height: 140,
    zIndex: 100500,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cfnGlassCard: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 40,
    overflow: "hidden",
  },
  cfnInner: {
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  cfnHeaderRow: {
    position: "absolute",
    top: 15,
    left: 15,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cfnTitleChip: {
    padding: 0,
    backgroundColor: "transparent",
  },
  cfnTitleText: {
    fontSize: 10,
    fontWeight: "900",
    color: "white",
  },
  cfnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  cfnImgRow: {
    width: "40%",
    flexDirection: "row",
    alignItems: "center",
  },
  cfnAvatarCard: {
    width: 45,
    height: 45,
    backgroundColor: "rgba(236,73,19,1.00)",
    borderRadius: 22.5,
    overflow: "hidden",
    marginLeft: 0,
    marginRight: 10,
  },
  cfnDetails: {
    justifyContent: "center",
    flexShrink: 1,
  },
  cfnNameText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  cfnPriceText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "white",
    marginTop: 4,
  },
  cfnActionsCol: {
    width: "60%",
    height: "100%",
    position: "relative",
  },
  cfnChip: {
    position: "absolute",
    bottom: 30, // Fit the height correctly
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    height: 30,
  },
  cfnChipText: {
    color: "white",
    fontSize: 12,
    marginRight: 5,
  },
  cfnLoaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100600,
  },
});
