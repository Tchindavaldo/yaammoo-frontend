import { BlurView } from "expo-blur";
import React from "react";
import { Animated, StyleSheet, View } from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Le sheet de checkout fait 384px de haut (cf. CheckoutSheet.styles → sheetContainer).
const SHEET_HEIGHT = 384;
// Hauteur réservée en bas pour la capsule de paiement (CheckoutPaymentOverlay)
// + gap pour ne pas coller les deux overlays.
const BOTTOM_CAPSULE_SPACE = 70; // hauteur capsule
const GAP = 12; // espace entre les deux overlays

interface CheckoutPaymentTopOverlayProps {
  visible: boolean;
  paymentState?:
    | "network_select"
    | "input"
    | "ussd_sent"
    | "success"
    | "success_created"
    | "failed";
  network?: "orange" | "mtn";
  ussdMessage?: string;
}

/**
 * Second overlay rendu AU-DESSUS de la capsule de paiement.
 * Occupe tout l'espace vertical disponible jusqu'au gap au-dessus de la capsule.
 * Contenu à remplir.
 */
export const CheckoutPaymentTopOverlay: React.FC<
  CheckoutPaymentTopOverlayProps
> = ({ visible }) => {
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

  if (!mounted) return null;

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
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        {/* Contenu à remplir */}
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
