import React, { useEffect, useState, useRef } from 'react';
import { Animated, Text, StyleSheet, View, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      // Show animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 20,
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

      const timer = setTimeout(() => {
        // Hide animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: getBackgroundColor(),
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name={getIcon()} size={20} color="white" />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
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
    maxWidth: Dimensions.get('window').width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
