import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import React, { useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, View } from "react-native";
import { styles } from "./AddMenuSheet.styles";
import { MODAL_HEIGHT } from "./menuFormConstants";

// Pressable animable (pour le fondu du backdrop flouté).
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Animation d'ouverture/fermeture du formulaire menu en mode Modal.
 * anim : 0 = fermé, 1 = ouvert. Pilote l'opacité du blur et le translateY de la sheet.
 * rendered : garde le Modal monté le temps de jouer l'animation de sortie.
 */
export const useSheetAnimation = (visible: boolean, embedded: boolean) => {
  const anim = React.useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(false);

  React.useEffect(() => {
    if (embedded) return;
    if (visible) {
      setRendered(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setRendered(false));
    }
    // anim est stable (ref) ; rendered ne doit pas relancer l'effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, embedded]);

  // Joue la sortie (blur fade + sheet slide down) puis rappelle `done`.
  const closeAnimated = (done: () => void) =>
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setRendered(false);
      done();
    });

  return { anim, rendered, closeAnimated };
};

/** Coque Modal du formulaire menu (flou + sheet en translation). */
export const MenuFormModal: React.FC<{
  rendered: boolean;
  anim: Animated.Value;
  onRequestClose: () => void;
  bottomInset: number;
  children: React.ReactNode;
}> = ({ rendered, anim, onRequestClose, bottomInset, children }) => (
  <Modal
    visible={rendered}
    transparent
    animationType="none"
    statusBarTranslucent
    onRequestClose={onRequestClose}
  >
    <View style={styles.overlay}>
      {/* Flou + dégradé orange (comme le header général) — vient en fondu, tap pour fermer */}
      <AnimatedPressable
        style={[StyleSheet.absoluteFill, { opacity: anim }]}
        onPress={onRequestClose}
      >
        <BlurView
          intensity={40}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.overlayDim} />
      </AnimatedPressable>
      {/* La sheet vient en translation (slide up/down) et ne ferme pas au tap */}
      <Animated.View
        style={[
          styles.sheetWrap,
          // La barre de navigation système recouvrait le bas de la sheet.
          // ⚠️ Pas de `paddingBottom` ici : un padding sur CE wrapper pousse
          // `sheet` (fond blanc, flex:1) vers le haut et laisse voir le
          // fond gris de l'overlay sous le footer, au lieu d'un fond blanc
          // continu. `bottomInset` doit gonfler la hauteur totale
          // uniquement — l'absorption se fait dans le footer (padding
          // interne, cf. styles.footer dans `AddMenuSheetMultiStep`).
          { height: MODAL_HEIGHT + bottomInset },
          {
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [MODAL_HEIGHT, 0],
                }),
              },
            ],
          },
        ]}
      >
        {children}
        <SafeAreaDebugBand />
      </Animated.View>
    </View>
    {/* Toast global au premier plan (Android). */}
    <GlobalToastHost modal />
  </Modal>
);
