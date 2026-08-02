import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SUPPORT_TOPICS } from "../data/support.mock";
import type { SupportTopic } from "../types/support.types";

interface Props {
  /** Sujet actif, `null` tant que l'utilisateur n'a rien choisi. */
  value: SupportTopic | null;
  onChange: (topic: SupportTopic) => void;
  /** Lecture seule : chat déjà ouvert, le sujet n'est plus modifiable. */
  readOnly?: boolean;
}

/** Rangée de chips « objet de la discussion », en haut d'un nouveau chat. */
export const SupportTopicChips: React.FC<Props> = ({
  value,
  onChange,
  readOnly = false,
}) => (
  <View style={styles.row}>
    {SUPPORT_TOPICS.filter((t) => !readOnly || t.id === value).map((t) => {
      const active = t.id === value;
      return (
        <Pressable
          key={t.id}
          disabled={readOnly}
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
