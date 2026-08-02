import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
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
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
    scrollEnabled={!readOnly}
  >
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
  </ScrollView>
);

const styles = StyleSheet.create({
  row: {
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.gray[300],
    backgroundColor: Theme.colors.white,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Theme.colors.gray[800],
  },
});
