import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SUPPORT_TOPICS } from "../data/support.constants";
import type { SupportTopic } from "../types/support.types";

interface Props {
  /** Sujet actif, `null` tant que l'utilisateur n'a rien choisi. */
  value: SupportTopic | null;
  onChange: (topic: SupportTopic) => void;
}

/**
 * Chips « objet de la discussion » d'un nouveau chat. Une fois l'objet choisi,
 * la rangée disparaît : l'objet est repris dans le header.
 */
export const SupportTopicChips: React.FC<Props> = ({ value, onChange }) => (
  <View style={styles.row}>
    {SUPPORT_TOPICS.map((t) => {
      const active = t.id === value;
      return (
        <Pressable
          key={t.id}
          onPress={() => onChange(t.id)}
          style={[
            styles.chip,
            active && { backgroundColor: t.color, borderColor: t.color },
          ]}
        >
          <Ionicons
            name={t.icon as any}
            size={14}
            color={active ? Theme.colors.white : t.color}
          />
          <Text
            style={[styles.label, active && { color: Theme.colors.white }]}
            numberOfLines={1}
          >
            {t.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.gray[300],
    backgroundColor: Theme.colors.white,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Theme.colors.gray[800],
  },
});
