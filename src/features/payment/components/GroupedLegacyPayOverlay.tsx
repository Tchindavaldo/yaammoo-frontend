"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Capsule flottante de l'ANCIENNE page 5 du parcours groupe, extraite de
// CartGroupedDeliverySheet (R4). CONSERVEE mais plus atteinte : le parcours
// s'arrete a la page 4, dont la capsule dediee (CartGroupedDetailCapsule)
// porte la saisie. Rendue HORS du sheet pour remonter avec le clavier.
import { AppBlurView } from "@/src/components/AppBlurView";
import React from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { CartPaymentState } from "../hooks/useCartPayment";
import { CAPSULE_BOTTOM_OFFSET, styles } from "./CartGroupedDeliverySheet.styles";
import { CartPaymentOverlay } from "./CartPaymentOverlay";
import { styles as sheetStyles } from "./CartPaymentSheet.styles";

/** Hauteur de la capsule flottante (`CartPaymentOverlay.styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule. */
const VEIL_TOP_GAP = 10;
/** Ecart capsule / haut du clavier (sans `insets.bottom`, couvert par le clavier). */
const CAPSULE_KEYBOARD_GAP = 8;

interface Props {
  show: boolean;
  paymentState: CartPaymentState;
  setPaymentState: (s: CartPaymentState) => void;
  keyboardHeight: Animated.Value | Animated.AnimatedInterpolation<number>;
  translateY: Animated.AnimatedInterpolation<number>;
  phone: string;
  onPhoneChange: (phone: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  totalAmount: number;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  ussdMessage?: string | null;
  onClose: () => void;
  onError: (message: string) => void;
}

export const GroupedLegacyPayOverlay: React.FC<Props> = ({
  show,
  paymentState,
  setPaymentState,
  keyboardHeight,
  translateY,
  phone,
  onPhoneChange,
  onConfirm,
  totalAmount,
  network,
  onNetworkChange,
  ussdMessage,
  onClose,
  onError,
}) => {
  const payOverlayAnim = React.useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(false);
  // Glissement d'ENTREE, distinct du fondu (reste a 1 a la sortie).
  const payEnterAnim = React.useRef(new Animated.Value(0)).current;
  // Dernier etat REELLEMENT affiche : gele pendant le fondu de sortie.
  const lastPayState = React.useRef<CartPaymentState>("input");
  // Hauteur clavier GELEE pour la capsule pendant la sortie.
  const veilKb = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!show) return;
    veilKb.setValue(0);
    const id = (keyboardHeight as Animated.Value).addListener(({ value }) => {
      veilKb.setValue(value);
    });
    return () => (keyboardHeight as Animated.Value).removeListener(id);
  }, [show, keyboardHeight, veilKb]);

  React.useEffect(() => {
    if (show) lastPayState.current = paymentState;
  }, [show, paymentState]);

  React.useEffect(() => {
    if (show) {
      setMounted(true);
      payEnterAnim.setValue(0);
      Animated.timing(payEnterAnim, { toValue: 1, duration: 260, useNativeDriver: false }).start();
      // `useNativeDriver: false` OBLIGATOIRE : cohabite avec `height`/`bottom`
      // calcules sur `keyboardHeight` (pilote en JS dans cart.tsx).
      Animated.timing(payOverlayAnim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
      return;
    }
    // Sortie douce en fondu.
    Animated.timing(payOverlayAnim, {
      toValue: 0,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [show, payOverlayAnim, payEnterAnim]);

  if (!mounted) return null;

  // Sortie ETAGEE : la capsule s'efface d'abord, le voile la suit.
  const capsuleOpacity = payOverlayAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: "clamp" });
  const veilOpacity = payOverlayAnim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <Animated.View pointerEvents="box-none" style={[sheetStyles.capsuleSlot, { transform: [{ translateY }] }]}>
      {/* Voile FLOUTE de la zone basse, sous la capsule. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.keyboardVeil,
          {
            opacity: veilOpacity,
            height: Animated.add(veilKb, CAPSULE_BOTTOM_OFFSET + CAPSULE_KEYBOARD_GAP + CAPSULE_HEIGHT + VEIL_TOP_GAP),
          },
        ]}
      >
        <AppBlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} fallbackStyle={styles.keyboardVeilFallback} />
        <View pointerEvents="none" style={styles.keyboardVeilTint} />
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: capsuleOpacity,
            transform: [{ translateY: payEnterAnim.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }],
          },
        ]}
      >
        <CartPaymentOverlay
          phone={phone}
          onPhoneChange={onPhoneChange}
          onConfirm={onConfirm}
          totalAmount={totalAmount}
          paymentState={show ? paymentState : lastPayState.current}
          setPaymentState={setPaymentState}
          network={network}
          onNetworkChange={onNetworkChange}
          ussdMessage={ussdMessage}
          onClose={onClose}
          onError={onError}
          isKeyboardVisible
          autoFocus
          blurFallbackStyle={styles.payCapsuleBlurFallback}
          bottom={Animated.add(veilKb, CAPSULE_BOTTOM_OFFSET + CAPSULE_KEYBOARD_GAP)}
        />
      </Animated.View>
    </Animated.View>
  );
};
