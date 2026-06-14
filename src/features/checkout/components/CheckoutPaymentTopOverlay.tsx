import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Menu } from "@/src/types";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Le sheet de checkout fait 384px de haut (cf. CheckoutSheet.styles → sheetContainer).
const SHEET_HEIGHT = 384;
// Hauteur réservée en bas pour la capsule de paiement (CheckoutPaymentOverlay)
// + gap pour ne pas coller les deux overlays.
const BOTTOM_CAPSULE_SPACE = 70; // hauteur capsule
const GAP = 12; // espace entre les deux overlays

type PaymentState =
  | "network_select"
  | "input"
  | "ussd_sent"
  | "success"
  | "success_created"
  | "failed";

interface CheckoutPaymentTopOverlayProps {
  visible: boolean;
  menu: Menu | null;
  menuPrice: number;
  extrasPrice: number;
  drinksPrice: number;
  deliveryPrice: number;
  total: number;
  paymentState?: PaymentState;
  network?: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
  ussdMessage?: string;
}

/* ------------------------------------------------------------------ */
/* Sous-composants DUPLIQUÉS depuis le checkout (markup propre au top  */
/* overlay — on ne réutilise pas les composants checkout pour ne rien  */
/* casser).                                                            */
/* ------------------------------------------------------------------ */

// Header menu : photo + titre + description (cf. DetailTab > productHeader).
const MenuHeader: React.FC<{ menu: Menu }> = ({ menu }) => {
  const image =
    menu.images && menu.images.length > 0 ? menu.images[0] : menu.image;
  return (
    <View style={styles.menuHeader}>
      <Image source={{ uri: image }} style={styles.menuImage} />
      <View style={styles.menuHeaderInfo}>
        <Text style={styles.menuTitle} numberOfLines={1}>
          {menu.titre}
        </Text>
        <Text style={styles.menuDesc} numberOfLines={2}>
          Produit de qualité supérieure préparé avec soin par nos chefs Yaammoo.
        </Text>
      </View>
    </View>
  );
};

// Récap prix (menu / boisson / extras / livraison) — SANS le total.
const PriceRecap: React.FC<{
  menuPrice: number;
  drinksPrice: number;
  extrasPrice: number;
  deliveryPrice: number;
}> = ({ menuPrice, drinksPrice, extrasPrice, deliveryPrice }) => {
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }[] = [
    { icon: "fast-food-outline", label: "Menu", value: menuPrice },
    { icon: "wine-outline", label: "Boisson", value: drinksPrice },
    { icon: "add-circle-outline", label: "Extras", value: extrasPrice },
    { icon: "bicycle-outline", label: "Livraison", value: deliveryPrice },
  ];
  return (
    <View style={styles.recapRow}>
      {rows.map((r) => (
        <View key={r.label} style={styles.recapItem}>
          <Ionicons name={r.icon} size={16} color="#ec4913" />
          <Text style={styles.recapLabel}>{r.label}</Text>
          <Text style={styles.recapValue}>{r.value} F</Text>
        </View>
      ))}
    </View>
  );
};

// Zone d'action variable selon paymentState.
const ActionArea: React.FC<{
  // Conservé pour faire varier les actions selon l'étape (suite à implémenter).
  paymentState: PaymentState;
  network: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
}> = ({ network, onNetworkChange }) => {
  // Pour l'instant : uniquement la sélection du réseau.
  return (
    <View style={styles.actionArea}>
      <Text style={styles.actionTitle}>
        Sélectionnez le réseau utilisé pour le paiement
      </Text>
      <View style={styles.networkRow}>
        {(["orange", "mtn"] as const).map((net) => {
          const active = network === net;
          return (
            <TouchableOpacity
              key={net}
              style={[styles.networkChip, active && styles.networkChipActive]}
              onPress={() => onNetworkChange?.(net)}
            >
              <Text
                style={[
                  styles.networkChipText,
                  active && styles.networkChipTextActive,
                ]}
              >
                {net === "orange" ? "Orange Money" : "MTN MoMo"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ */

/**
 * Second overlay rendu AU-DESSUS de la capsule de paiement.
 * Affiche : header menu + récap prix + total (plus grand) + zone d'action.
 */
export const CheckoutPaymentTopOverlay: React.FC<
  CheckoutPaymentTopOverlayProps
> = ({
  visible,
  menu,
  menuPrice,
  extrasPrice,
  drinksPrice,
  deliveryPrice,
  total,
  paymentState = "network_select",
  network = "orange",
  onNetworkChange,
}) => {
  const anim = React.useRef(new Animated.Value(0)).current; // 0 = caché, 1 = visible
  // Reste monté tant que l'animation de sortie n'est pas terminée.
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220, // synchro avec la fermeture de la capsule du bas (handleClose)
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted || !menu) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.panel,
          {
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
              {
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedBlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          <MenuHeader menu={menu} />

          <PriceRecap
            menuPrice={menuPrice}
            drinksPrice={drinksPrice}
            extrasPrice={extrasPrice}
            deliveryPrice={deliveryPrice}
          />

          {/* Total affiché à part, plus grand */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{total} FCFA</Text>
          </View>

          <ActionArea
            paymentState={paymentState}
            network={network}
            onNetworkChange={onNetworkChange}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // Contraint à la zone du sheet (ancré en bas), pas tout l'écran.
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    // Laisse la place à la capsule du bas + le gap.
    paddingBottom: BOTTOM_CAPSULE_SPACE + GAP,
    paddingHorizontal: 8,
    paddingTop: 8,
    zIndex: 99, // juste sous la capsule (zIndex 100)
  },
  panel: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  // --- Header menu ---
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  menuHeaderInfo: {
    flex: 1,
  },
  menuTitle: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "700",
  },
  menuDesc: {
    color: "rgba(31,41,55,0.55)",
    fontSize: 12,
    marginTop: 2,
  },
  // --- Récap prix ---
  recapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  recapItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  recapLabel: {
    color: "rgba(31,41,55,0.6)",
    fontSize: 11,
  },
  recapValue: {
    color: "#1f2937",
    fontSize: 12,
    fontWeight: "600",
  },
  // --- Total ---
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  totalLabel: {
    color: "rgba(31,41,55,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  totalValue: {
    color: "#ec4913",
    fontSize: 24,
    fontWeight: "800",
  },
  // --- Zone d'action ---
  actionArea: {
    marginTop: "auto",
  },
  actionTitle: {
    color: "rgba(31,41,55,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  networkRow: {
    flexDirection: "row",
    gap: 10,
  },
  networkChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  networkChipActive: {
    backgroundColor: "rgba(236, 73, 19, 0.12)",
    borderColor: "#ec4913",
  },
  networkChipText: {
    color: "rgba(31,41,55,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  networkChipTextActive: {
    color: "#ec4913",
  },
});
