import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  placeholder?: string;
}

/** Barre de réponse de la boutique (bas de l'écran). */
export const MerchantSupportComposer: React.FC<Props> = ({
  value,
  onChangeText,
  onSend,
  placeholder = "Répondre au client…",
}) => {
  const canSend = value.trim().length > 0;
  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.gray[500]}
        multiline
      />
      <Pressable
        style={[styles.send, !canSend && styles.sendOff]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Ionicons name="arrow-up" size={18} color={Theme.colors.white} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.gray[200],
    backgroundColor: Theme.colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Theme.colors.gray[100],
    fontSize: 14.5,
    color: Theme.colors.dark,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: Theme.colors.gray[400] },
});
