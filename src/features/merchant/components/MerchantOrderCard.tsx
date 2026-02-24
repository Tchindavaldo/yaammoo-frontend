import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  Image,
  Modal,
} from "react-native";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MerchantOrderCardProps {
  order: Commande;
  onUpdateStatus: (status: "active" | "completed" | "cancelled") => void;
}

export const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({
  order,
  onUpdateStatus,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "menu" | "extras" | "drinks" | "livrer"
  >("menu");
  const [showCancelModal, setShowCancelModal] = useState(false);

  const status = ((order as any).status || order.staut).toLowerCase();
  const isPending = status === "pending" || status === "pendingtobuy";
  const isActive =
    status === "active" || status === "processing" || status === "in_progress";

  const totalPrice = order.prixTotal || (order as any).total || 0;

  const userRank = (order as any).rank || 1;

  const menuName = order.menu?.titre || (order.menu as any)?.name || "—";

  const menuImage =
    (order.menu as any)?.coverImage || (order.menu as any)?.image;

  const extras = (order as any).extra || order.embalage || [];
  const extrasToShow = Array.isArray(extras) ? extras : [];
  const extrasActiveCount = extrasToShow.filter(
    (x: any) => x.status !== false,
  ).length;

  const drinks = (order as any).drink || [order.boisson];
  const drinksToShow = Array.isArray(drinks) ? drinks : [];
  const drinksActiveCount = drinksToShow.filter(
    (x: any) => x.status !== false,
  ).length;

  const deliveryRaw = (order as any).delivery;
  const deliveryType = deliveryRaw?.type;
  const deliveryColor =
    deliveryType === "express"
      ? "#dc2626"
      : deliveryType === "time"
        ? "#2563eb"
        : "black";
  const deliveryStr =
    order.livraison?.address || deliveryRaw?.location || "Non spécifié";

  const openModal = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.wrapper}>
      {/* ─── COLLAPSED / SUMMARY ROW ─── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openModal}
        style={styles.summaryRow}
      >
        <View style={styles.avatarContainer}>
          {menuImage ? (
            <Image source={{ uri: menuImage }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color="#dc2626" />
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
            <Text style={styles.summaryPrice}>{totalPrice} F</Text>
            <Text style={styles.summaryName} numberOfLines={1}>
              {menuName}
            </Text>
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
                <Ionicons name="fast-food-outline" size={14} color="#ccc" />
                <Text style={[styles.chipText, { color: "#ccc" }]}>
                  Extras +{extrasActiveCount}
                </Text>
              </View>
              <View style={[styles.smallChip, styles.chipInactive]}>
                <Ionicons name="beer-outline" size={14} color="#ccc" />
                <Text style={[styles.chipText, { color: "#ccc" }]}>
                  Boisson +{drinksActiveCount}
                </Text>
              </View>
            </View>
            <View style={[styles.smallChip, styles.chipInactive]}>
              <Ionicons name="trophy-outline" size={14} color="#ccc" />
              <Text style={styles.chipBadge}>{userRank}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* ─── EXPANDED FULL CARD ─── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalBody}>
              {/* Chips tabs */}
              <View style={styles.chipsRow}>
                <View
                  style={{ flexDirection: "row", flex: 1, flexWrap: "wrap" }}
                >
                  <TouchableOpacity
                    style={[
                      styles.smallChip,
                      activePanel === "menu"
                        ? styles.chipActive
                        : styles.chipInactive,
                    ]}
                    onPress={() => setActivePanel("menu")}
                  >
                    <Ionicons
                      name="restaurant-outline"
                      size={12}
                      color={activePanel === "menu" ? "white" : "#666"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: activePanel === "menu" ? "white" : "#666" },
                      ]}
                    >
                      Menu
                    </Text>
                  </TouchableOpacity>

                  {extrasToShow.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.smallChip,
                        activePanel === "extras"
                          ? styles.chipActive
                          : styles.chipInactive,
                      ]}
                      onPress={() => setActivePanel("extras")}
                    >
                      <Ionicons
                        name="fast-food-outline"
                        size={12}
                        color={activePanel === "extras" ? "white" : "#666"}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: activePanel === "extras" ? "white" : "#666",
                          },
                        ]}
                      >
                        Extras +{extrasToShow.length}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {drinksToShow.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.smallChip,
                        activePanel === "drinks"
                          ? styles.chipActive
                          : styles.chipInactive,
                      ]}
                      onPress={() => setActivePanel("drinks")}
                    >
                      <Ionicons
                        name="beer-outline"
                        size={12}
                        color={activePanel === "drinks" ? "white" : "#666"}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: activePanel === "drinks" ? "white" : "#666",
                          },
                        ]}
                      >
                        Boisson +{drinksToShow.length}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.smallChip,
                      activePanel === "livrer"
                        ? styles.chipActive
                        : styles.chipInactive,
                    ]}
                    onPress={() => setActivePanel("livrer")}
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={12}
                      color={activePanel === "livrer" ? "white" : "#666"}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: activePanel === "livrer" ? "white" : "#666" },
                      ]}
                    >
                      Livrer
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Boutons action circulaires */}
                <View style={styles.actionButtonsRight}>
                  {isActive && (
                    <TouchableOpacity
                      style={[
                        styles.roundActionBtn,
                        { backgroundColor: "#8b0000", opacity: 0.5 },
                      ]}
                      disabled
                    >
                      <Ionicons
                        name="arrow-back-outline"
                        size={16}
                        color="white"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Modal annulation inline */}
              {showCancelModal && (
                <View style={styles.cancelModalContainer}>
                  <Text style={styles.cancelModalText}>
                    Voulez-vous annuler cette commande ?
                  </Text>
                  <View style={styles.cancelModalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtnNo}
                      onPress={() => setShowCancelModal(false)}
                    >
                      <Text style={styles.cancelBtnLabel}>Non</Text>
                      <Ionicons
                        name="close-circle-outline"
                        size={12}
                        color="white"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtnYes}
                      onPress={() => {
                        setShowCancelModal(false);
                        onUpdateStatus("cancelled");
                      }}
                    >
                      <Text style={styles.cancelBtnLabel}>Oui</Text>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={12}
                        color="white"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Panneau Menu */}
              {activePanel === "menu" && (
                <View style={styles.contentSection}>
                  <View style={styles.summaryRowModal}>
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{ uri: menuImage }}
                        style={styles.avatarImage}
                      />
                      <View style={styles.statusDot} />
                    </View>
                    <View style={styles.summaryInfoModal}>
                      <View style={styles.summaryTitleRowModal}>
                        <Text style={styles.summaryPriceModal}>
                          {totalPrice} fcfa
                        </Text>
                      </View>
                      <View style={styles.summaryAmountContainerModal}>
                        <Text style={styles.summaryNameModal}>
                          {menuName.trim()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryChipsRowModal}>
                      {isPending && (
                        <TouchableOpacity
                          style={styles.validateChip}
                          onPress={() => onUpdateStatus("active")}
                        >
                          <Text style={styles.validateChipText}>valider</Text>
                        </TouchableOpacity>
                      )}
                      {isActive && (
                        <TouchableOpacity
                          style={styles.validateChip}
                          onPress={() => onUpdateStatus("completed")}
                        >
                          <Text style={styles.validateChipText}>Terminer</Text>
                        </TouchableOpacity>
                      )}
                      {(isPending || isActive) && (
                        <TouchableOpacity
                          style={[
                            styles.validateChip,
                            styles.cancelChip,
                            { width: 30, height: 30 },
                          ]}
                          onPress={() => onUpdateStatus("cancelled")}
                        >
                          <Ionicons
                            name="close-outline"
                            size={16}
                            color="white"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Panneau Extras */}
              {activePanel === "extras" && (
                <View style={styles.contentSection}>
                  {extrasToShow.map((ex: any, i: number) => (
                    <View key={i} style={styles.extraItem}>
                      <Text style={styles.extraText}>{ex.name || ex.type}</Text>
                      <View
                        style={[
                          styles.itemStatusDot,
                          ex.status === false && {
                            backgroundColor: "#ef4444",
                            borderColor: "#dc2626",
                          },
                        ]}
                      >
                        <Ionicons
                          name={ex.status !== false ? "checkmark" : "close"}
                          size={10}
                          color="white"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Panneau Boissons */}
              {activePanel === "drinks" && (
                <View style={styles.panelContainer}>
                  {drinksToShow.map((dr: any, i: number) => (
                    <View key={i} style={styles.extraItem}>
                      <Text style={styles.extraText}>{dr.name || dr.type}</Text>
                      <View
                        style={[
                          styles.itemStatusDot,
                          dr.status === false && {
                            backgroundColor: "#ef4444",
                            borderColor: "#dc2626",
                          },
                        ]}
                      >
                        <Ionicons
                          name={dr.status !== false ? "checkmark" : "close"}
                          size={10}
                          color="white"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Panneau Livrer */}
              {activePanel === "livrer" && (
                <View style={styles.panelContainer}>
                  <View style={styles.deliveryLocation}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#666"
                      style={{ marginRight: 10 }}
                    />
                    <View>
                      <Text style={styles.deliveryTitle}>
                        Adresse de livraison
                      </Text>
                      <Text style={styles.deliveryAddress}>{deliveryStr}</Text>
                    </View>
                  </View>
                  <View style={styles.deliveryType}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#666"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.deliveryTypeText}>
                      Type:{" "}
                      {deliveryType === "express"
                        ? "Express"
                        : deliveryType === "time"
                          ? "Programmé"
                          : "Standard"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const RED = "hsl(0, 100%, 15%)";
const RED_BORDER = "hsl(0, 80%, 25%)";

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6", // Light gray separator
    // marginVertical: 6,
    // marginHorizontal: 12,
    marginBottom: 0,
  },

  // ── SUMMARY ROW ──
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 0,
    backgroundColor: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 45,
    // minHeight: 150,
    borderTopRightRadius: 45,
    height: 100,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  coverContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  coverImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  panelContainer: {
    marginTop: 20,
  },
  contentSection: {
    flex: 0,
    // width: "100%",
    height: 100,
    // backgroundColor: "blue",
  },
  priceRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  priceCard: {
    width: 130,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  titleRow: {
    flexDirection: "row",
    gap: 12,
  },
  titleCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  buttonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelChip: {
    backgroundColor: "#ef4444",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  detailCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  deliveryDetail: {
    paddingTop: 8,
  },
  deliveryLocation: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  deliveryType: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  deliveryTypeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
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
  statusDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    borderWidth: 1,
    borderColor: "white",
  },
  deliveryIcon: {
    position: "absolute",
    bottom: -2,
    left: -2,
    backgroundColor: "#dc2626",
    padding: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  rankBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#dc2626",
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  rankBadgeRight: {
    position: "absolute",
    right: 0,
    top: 35,
    backgroundColor: "#dc2626",
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  chipBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#dc2626",
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  summaryPriceBullet: {
    fontSize: 13,
    color: "#9ca3af",
    marginHorizontal: 4,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#dc2626",
  },
  summaryRank: {
    fontSize: 11,
    fontWeight: "900",
    color: "#dc2626",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  summaryAmountContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  summaryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  summaryChipsRowModal: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 4,
    paddingBottom: 6,
  },

  // ── EXPANDED CARD ──
  fastFoodOrderCard: {
    backgroundColor: RED,
    borderTopWidth: 1,
    borderTopColor: RED_BORDER,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 18,
    overflow: "hidden",
  },
  chipsRow: {
    flexDirection: "row",
    marginBottom: 20,
    justifyContent: "space-between",
    alignItems: "flex-start",
    display: "none",
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
  chipActive: {
    backgroundColor: "black",
    shadowColor: "rgb(45, 213, 91)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  chipInactive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  actionButtonsRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  roundActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  // Cancel modal inline
  cancelModalContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelModalText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    flex: 1,
    marginRight: 8,
  },
  cancelModalActions: {
    flexDirection: "row",
    gap: 6,
  },
  cancelBtnNo: {
    backgroundColor: "darkred",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cancelBtnYes: {
    backgroundColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  cancelBtnLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },

  // Menu panel
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  walletText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ccc",
  },
  menuNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
  },
  menuIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  nomCmdUser: {
    fontSize: 12,
    fontWeight: "400",
    color: "#ccc",
    lineHeight: 18,
    flex: 1,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    width: "100%",
  },
  deliveryText: {
    fontSize: 12,
    color: "#ccc",
    lineHeight: 18,
    flex: 1,
  },
  deliveryLabel: {
    fontWeight: "900",
    color: "#ff3838",
  },
  ctnAdd: {
    justifyContent: "flex-end",
    alignItems: "flex-end",
    minWidth: 60,
  },
  validateChip: {
    backgroundColor: "black",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  validateChipText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.1,
  },

  // Extras / Drinks panel
  extraItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  extraText: {
    fontSize: 12,
    color: "#e2e8f0",
    flex: 1,
  },
  itemStatusDot: {
    width: 18,
  },
  summaryTopRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  summaryRowModal: {
    flexDirection: "row",
    display: "flex",
    alignItems: "flex-end",
    // paddingVertical: 8,
    paddingHorizontal: 2,
    paddingLeft: 0,
    // backgroundColor: "red",
  },
  summaryInfoModal: {
    flex: 1,
    // width: 200,
    // height: "100%",
    display: "flex",
    flexDirection: "column",
    // justifyContent: "flex-end",
    paddingBottom: 6,
  },
  summaryTitleRowModal: {
    // flexDirection: "row",
    // alignItems: "center",
    // justifyContent: "flex-start",
    // alignSelf: "flex-start",
    marginBottom: 8,
  },
  summaryPriceModal: {
    fontSize: 14,
    fontWeight: "900",
    color: "#dc2626",
    textAlign: "left",
  },
  summaryAmountContainerModal: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
    // width: 200,
    // height: "50%",
    alignItems: "flex-start",
  },
  summaryNameModal: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 0,
    textAlign: "left",
  },
});
