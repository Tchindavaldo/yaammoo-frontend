import { Theme } from "@/src/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SupportMessage } from "../types/support.types";

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Bulle de message : utilisateur à droite (accent), support à gauche (gris). */
export const SupportMessageBubble: React.FC<{ message: SupportMessage }> = ({
  message,
}) => {
  const mine = message.author === "user";
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, mine && styles.textMine]}>
          {message.text}
        </Text>
        <Text style={[styles.time, mine && styles.timeMine]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { paddingHorizontal: Theme.spacing.md, marginBottom: Theme.spacing.sm },
  rowMine: { alignItems: "flex-end" },
  rowTheirs: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
  },
  mine: {
    backgroundColor: Theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  theirs: {
    backgroundColor: Theme.colors.gray[100],
    borderBottomLeftRadius: 6,
  },
  text: { fontSize: 14.5, lineHeight: 20, color: Theme.colors.dark },
  textMine: { color: Theme.colors.white },
  time: {
    marginTop: 3,
    fontSize: 10.5,
    color: Theme.colors.gray[600],
    alignSelf: "flex-end",
  },
  timeMine: { color: "rgba(255,255,255,0.8)" },
});
