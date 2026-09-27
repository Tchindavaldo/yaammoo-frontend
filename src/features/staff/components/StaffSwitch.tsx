import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ST } from "./staffTheme";

interface Props {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

const TRAVEL = 18;

/** Interrupteur de la maquette (piste orange, pastille blanche), identique iOS/Android. */
export const StaffSwitch: React.FC<Props> = ({ value, onValueChange, label, disabled }) => {
  const [x] = useState(() => new Animated.Value(value ? TRAVEL : 0));

  useEffect(() => {
    Animated.timing(x, { toValue: value ? TRAVEL : 0, duration: 160, useNativeDriver: true }).start();
  }, [value, x]);

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={8}
      style={[
        styles.track,
        { backgroundColor: value ? ST.accent : ST.track },
        disabled && { opacity: 0.5 },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: { width: 46, height: 28, padding: 3, borderRadius: 14 },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: ST.ink,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
