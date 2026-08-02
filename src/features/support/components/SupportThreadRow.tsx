import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  getThreadName,
  getTopicDescriptor,
  SUPPORT_STATUS_LABEL,
} from "../data/support.mock";
import type { SupportThread } from "../types/support.types";

/** Date courte : « 14:05 » aujourd'hui, « 28 juil. » au-delà. */
const formatDate = (iso: string) => {
  const d = new Date(iso);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

interface Props {
  thread: SupportThread;
  onPress: (thread: SupportThread) => void;
}

/** Ligne de la liste des discussions passées. */
export const SupportThreadRow: React.FC<Props> = ({ thread, onPress }) => {
  const topic = getTopicDescriptor(thread.topic);
  return (
    <Pressable style={styles.row} onPress={() => onPress(thread)}>
      <View style={[styles.icon, { backgroundColor: `${topic.color}1A` }]}>
        <Ionicons name={topic.icon as any} size={18} color={topic.color} />
      </View>

      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.title} numberOfLines={1}>
            {getThreadName(thread)}
          </Text>
          <Text style={styles.date}>{formatDate(thread.updatedAt)}</Text>
        </View>

        <View style={styles.line}>
          <Text style={styles.preview} numberOfLines={1}>
            {thread.lastMessage}
          </Text>
          {thread.unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{thread.unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.status, { color: topic.color }]}>
          {thread.title} · {topic.label} · {SUPPORT_STATUS_LABEL[thread.status]}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    alignItems: "center",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.round,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "700",
    color: Theme.colors.dark,
  },
  date: { fontSize: 11.5, color: Theme.colors.gray[600] },
  preview: { flex: 1, fontSize: 13, color: Theme.colors.gray[700] },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Theme.borderRadius.round,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.white,
  },
  status: { fontSize: 11.5, fontWeight: "600" },
});
