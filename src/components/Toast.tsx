import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text, StyleSheet, SafeAreaView, Dimensions, PanResponder, Platform } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import { DS } from '@/src/theme/ds';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const hidden = useRef(false);

  // Fermeture : animation de sortie puis onHide (une seule fois).
  const hide = (toX = 0, toY = -100) => {
    if (hidden.current) return;
    hidden.current = true;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: toY, duration: 250, useNativeDriver: true }),
      Animated.timing(swipeX, { toValue: toX, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onHide?.());
  };

  // Glisser vers le haut ou vers la droite pour fermer.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) swipeX.setValue(g.dx);
        if (g.dy < 0) slideAnim.setValue(4 + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) hide(Dimensions.get('window').width, 4);
        else if (g.dy < -30) hide(0, -150);
        else
          Animated.parallel([
            Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 4, useNativeDriver: true }),
          ]).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (message) {
      // Show animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 4,
          useNativeDriver: true,
          tension: 20,
          friction: 4,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => hide(), duration);

      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return DS.success;
      case 'error': return DS.danger;
      default: return DS.info;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const content = (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.toast,
          {
            backgroundColor: getBackgroundColor(),
            transform: [{ translateY: slideAnim }, { translateX: swipeX }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name={getIcon()} size={20} color="white" />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );

  // iOS : FullWindowOverlay = fenêtre native au-dessus de TOUT (Modals, voiles,
  // sheets). Android : le toast est rendu en dernier, zIndex/elevation max.
  return Platform.OS === 'ios' ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
};

const styles = StyleSheet.create({
  container: {
    // Collé sous la barre d'état (SafeAreaView) : couvre l'en-tête.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    // Presque pleine largeur : couvre aussi les éléments des bords.
    width: Dimensions.get('window').width - 16,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 9999,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
