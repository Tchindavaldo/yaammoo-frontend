"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Config } from "@/src/api/config";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
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
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { styles } from "./MenuManagePanel.styles";
import { MenuManageCard } from "./MenuManageCard";

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
  useLanguage();
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
      alert(t("Erreur: Impossible d'effectuer cette action"));
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

  const listTopPad = topOffset + barHeight;

  const filterChips: {
    key: "available" | "unavailable";
    label: string;
    icon: string;
  }[] = [
    { key: "available", label: t("Disponible"), icon: "checkmark-circle-outline" },
    { key: "unavailable", label: t("Indisponible"), icon: "close-circle-outline" },
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
            <Text style={styles.statUnit}>{t("plat")}</Text>
          </View>
          <Text style={styles.statLbl}>{t("Menu disponible")}</Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statValRow}>
            <Text style={styles.statVal}>{stats.unavailable}</Text>
            <Text style={styles.statUnit}>{t("plat")}</Text>
          </View>
          <Text style={styles.statLbl}>{t("Menu indisponible")}</Text>
        </View>
      </View>

      {/* Moins de 3 plats disponibles : la boutique n'est pas montrée aux clients. */}
      {stats.available < 3 && (
        <View style={styles.minMenusNotice}>
          <Ionicons name="information-circle-outline" size={16} color={DS.accent} />
          <Text style={styles.minMenusText}>
            {t("Ajoutez au moins 3 menus pour que votre boutique soit visible par les clients")}
          </Text>
        </View>
      )}

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
          <Text style={styles.addBtnText}>{t("Ajouter")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Flou Android (SDK 57) : la carte de confirmation floute la liste. */}
      <BlurScope>
      {/* Liste filtrée (disponible / indisponible). L'ajout et la modification
          passent tous deux par le Modal en bas de ce composant. */}
      <BlurTarget style={{ flex: 1 }}>
      <FlatList
          data={visibleMenus}
          keyExtractor={(item, i) => item._id || item.id || i.toString()}
          renderItem={({ item }) => <MenuManageCard item={item} startEdit={startEdit} />}
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
                  ? t("Aucun plat indisponible")
                  : t("Aucun plat disponible")}
              </Text>
              <Text style={styles.emptySubText}>
                {menus.length === 0
                  ? t("Créez votre premier menu")
                  : t("Aucun plat dans cette catégorie")}
              </Text>
            </View>
          }
        />
      </BlurTarget>

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
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.cfnOverlay} />
          <Animated.View
            style={[
              styles.cfnBottomCard,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <BlurView intensity={55} tint="dark" style={styles.cfnGlassCard} pointerEvents="auto">
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
                        ? t("Voulez vous vraiment supprimer ?")
                        : t("Changer la disponibilité ?")}
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
                                ? DS.accent
                                : "#ff9d9d",
                          right: 110,
                        },
                      ]}
                      onPress={executeConfirmAction}
                    >
                      <Text style={styles.cfnChipText}>
                        {confirmActionType === "delete"
                          ? t("Supprimer")
                          : confirmActionType === "available"
                            ? t("Disponible")
                            : t("Indisponible")}
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
                        { backgroundColor: DS.accent, right: 0 },
                      ]}
                      onPress={closeConfirmModal}
                    >
                      <Text style={styles.cfnChipText}>{t("Annuler")}</Text>
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
      </BlurScope>
    </View>
  );
};
