import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CartPaymentState } from "../hooks/useCartPayment";
// Corps du paiement : partage avec le 3e calque du sheet de livraison groupee.
import { CartPaymentBody } from "./CartPaymentBody";
import { CartPaymentOverlay } from "./CartPaymentOverlay";
// Palette et styles : extraits dans un fichier dedie (R4, taille de fichier).
import { C, styles } from "./CartPaymentSheet.styles";

interface CartPaymentSheetProps {
  visible: boolean;
  /** Groupes payés : alimentent le récapitulatif et l'en-tête de réception. */
  groups: CartZoneGroup[];
  /** Montant réellement envoyé au backend (livraison mutualisée incluse). */
  totalAmount: number;
  phone: string;
  onPhoneChange: (phone: string) => void;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  paymentState: CartPaymentState;
  setPaymentState: (s: CartPaymentState) => void;
  ussdMessage?: string | null;
  onConfirm: (phone: string) => Promise<void>;
  onClose: () => void;
  onError?: (message: string) => void;
  /** Hauteur du clavier : la capsule du bas remonte avec lui. */
  keyboardHeight: Animated.Value | Animated.AnimatedInterpolation<number>;
  isKeyboardVisible: boolean;
}

/** Hauteur reservee en bas du sheet pour la capsule de paiement. */
const CAPSULE_SPACE = 70;
/** Marge sous la capsule (la decolle du bas du sheet / de la nav bar). */
const CAPSULE_BOTTOM_OFFSET = 18;

/**
 * Bottom sheet de paiement du panier — design « Panier - Paiement ».
 *
 * Sheet unique, autonome : en-tête, cards de **mode de livraison**,
 * récapitulatif du panier (articles / livraison / total) et choix du moyen de
 * paiement Mobile Money. La saisie du numéro et les étapes du paiement sont
 * portées par la **capsule** (`CartPaymentOverlay`), ancrée sur le bas du sheet
 * — il n'y a donc ni champ ni bouton « Payer » dans le corps.
 *
 * Il REMPLACE `CartPaymentTopCard` pour le bouton « commander » du récap du bas.
 * Le sheet de paiement d'une commande individuelle n'est pas concerné.
 */
export const CartPaymentSheet: React.FC<CartPaymentSheetProps> = ({
  visible,
  groups,
  totalAmount,
  phone,
  onPhoneChange,
  network,
  onNetworkChange,
  paymentState,
  setPaymentState,
  ussdMessage,
  onConfirm,
  onClose,
  onError,
  keyboardHeight,
  isKeyboardVisible,
}) => {
  const insets = useSafeAreaInsets();
  const anim = React.useRef(new Animated.Value(0)).current;
  // Reste monté le temps de l'animation de sortie.
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
        duration: 260,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  // Paiement parti : plus de fermeture au tap ni de changement de reseau.
  const isBusy =
    paymentState === "waiting" ||
    paymentState === "ussd_sent" ||
    paymentState === "success" ||
    paymentState === "success_created";

  if (!mounted) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [900, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Voile : ferme le sheet au tap, comme le scrim du design. */}
      <Animated.View style={[styles.scrim, { opacity: anim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isBusy ? undefined : onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            // Place reservee a la capsule, posee par-dessus le bas du sheet.
            paddingBottom:
              CAPSULE_SPACE + CAPSULE_BOTTOM_OFFSET + 12 + insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Paiement de la commande</Text>
          </View>
          <TouchableOpacity
            style={styles.close}
            onPress={onClose}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={C.inkSoft} />
          </TouchableOpacity>
        </View>

        <CartPaymentBody
          groups={groups}
          totalAmount={totalAmount}
          network={network}
          onNetworkChange={onNetworkChange}
          isBusy={isBusy}
        />
      </Animated.View>

      {/* Capsule de saisie / étapes du paiement — celle de l'autre sheet de
          paiement (`CartPaymentOverlay`), rendue HORS du sheet (qui a
          `overflow: hidden`) : elle remonte seule au-dessus du contenu quand le
          clavier s'ouvre, sans être rognée. Elle glisse avec le sheet. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.capsuleSlot, { transform: [{ translateY }] }]}
      >
        <CartPaymentOverlay
          phone={phone}
          onPhoneChange={onPhoneChange}
          onConfirm={onConfirm}
          totalAmount={totalAmount}
          paymentState={paymentState}
          setPaymentState={setPaymentState}
          network={network}
          onNetworkChange={onNetworkChange}
          ussdMessage={ussdMessage}
          onClose={onClose}
          onError={onError}
          isKeyboardVisible={isKeyboardVisible}
          /* Ancrée sur le bas de l'écran + la hauteur du clavier, comme dans
             `CartPaymentTopCard` : seule la capsule bouge, le sheet non. */
          bottom={Animated.add(
            keyboardHeight as any,
            CAPSULE_BOTTOM_OFFSET + insets.bottom,
          )}
        />
      </Animated.View>
    </Modal>
  );
};
