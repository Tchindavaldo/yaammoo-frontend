import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ST } from "./staffTheme";

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Pastille orange à droite du libellé (ex. nombre de permissions). */
  badge?: string | number;
}

/** Bouton pilule noir des feuilles Personnel (bas de feuille, 54 px). */
export const StaffPrimaryButton: React.FC<Props> = ({ label, onPress, disabled, loading, badge }) => {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btn,
        disabled && !loading ? styles.off : styles.on,
        pressed && !off && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={[styles.text, disabled && { color: "#8A8A90" }]}>{label}</Text>
          {badge !== undefined && !disabled && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  on: {
    backgroundColor: ST.ink,
    shadowColor: ST.ink,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  off: { backgroundColor: ST.line },
  text: { fontSize: 16, fontWeight: "700", color: "#fff" },
  badge: {
    height: 24,
    minWidth: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.accent,
  },
  badgeText: { fontSize: 13, fontWeight: "800", color: ST.ink },
});
