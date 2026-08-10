import type { DriverInfo } from "@/src/features/driver/services/driverService";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { DelegateDriverSheet } from "./DelegateDriverSheet";
import MerchantOrderBottomSheet from "./MerchantOrderBottomSheet";
import {
  computeGrandTotal,
  computeItemsTotal,
} from "./MerchantOrderMontantTab";

/** Hauteur fixe d'une carte commande (mesurée ~94.33) → sert au snap de la liste. */
export const MERCHANT_CARD_HEIGHT = 94.33;

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MerchantOrderCardProps {
  order: Commande;
  allOrders?: Commande[];
  /**
   * Commandes du groupe passées AU SEUL bottom sheet (nav multi-cmd), sans
   * basculer la carte sur le design groupé — la carte reste celle de `order`,
   * la commande la mieux classée du groupe.
   */
  sheetOrders?: Commande[];
  /**
   * Toutes les commandes de la boutique : sert à l'onglet Montant du sheet, qui
   * recompose le groupe ABSOLU (même client / date / créneau ou zone) sans le
   * filtre de statut appliqué à la liste.
   */
  groupPool?: Commande[];
  onUpdateStatus: (
    status:
      | "processing"
      | "finished"
      | "delivering"
      | "delivered"
      | "cancelByFastFood",
  ) => Promise<void> | void;
  /** Délègue le groupe à un livreur (pose driverId sur les commandes). */
  onDelegate?: (driverId: string) => Promise<void> | void;
  /**
   * Valide UNE commande précise (bouton dans l'onglet Commande du sheet).
   * Sans cette prop, on retombe sur `onUpdateStatus` (toute la ligne).
   */
  onValidateOne?: (
    orderId: string,
    status: "processing" | "finished",
  ) => Promise<void | boolean> | void;
  isForceLaunched?: boolean;
}

export const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({
  order,
  allOrders,
  sheetOrders,
  groupPool,
  onUpdateStatus,
  onDelegate,
  onValidateOne,
  isForceLaunched = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLaunchedLocal, setIsLaunchedLocal] = useState(false);
  const [delegateVisible, setDelegateVisible] = useState(false);

  const isLaunched = isLaunchedLocal || isForceLaunched;

  const handleUpdateStatus = async (
    newStatus:
      | "processing"
      | "finished"
      | "delivering"
      | "delivered"
      | "cancelByFastFood",
  ) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(newStatus);
      if (newStatus === "delivering") {
        setIsLaunchedLocal(true);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Valide UNE commande du sheet. Le statut cible est déduit de la commande
   * ciblée (et non de la carte) : dans un groupe, chaque commande peut avoir
   * son propre statut.
   */
  const handleValidateOne = async (target: Commande) => {
    const s = (target.status || "pending").toLowerCase();
    const next =
      s === "pending" || s === "pendingtobuy" ? "processing" : "finished";
    setIsUpdating(true);
    try {
      if (onValidateOne) await onValidateOne(target.id, next);
      else await onUpdateStatus(next);
    } finally {
      setIsUpdating(false);
    }
  };

  const status = (order.status || "pending").toLowerCase();
  const isPending = status === "pending" || status === "pendingtobuy";
  const isActive =
    status === "active" || status === "processing" || status === "in_progress";
  const isFinished =
    status === "completed" || status === "finished" || status === "done";
  const isDelivering = status === "delivering";
  const isDelivered = status === "delivered";

  // Trace l'origine du prix affiché : recalcul front (groupe) vs `total` backend.
  // Déclenché au tap sur la carte uniquement, pas à chaque rendu. Déclaré avant
  // le branchement de variante pour rester atteignable par les deux rendus.
  const logPriceOrigin = () => {
    const group = allOrders ?? sheetOrders ?? null;
    if (group && group.length > 1) {
      console.log("[CardPrice] groupe", {
        affiche: computeGrandTotal(group),
        source: "computeGrandTotal(...) — recalcul front",
        detail: group.map((o: any) => ({
          id: o.id,
          rank: o.rank,
          articles: computeItemsTotal(o),
          qty: o.quantity || 1,
          priceIdx: o.selectedPriceIndex || 1,
          extras: (o.extra || []).filter((e: any) => e.status === true).length,
          drinks: (o.drink || []).filter((d: any) => d.status === true).length,
          deliveryGroupId: o.deliveryGroupId,
          courseBilled: o.courseBilled,
          course: o.delivery?.prix,
        })),
      });
    } else {
      console.log("[CardPrice] seule — synthese", {
        affiche: order.total || 0,
        source: "order.total (brut backend)",
        articlesRecalcules: computeItemsTotal(order),
        course: order.delivery?.prix,
      });
      // Dump COMPLET de la commande telle que reçue du backend.
      // `JSON.stringify` est indispensable : sans lui Metro tronque les objets
      // imbriqués (`delivery`, `menu`) au-delà de quelques niveaux.
      console.log(
        "[CardPrice] seule — commande brute",
        JSON.stringify(order, null, 2),
      );
    }
  };

  // --- Design Variant: Grouped Finished ---
  if (allOrders) {
    const u = (order as any).userData;
    const customerFirstName = u?.firstName || "Client";
    const customerLastName = u?.lastName || "";
    const nameToUse = u
      ? `${customerFirstName} ${customerLastName}`.trim()
      : "Client Inconnu";
    const initials = (
      u
        ? `${customerFirstName[0]}${customerLastName ? customerLastName[0] : ""}`
        : "??"
    ).toUpperCase();

    const deliveryRawStatus = (order as any).delivery?.status;
    const hasDelivery = deliveryRawStatus === true;
    const deliveryType = (order as any).delivery?.type;
    const isExpress = deliveryType === "express";
    const deliveryColor = isExpress ? "#ec4913" : "#2563eb";

    const orderCount = allOrders.length;
    const addressStr = order.delivery?.location || "Adresse non spécifiée";
    const isGroupDelivering = isDelivering || isLaunched;
    // Commande confiée à un livreur (driverId posé) : le marchand ne livre pas
    // lui-même → chip "Délégué" (le livreur gère lancement + fin de course).
    const delegatedDriverId = (order as any).driverId;
    const isDelegated = !!delegatedDriverId;
    // Le marchand livre lui-même (delivering SANS driverId) → chip "Terminer".
    const isSelfDelivering = isGroupDelivering && !delegatedDriverId;

    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            logPriceOrigin();
            setModalVisible(true);
          }}
          style={styles.summaryRow}
        >
          {/* Avatar avec initiales + badge nombre de commandes */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitials}>{initials}</Text>
            <View
              style={[
                styles.orderCountBadge,
                { backgroundColor: deliveryColor },
              ]}
            >
              <Text style={styles.orderCountText}>{orderCount}</Text>
            </View>
          </View>

          {/* Infos */}
          <View style={styles.summaryInfo}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryName} numberOfLines={1}>
                  {nameToUse}
                </Text>
              </View>
            </View>

            <View style={styles.summaryBottomRow}>
              <View style={styles.summaryChipsRow}>
                <View
                  style={[
                    styles.smallChip,
                    styles.chipInactive,
                    { paddingLeft: 0 },
                  ]}
                >
                  <Ionicons name="location-outline" size={14} color="#9ca3af" />
                  <Text
                    style={[styles.chipText, { color: "#9ca3af" }]}
                    numberOfLines={1}
                  >
                    {addressStr.length > 25
                      ? addressStr.slice(0, 25) + "…"
                      : addressStr}
                  </Text>
                </View>
              </View>

              {!hasDelivery ? null : isDelivered ? (
                // Livrée : badge non cliquable (aucune action possible).
                <View style={styles.deliveredBadge}>
                  <Ionicons name="checkmark-done" size={14} color="#16a34a" />
                  <Text style={styles.deliveredText}>Livré</Text>
                </View>
              ) : isUpdating ? (
                <ActivityIndicator size="small" color="#ec4913" />
              ) : isDelegated ? (
                // Confiée à un livreur : badge "Délégué" (le livreur gère la course).
                <View style={styles.delegatedBadge}>
                  <Ionicons name="person-outline" size={12} color="#2563eb" />
                  <Text style={styles.delegatedText}>Délégué</Text>
                </View>
              ) : isSelfDelivering ? (
                // Le marchand livre lui-même : chip "Terminer" pour clôturer.
                <TouchableOpacity
                  style={styles.finishBtn}
                  disabled={isUpdating}
                  onPress={() => handleUpdateStatus("delivered")}
                >
                  <Ionicons name="checkmark-done" size={14} color="white" />
                  <Text style={styles.finishBtnText}>Terminer</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.summaryValidateBtn}
                  disabled={isUpdating}
                  onPress={() => setDelegateVisible(true)}
                >
                  <Ionicons name="bicycle-outline" size={14} color="white" />
                  <Text style={styles.summaryValidateBtnText}>Lancer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <MerchantOrderBottomSheet
          order={order}
          allOrders={allOrders}
          groupPool={groupPool}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />

        {/* Choix "qui livre" : moi-même (delivering) ou un livreur (delegate). */}
        <DelegateDriverSheet
          visible={delegateVisible}
          onClose={() => setDelegateVisible(false)}
          onSelfDeliver={async () => {
            // Le resto se livre lui-même : driverId = fastFoodId, puis delivering.
            await onDelegate?.(order.fastFoodId);
            await onUpdateStatus("delivering");
          }}
          onDelegate={(d: DriverInfo) => onDelegate?.(d.driverId)}
        />
      </View>
    );
  }

  // --- Design Variant: Standard (Pending/Progress) ---
  // Ligne groupée : plusieurs commandes du même client sur le même créneau/zone
  // sont rendues par UNE carte (cf. groupBySlot). On n'affiche alors ni le nom du
  // plat ni le total d'une seule commande, mais "N cmd" + le montant du groupe —
  // le même que le "Total général" de l'onglet Montant du sheet.
  const groupedOrders =
    sheetOrders && sheetOrders.length > 1 ? sheetOrders : null;
  const totalPrice = groupedOrders
    ? computeGrandTotal(groupedOrders)
    : order.total || 0;

  /**
   * "N cmd livrées à 12h" / "N cmd livraison express" / "N cmd · pas de livraison".
   * Rendu pour une ligne groupée, et aussi pour une commande seule dès qu'elle
   * porte au moins un extra ou une boisson — quel que soit le mode de livraison,
   * y compris sur place (le libellé bascule alors sur "pas de livraison").
   * `n` = nombre de COMMANDES (pas d'articles) : la taille du groupe, ou 1 pour
   * une commande seule.
   */
  const buildGroupLabel = (n: number) => {
    const plural = n > 1 ? "s" : "";
    const d = order.delivery as any;
    if (d?.status !== true) return `${n} cmd · pas de livraison`;
    if (d?.type === "express") return `${n} cmd livraison express`;
    const time = d?.time || d?.hour;
    return time
      ? `${n} cmd livrée${plural} à ${time}`
      : `${n} cmd livrée${plural}`;
  };

  /**
   * Partie "livraison" seule, sans préfixe "N cmd" : "livrée à 13h06",
   * "livraison express" ou "pas de livraison". Suffixe le nom du plat quand la
   * commande est seule et sans extra ni boisson.
   */
  const deliverySuffix = (() => {
    const d = order.delivery as any;
    if (d?.status !== true) return "pas de livraison";
    if (d?.type === "express") return "livraison express";
    const time = d?.time || d?.hour;
    return time ? `livrée à ${time}` : "livrée";
  })();
  const userRank = (order as any).rank || 1;
  const menuImage =
    (order.menu as any)?.coverImage || (order.menu as any)?.image;
  const deliveryRaw = order.delivery;
  const deliveryType = deliveryRaw?.type;
  const deliveryColor =
    deliveryType === "express"
      ? "#ec4913"
      : deliveryType === "time"
        ? "#2563eb"
        : "black";
  // Chips Extras/Boisson : fond neutre uniforme (celui du cas "pas de livraison").
  const chipTint = {
    backgroundColor: "#00000008",
    borderWidth: 1,
    borderColor: "#00000014",
  };

  const extras = order.extra || [];
  const drinks = order.drink || [];
  const quantity = order.quantity || 1;

  // Item réellement sélectionné : les entrées placeholder "Aucun"/"Aucune" ne
  // comptent pas (même règle que `computeItemsTotal` de l'onglet Montant).
  // Sert à la fois aux compteurs des chips et au déclenchement du libellé
  // "N cmd …" sur une commande seule.
  const isRealItem = (x: any) =>
    x?.status === true && x?.name && x.name !== "Aucun" && x.name !== "Aucune";
  const extrasCount = Array.isArray(extras)
    ? extras.filter(isRealItem).length
    : 0;
  const drinksCount = Array.isArray(drinks)
    ? drinks.filter(isRealItem).length
    : 0;
  const pickedCount = extrasCount + drinksCount;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          logPriceOrigin();
          setModalVisible(true);
        }}
        style={styles.summaryRow}
      >
        <View style={styles.avatarContainer}>
          {menuImage ? (
            <Image
              source={{ uri: menuImage }}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Ionicons name="person" size={20} color="#ec4913" />
          )}
          <Ionicons
            name="navigate"
            size={12}
            color="white"
            style={[styles.deliveryIcon, { backgroundColor: deliveryColor }]}
          />
        </View>

        <View style={styles.summaryInfo}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryTitleContainer}>
              <Text style={styles.summaryPrice}>{totalPrice} F</Text>
              <Text style={styles.summaryName} numberOfLines={1}>
                {groupedOrders
                  ? ` ${buildGroupLabel(groupedOrders.length)}`
                  : pickedCount > 0
                    ? ` ${buildGroupLabel(1)}`
                    : ` ${quantity} plat${quantity > 1 ? "s" : ""} · ${deliverySuffix}`}
              </Text>
            </View>
            <View style={styles.rankContainer}>
              <Ionicons name="trophy-outline" size={14} color="#9ca3af" />
              <Text style={styles.rankBadgeRow}>{userRank}</Text>
            </View>
          </View>

          <View style={styles.summaryBottomRow}>
            <View style={styles.summaryChipsRow}>
              {/* Chips en noir sur fond neutre, quel que soit le mode de
                  livraison : la couleur reste portée par la seule pastille de
                  l'avatar. */}
              <View style={[styles.smallChip, chipTint, { paddingLeft: 0 }]}>
                <Ionicons name="fast-food-outline" size={14} color="black" />
                <Text style={[styles.chipText, { color: "black" }]}>
                  Extras +{extrasCount}
                </Text>
              </View>
              <View style={[styles.smallChip, chipTint]}>
                <Ionicons name="beer-outline" size={14} color="black" />
                <Text style={[styles.chipText, { color: "black" }]}>
                  Boisson +{drinksCount}
                </Text>
              </View>
            </View>

            {(isPending || isActive) && (
              <TouchableOpacity
                style={styles.summaryValidateBtn}
                disabled={isUpdating}
                onPress={() =>
                  handleUpdateStatus(isPending ? "processing" : "finished")
                }
              >
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.summaryValidateBtnText}>Valider</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isUpdating && (
        <View style={styles.absoluteLoader}>
          <BlurView
            intensity={30}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
          <ActivityIndicator size="large" color="#ec4913" />
        </View>
      )}

      <MerchantOrderBottomSheet
        order={order}
        allOrders={
          sheetOrders && sheetOrders.length > 1 ? sheetOrders : undefined
        }
        groupPool={groupPool}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        canValidate={isPending || isActive}
        onValidate={(target) => handleValidateOne(target)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 0,
    backgroundColor: "white",
  },
  avatarContainer: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarImage: {
    width: 48,
    height: 53,
    borderRadius: 24,
  },
  deliveryIcon: {
    position: "absolute",
    bottom: -2,
    left: -2,
    backgroundColor: "#ec4913",
    padding: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ec4913",
  },
  summaryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  smallChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 5,
    marginBottom: 4,
  },
  // Chip sans item : gris doux (#9ca3af côté texte) plutôt que le #ccc d'origine,
  // qui donnait un rendu sec/désactivé.
  chipInactive: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryTitleContainer: {
    flexDirection: "column",
    flex: 1,
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rankBadgeRow: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    marginLeft: 2,
  },
  summaryValidateBtn: {
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  delegatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb15",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  delegatedText: {
    color: "#2563eb",
    fontSize: 10,
    fontWeight: "bold",
  },
  deliveredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a15",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  deliveredText: {
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "bold",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  finishBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryValidateBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  absoluteLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ec4913",
  },
  orderCountBadge: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    zIndex: 10,
  },
  orderCountText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
  },
});
