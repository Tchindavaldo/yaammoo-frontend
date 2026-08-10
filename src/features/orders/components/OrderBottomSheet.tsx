import { Commande, FastFood } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BikeAnimation } from "../../merchant/components/BikeAnimation";
import { MontantTab } from "../../merchant/components/MerchantOrderMontantTab";
import { DriverInfoTab } from "./DriverInfoTab";
import { RateMenuTab } from "./RateMenuTab";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 480;

/** Hauteur max des cartes d'items (Commandes / Montant) : sheet à hauteur fixe. */
const ITEMS_CARD_MAX_H = 300;

export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
  type?: string;
  /** Visuel du plat (type "menu") : remplit la case d'icône. */
  image?: string;
};

const COLORS = [
  { bg: "#EAF3DE", text: "#4B7C16", badge: "#7CB342" },
  { bg: "#FDEBD0", text: "#A04000", badge: "#E67E22" },
  { bg: "#D6EAF8", text: "#1B4F72", badge: "#3498DB" },
  { bg: "#E8DAEF", text: "#512E5F", badge: "#8E44AD" },
];

type Props = {
  order: Commande | null;
  isVisible: boolean;
  onClose: () => void;
  boutique?: FastFood | null;
  allOrders?: Commande[];
};

type Tab = "livraison" | "commandes" | "montant" | "livreur" | "noter";

export const OrderBottomSheet: React.FC<Props> = ({
  order,
  isVisible,
  onClose,
  boutique,
  allOrders,
}) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("livraison");
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Déterminer la commande à afficher (de façon synchrone)
  const selectedOrder = allOrders
    ? allOrders[selectedOrderIdx] || order
    : order;

  // Tab « Livreur » : visible dès que la course est lancée/terminée
  // (delivering / delivered), qu'un livreur soit délégué OU que le marchand livre.
  const showDriverTab =
    selectedOrder?.status === "delivering" ||
    selectedOrder?.status === "delivered";

  // Tab « Noter » (plat) : commande livrée uniquement.
  const menuId = (selectedOrder?.menu as any)?.id || (selectedOrder as any)?.menuId;
  const showRateTab = selectedOrder?.status === "delivered" && !!menuId;
  // Onglet Montant : récap du groupe, seulement si la ligne porte ≥ 2 commandes.
  const showMontantTab = !!allOrders && allOrders.length > 1;

  const hasMultiple = !!allOrders && allOrders.length > 1;

  // ─── Chips « Cmd » du header : compteur de débordement « +N » ───────────────
  // Largeur d'un chip + gap : sert à convertir des pixels masqués en nb de chips.
  const CMD_CHIP_W = 58;
  const [cmdViewportW, setCmdViewportW] = useState(0);
  const [cmdContentW, setCmdContentW] = useState(0);
  const [cmdScrollX, setCmdScrollX] = useState(0);
  const handleCmdLayout = (e: any) =>
    setCmdViewportW(e.nativeEvent.layout.width);
  const handleCmdContentSize = (w: number) => setCmdContentW(w);
  const handleCmdScroll = (e: any) =>
    setCmdScrollX(e.nativeEvent.contentOffset.x);
  // Un chip n'est compté que s'il est masqué à plus de moitié.
  const hiddenPx = Math.max(0, cmdContentW - cmdViewportW - cmdScrollX);
  const hiddenCount = Math.floor(hiddenPx / CMD_CHIP_W + 0.5);

  // Livraison offerte (bonus/campagne couvert par le fastfood) ou mutualisée sur
  // un groupe de livraison : dans les deux cas, pas de prix sur cette commande.
  const offer = (selectedOrder as any)?.deliveryOffer;
  const deliveryOffered =
    offer?.active === true && offer?.coveredBy === "fastfood";
  // « Cmd groupée » n'a de sens qu'à partir de 2 commandes portant le MÊME
  // deliveryGroupId : seule une commande avec ce groupe ne mutualise rien.
  const currentGroupId = (selectedOrder as any)?.deliveryGroupId;
  const deliveryGrouped =
    !!currentGroupId &&
    (allOrders || []).filter(
      (o: any) => o.deliveryGroupId === currentGroupId,
    ).length > 1;

  // Construire les items dynamiquement (plus besoin de state ni de useEffect pour ça)
  const items: OrderItem[] = React.useMemo(() => {
    if (!selectedOrder) return [];
    const extras = selectedOrder.extra || [];
    const drinks = selectedOrder.drink || [];
    const newItems: OrderItem[] = [];

    const priceIdx = ((selectedOrder as any).selectedPriceIndex || 1) - 1;
    const menuPrice =
      selectedOrder.menu?.prices?.[priceIdx]?.price ||
      selectedOrder.menu?.prices?.[0]?.price ||
      0;
    newItems.push({
      name:
        selectedOrder.menu?.titre ||
        selectedOrder.menu?.name ||
        "Menu principal",
      qty: selectedOrder.quantity || 1,
      price: `${menuPrice * (selectedOrder.quantity || 1)} F`,
      unitPrice: menuPrice,
      hasQty: true,
      type: "menu",
      image:
        (selectedOrder.menu as any)?.coverImage ||
        (selectedOrder.menu as any)?.image,
    });

    extras.forEach((ex: any) => {
      if (ex.status === true && ex.name !== "Aucun") {
        const exPrice = ex.prix || ex.price || 0;
        newItems.push({
          name: ex.name,
          qty: 1,
          price: `${exPrice} F`,
          unitPrice: exPrice,
          hasQty: false,
          type: "extra",
        });
      }
    });

    drinks.forEach((dr: any) => {
      if (dr.status === true && dr.name !== "Aucune") {
        const drPrice = dr.prix || dr.price || 0;
        const drQty = dr.quantite || 1;
        newItems.push({
          name: dr.name,
          qty: drQty,
          price: `${drPrice * drQty} F`,
          unitPrice: drPrice,
          hasQty: true,
          type: "drink",
        });
      }
    });
    return newItems;
  }, [selectedOrder]);

  useEffect(() => {
    if (isVisible && order) {
      // Animation Open — départ hors écran, pour la même raison qu'à la
      // fermeture : le contenu peut dépasser la hauteur du sheet.
      translateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      setTab("livraison");
      setSelectedOrderIdx(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, order]);

  // Si on quitte une commande avec livreur pour une sans livreur, revenir à Livraison.
  useEffect(() => {
    if (tab === "livreur" && !showDriverTab) setTab("livraison");
    if (tab === "noter" && !showRateTab) setTab("livraison");
    if (tab === "montant" && !showMontantTab) setTab("livraison");
  }, [tab, showDriverTab, showRateTab]);

  const handleDismiss = () => {
    // `timing` et NON `spring` : un ressort traîne en fin de course, le sheet
    // paraît immobile alors que l'animation tourne encore et que `onClose()`
    // (donc le démontage) n'est pas appelé. Une durée bornée supprime ce temps
    // mort.
    Animated.parallel([
      Animated.timing(translateY, {
        // SCREEN_HEIGHT et non SHEET_HEIGHT : le contenu peut DÉBORDER au-dessus
        // du sheet (hauteur fixe, plusieurs zones / onglet Montant). Descendre
        // de SHEET_HEIGHT seul laissait cette portion excédentaire à l'écran,
        // figée, jusqu'au démontage. Translater d'un écran sort tout, quelle que
        // soit la hauteur réelle du contenu.
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!order) return null;
  const initials = (boutique?.nom || "B").substring(0, 2).toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            // La barre de navigation système recouvrait le bas du sheet.
            { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
            { transform: [{ translateY }] },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.header}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: theme.bg }]}>
                <Text style={[styles.avatarText, { color: theme.text }]}>
                  {initials}
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.badge }]}>
                  <Text style={styles.badgeText}>
                    {allOrders ? allOrders.length : 1}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>
                  {boutique?.nom || "Boutique"}
                </Text>
                {hasMultiple ? (
                  /* Multi-commandes : chips Cmd 1/2/3… à la place de l'adresse. */
                  <View style={styles.cmdRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cmdScroll}
                      style={{ flexShrink: 1 }}
                      onScroll={handleCmdScroll}
                      scrollEventThrottle={16}
                      onLayout={handleCmdLayout}
                      onContentSizeChange={handleCmdContentSize}
                    >
                      {allOrders!.map((o, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.cmdChip,
                            selectedOrderIdx === idx && styles.cmdChipActive,
                          ]}
                          onPress={() => setSelectedOrderIdx(idx)}
                        >
                          <Text
                            style={[
                              styles.cmdChipText,
                              selectedOrderIdx === idx &&
                                styles.cmdChipTextActive,
                            ]}
                          >
                            {/* Vrai rang de la commande (aligné sur l'onglet
                                Montant), pas la position dans la liste. */}
                            Cmd {(o as any).rank ?? idx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* Débordement : « +N » tant que la liste n'a pas été scrollée. */}
                    {hiddenCount > 0 && (
                      <View style={styles.cmdMore}>
                        <Text style={styles.cmdMoreText}>+{hiddenCount}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.userAddr} numberOfLines={1}>
                    {selectedOrder?.delivery?.location || "Sur place"}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === "livraison" && styles.tabActive]}
              onPress={() => setTab("livraison")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "livraison" && styles.tabTextActive,
                ]}
              >
                Livraison
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "commandes" && styles.tabActive]}
              onPress={() => setTab("commandes")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "commandes" && styles.tabTextActive,
                ]}
              >
                Commandes
              </Text>
            </TouchableOpacity>
            {showMontantTab && (
              <TouchableOpacity
                style={[styles.tab, tab === "montant" && styles.tabActive]}
                onPress={() => setTab("montant")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "montant" && styles.tabTextActive,
                  ]}
                >
                  Montant
                </Text>
              </TouchableOpacity>
            )}
            {showDriverTab && (
              <TouchableOpacity
                style={[styles.tab, tab === "livreur" && styles.tabActive]}
                onPress={() => setTab("livreur")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "livreur" && styles.tabTextActive,
                  ]}
                >
                  Livreur
                </Text>
              </TouchableOpacity>
            )}
            {showRateTab && (
              <TouchableOpacity
                style={[styles.tab, tab === "noter" && styles.tabActive]}
                onPress={() => setTab("noter")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "noter" && styles.tabTextActive,
                  ]}
                >
                  Noter
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {tab === "noter" && showRateTab ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <RateMenuTab
                menuId={menuId}
                orderId={selectedOrder!.id}
                menuName={
                  selectedOrder?.menu?.titre ||
                  selectedOrder?.menu?.name ||
                  "ce plat"
                }
                menuImage={
                  selectedOrder?.menu?.image ||
                  selectedOrder?.menu?.images?.[0] ||
                  undefined
                }
              />
            </ScrollView>
          ) : tab === "livreur" && showDriverTab ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <DriverInfoTab order={selectedOrder!} allowRating />
            </ScrollView>
          ) : tab === "montant" && showMontantTab ? (
            <MontantTab orders={allOrders!} maxHeight={ITEMS_CARD_MAX_H} />
          ) : tab === "livraison" ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <LivraisonTab
                order={selectedOrder!}
                boutiqueName={boutique?.nom || "Boutique"}
              />
            </ScrollView>
          ) : (
            <CommandesTab
              items={items}
              total={selectedOrder?.total || 0}
              zone={(selectedOrder?.delivery as any)?.zone || ""}
              deliveryPrice={Number((selectedOrder?.delivery as any)?.prix) || 0}
              deliveryOffered={deliveryOffered}
              deliveryGrouped={deliveryGrouped}
            />
          )}

        </Animated.View>
      </View>
    </Modal>
  );
};

function LivraisonTab({
  order,
  boutiqueName,
}: {
  order: Commande;
  boutiqueName: string;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  async function playSound() {
    if (!order.delivery?.voiceNoteUri) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: order.delivery.voiceNoteUri },
        { shouldPlay: true },
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setPlaybackProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackProgress(0);
          }
        }
      });
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <>
      <View
        style={{ flexDirection: "row", gap: 10, marginTop: 10, height: 110 }}
      >
        <View style={{ width: "42%", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Créneau"
              value={
                !order.delivery?.status
                  ? "Sur place"
                  : order.delivery?.type === "express"
                    ? "Express"
                    : `Période (${order.delivery?.time || "Dès que possible"})`
              }
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Téléphone"
              value={order.delivery?.phone || "—"}
              small
              compact
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {(() => {
            const isSurPlace = !order.delivery?.status;
            const isExpress = order.delivery?.type === "express";
            const isDelivering = order.status === "delivering";

            if (isDelivering) {
              return (
                <View
                  style={[
                    styles.mapPlaceholder,
                    {
                      height: "100%",
                      marginBottom: 0,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    },
                  ]}
                >
                  <BikeAnimation />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#27500A",
                    }}
                  >
                    Livraison en cours...
                  </Text>
                </View>
              );
            }

            if (isSurPlace) {
              return (
                <View
                  style={[
                    styles.mapPlaceholder,
                    {
                      height: "100%",
                      marginBottom: 0,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={28}
                    color="#6B7280"
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#6B7280",
                    }}
                  >
                    Sur place
                  </Text>
                </View>
              );
            }

            if (isExpress) {
              return (
                <View
                  style={[
                    styles.mapPlaceholder,
                    {
                      height: "100%",
                      marginBottom: 0,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    },
                  ]}
                >
                  <Ionicons name="flash-outline" size={28} color="#ec4913" />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#ec4913",
                    }}
                  >
                    Express
                  </Text>
                  <Text style={{ fontSize: 10, color: "#9CA3AF" }}>
                    15-20 min
                  </Text>
                </View>
              );
            }

            // Livraison programmée
            return (
              <View
                style={[
                  styles.mapPlaceholder,
                  {
                    height: "100%",
                    marginBottom: 0,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  },
                ]}
              >
                <Ionicons name="time-outline" size={26} color="#2563eb" />
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: "#2563eb" }}
                >
                  {order.delivery?.time || "Dès que possible"}
                </Text>
                <Text style={{ fontSize: 10, color: "#9CA3AF" }}>
                  30-45 min
                </Text>
              </View>
            );
          })()}
        </View>
      </View>

      <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
        <Text style={styles.infoLabel}>Note de livraison</Text>
        <Text style={styles.infoValSm}>
          {order.delivery?.note || "Aucune note."}
        </Text>
      </View>

      {order.delivery?.voiceNoteUri ? (
        <>
          <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8 }]}>
            Message vocal
          </Text>
          <TouchableOpacity
            style={styles.voiceBar}
            activeOpacity={0.7}
            onPress={playSound}
          >
            <View style={styles.playBtn}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={16}
                color="#ec4913"
              />
            </View>
            <Waveform active={isPlaying} progress={playbackProgress} />
            <Text style={styles.waveDur}>
              {Math.round(playbackProgress * 100)}%
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View
          style={[
            styles.infoCard,
            { marginTop: 12, padding: 12, opacity: 0.5 },
          ]}
        >
          <Text style={styles.infoLabel}>Message vocal</Text>
          <Text style={styles.infoValSm}>Aucun message vocal</Text>
        </View>
      )}
    </>
  );
}

// Icônes alignées sur le bottom sheet du home (checkout/tabs/DetailTab).
const ITEM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  menu: "fast-food-outline",
  extra: "add-circle-outline",
  drink: "wine-outline",
};

const ITEM_LABEL: Record<string, string> = {
  menu: "Menu",
  extra: "Extra",
  drink: "Boisson",
};

const CURRENCY = "XAF";


function CommandesTab({
  items,
  total,
  zone = "",
  deliveryPrice = 0,
  deliveryOffered = false,
  deliveryGrouped = false,
}: {
  items: OrderItem[];
  total: number;
  zone?: string;
  deliveryPrice?: number;
  /** Livraison offerte (deliveryOffer actif, couvert par le fastfood). */
  deliveryOffered?: boolean;
  /** La commande partage son deliveryGroupId avec au moins une autre du sheet. */
  deliveryGrouped?: boolean;
}) {
  const hasDelivery =
    deliveryPrice > 0 || !!zone || deliveryOffered || deliveryGrouped;
  // Offert prime sur le groupé : le client ne paie rien dans les deux cas, mais
  // « Offert » porte l'info commerciale (bonus / campagne).
  const deliveryLabel = deliveryOffered
    ? "Offert"
    : deliveryGrouped
      ? "Cmd groupée"
      : deliveryPrice > 0
        ? `${deliveryPrice} ${CURRENCY}`
        : "Inclus";
  if (items.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
        }}
      >
        <Text style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
          Aucun détail de commande disponible
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
      }}
    >
      {/* Container arrondi : items scrollables + total fixe. Hauteur plafonnée
          (sheet à hauteur fixe) pour que la ligne de total reste visible. */}
      <View
        style={{
          flex: 1,
          maxHeight: ITEMS_CARD_MAX_H,
          backgroundColor: "#F9FAFB",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#F3F4F6",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
        >
          {items.map((o, i) => {
            const unitPrice = o.unitPrice || 0;
            const lineTotal = unitPrice * o.qty;
            const icon = ITEM_ICONS[o.type || "menu"];
            const typeLabel = ITEM_LABEL[o.type || "menu"];

            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 11,
                  borderBottomWidth:
                    i < items.length - 1 || hasDelivery ? 1 : 0,
                  borderBottomColor: "#F3F4F6",
                }}
              >
                {/* Plat : visuel du menu. Extra / boisson : icône. */}
                {o.type === "menu" && o.image ? (
                  <Image
                    source={{ uri: o.image }}
                    style={{ width: 34, height: 34, borderRadius: 9 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor:
                        o.type === "extra"
                          ? "#FFF7ED"
                          : o.type === "drink"
                            ? "#EFF6FF"
                            : "#F0FDF4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={icon} size={16} color="#ec4913" />
                  </View>
                )}

                {/* Nom + type label */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                    numberOfLines={1}
                  >
                    {o.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      marginTop: 1,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontWeight: "600",
                    }}
                  >
                    {typeLabel}
                  </Text>
                </View>

                {/* Prix */}
                <View style={{ alignItems: "flex-end" }}>
                  {o.hasQty && o.qty > 1 ? (
                    <>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#111827",
                        }}
                      >
                        {lineTotal} {CURRENCY}
                      </Text>
                      <Text
                        style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}
                      >
                        {unitPrice} {CURRENCY} × {o.qty}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      {unitPrice > 0 ? `${unitPrice} ${CURRENCY}` : "Inclus"}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Ligne livraison : zone + prix (comme la tab Commandes marchand) */}
          {hasDelivery && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 11,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="bicycle-outline" size={16} color="#ec4913" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                  numberOfLines={1}
                >
                  Livraison
                </Text>
                {zone ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      marginTop: 1,
                      fontWeight: "600",
                    }}
                  >
                    {zone}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    { fontSize: 13, fontWeight: "700", color: "#111827" },
                    // Offert / groupé : vert, comme chez le marchand.
                    (deliveryOffered || deliveryGrouped) && {
                      color: "#16A34A",
                      fontSize: 12,
                    },
                  ]}
                >
                  {deliveryLabel}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Total */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 14,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
            {deliveryGrouped ? "Total" : "Total commande"}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#ec4913" }}>
            {total} {CURRENCY}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoCard({
  label,
  value,
  small,
  compact,
}: {
  label: string;
  value: string;
  small?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.infoCard, compact && { padding: 10, flex: 1 }]}>
      <Text
        style={[styles.infoLabel, compact && { marginBottom: 2, fontSize: 9 }]}
      >
        {label}
      </Text>
      <Text style={[styles.infoVal, small && styles.infoValSm]}>{value}</Text>
    </View>
  );
}

function Waveform({
  active,
  progress = 0,
}: {
  active?: boolean;
  progress?: number;
}) {
  const heights = [
    4, 7, 12, 6, 10, 14, 8, 5, 11, 9, 13, 6, 8, 12, 5, 10, 7, 14, 6, 9, 11, 4,
    8, 12, 7, 5, 10, 13, 6, 9,
  ];
  return (
    <View style={styles.wave}>
      {heights.map((h, i) => {
        const barProgress = (i + 1) / heights.length;
        const isPlayed = progress >= barProgress;
        return (
          <View
            key={i}
            style={[
              styles.wavebar,
              { height: h },
              active && isPlayed && { backgroundColor: "#ec4913" },
              active && !isPlayed && { backgroundColor: "rgba(236,19,49,0.2)" },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "800",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  userAddr: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: "#4B5563",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  tab: {
    marginRight: 24,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#111827",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  mapPlaceholder: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  mapGridH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  mapGridV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  pinContainer: {
    position: "absolute",
    top: "35%",
    left: "51%",
  },
  pinRing: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#EF4444",
    opacity: 0.3,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  mapLabel: {
    position: "absolute",
    bottom: 10,
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapLoaderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapLoadingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ec4913",
    textTransform: "uppercase",
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  infoValSm: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  wavebar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  waveDur: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  cmdRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cmdIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  cmdName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  cmdQty: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  cmdPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  cmdTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cmdTotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cmdTotalVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#EF4444",
  },
  cmdQtyPrice: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 2,
  },
  // Chips « Cmd » dans le header (multi-commandes)
  cmdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cmdScroll: { flexDirection: "row", gap: 6, paddingRight: 2 },
  cmdChip: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cmdChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  cmdChipText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  cmdChipTextActive: { color: "#FFFFFF" },
  cmdMore: {
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  cmdMoreText: { fontSize: 10, fontWeight: "800", color: "#4B5563" },
  cmdNavTabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 32,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cmdNavTabs: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    // paddingBottom:32,
  },
  navArrow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cmdNavTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cmdNavTabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  cmdNavTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  cmdNavTabTextActive: {
    color: "#FFFFFF",
  },
});
