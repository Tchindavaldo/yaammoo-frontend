import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useBottomSafeArea } from "@/src/hooks/usePageBottomInset";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";

import { onBackgroundPromptRequest } from "../services/backgroundPrompt";

/**
 * Écran d'information avant la popup système « Toujours » (localisation
 * arrière-plan). COPIE DÉDIÉE (R16) de `OtaUpdateCard` : même carte sombre
 * flottante par-dessus la barre d'onglets, même pastille teintée, même dégradé
 * et même entrée. Écarts : pas de retrait automatique ni de trait de décompte
 * (un choix est attendu), deux boutons « Plus tard » / « Continuer » à la place
 * de la croix.
 *
 * Montée une seule fois à la racine (`app/_layout.tsx`), elle répond aux
 * demandes de `useUserLocationSync` via `backgroundPrompt`.
 */

const TITLE = "Suivez vos livraisons en direct";
/** Libellé du choix « Toujours » dans la popup système (iOS et Android). */
const ALWAYS_LABEL = "Toujours autoriser";
const MESSAGE =
  Platform.OS === "android"
    ? `Sur l'écran suivant, choisissez « ${ALWAYS_LABEL} » : le livreur vous localise même app fermée, et vous voyez les restaurants et offres de votre ville.`
    : `Dans la fenêtre suivante, choisissez « ${ALWAYS_LABEL} » : le livreur vous localise même app fermée, et vous voyez les restaurants et offres de votre ville.`;

/** Ecart entre le bas de la carte et le bas visible de la barre (cf. OTA). */
const BOTTOM_GAP = 7;

export const BackgroundLocationPromptCard = () => {
  // Bande safe-area basse : source unique (R19) ; la carte flotte au-dessus.
  const band = useBottomSafeArea();
  const [visible, setVisible] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const answerRef = useRef<((accepted: boolean) => void) | null>(null);

  const show = useCallback(() => {
    setVisible(true);
    enter.setValue(0);
    Animated.spring(enter, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [enter]);

  /** Ferme la carte puis transmet le choix (la popup système suit la sortie). */
  const answer = useCallback(
    (accepted: boolean) => {
      const reply = answerRef.current;
      answerRef.current = null;
      Animated.timing(enter, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        reply?.(accepted);
      });
    },
    [enter],
  );

  useEffect(() => {
    const unsubscribe = onBackgroundPromptRequest((reply) => {
      answerRef.current = reply;
      show();
    });
    return () => {
      unsubscribe();
      // Démontée en attente : on ne bloque pas le hook.
      answerRef.current?.(false);
      answerRef.current = null;
    };
  }, [show]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: band + BOTTOM_GAP }]}
    >
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          {
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
              {
                scale: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Dégradé sur tout le fond, comme la carte OTA : fond à gauche,
            teinte à droite. Rogné par son propre calque (ombre intacte). */}
        <LinearGradient
          pointerEvents="none"
          colors={[DS.ink, DS.accentAlpha(0.3)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />

        <View style={styles.row}>
          <View style={styles.badge}>
            <View style={styles.badgeDot}>
              <Ionicons name="navigate" size={14} color={DS.onInk} />
            </View>
          </View>
          <View style={styles.texts}>
            <Text style={styles.title}>{TITLE}</Text>
            <Text style={styles.message}>{MESSAGE}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => answer(false)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              styles.later,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.laterText}>Plus tard</Text>
          </Pressable>
          <Pressable
            onPress={() => answer(true)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              styles.continue,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueText}>Continuer</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // Alignée sur les bords des cartes de plats du home (comme la carte OTA).
    left: Theme.design.horizontalPadding,
    right: Theme.design.horizontalPadding,
    zIndex: 9999,
    elevation: 14,
  },
  card: {
    gap: 16,
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: DS.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.onInkLine,
    // ⚠️ Pas d'`overflow: hidden` : sur iOS il couperait l'ombre.
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 18,
  },
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accentAlpha(0.2),
  },
  badgeDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accent,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: DS.onInk,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: DS.onInkMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  later: {
    backgroundColor: DS.onInkFill,
  },
  continue: {
    backgroundColor: DS.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  laterText: {
    fontSize: 14,
    fontWeight: "700",
    color: DS.onInkMuted,
  },
  continueText: {
    fontSize: 14,
    fontWeight: "700",
    color: DS.onInk,
  },
});
