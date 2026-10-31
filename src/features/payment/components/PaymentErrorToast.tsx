// ============================================================================
// PaymentErrorToast — Toast d'erreur des paiements (copie de components/Toast)
// ----------------------------------------------------------------------------
// Dupliqué (R16) : plus haut (collé sous la barre d'état) et plus large que le
// Toast générique, pour couvrir l'en-tête et ses bords. Couleurs DS (R18).
// ============================================================================
import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, SafeAreaView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DS } from "@/src/theme/ds";

interface PaymentErrorToastProps {
  message: string;
  duration?: number;
  onHide?: () => void;
}

/** Marge latérale de chaque côté. */
const SIDE_GAP = 8;

export const PaymentErrorToast: React.FC<PaymentErrorToastProps> = ({ message, duration = 10000, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 4, useNativeDriver: true, tension: 20, friction: 4 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.toast, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
        <Ionicons name="alert-circle" size={20} color={DS.onInk} />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    width: Dimensions.get("window").width - SIDE_GAP * 2,
    backgroundColor: DS.danger,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  text: { color: DS.onInk, fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
