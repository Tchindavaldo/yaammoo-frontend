import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BroadcastItem } from "../../types/broadcast.types";
import { audienceLabel } from "./BroadcastAudiencePicker";
import { BC, capsLabel } from "./broadcastTheme";

/** Gabarit d'une ligne selon le nombre d'envois affichés (2, 3, 4 et plus). */
export interface RowLayout {
  min: number;
  thumb: number;
  thumbRadius: number;
  fontSize: number;
  lines: number;
  pad: number;
  radius: number;
  /** true : les lignes se partagent la hauteur jusqu'au bouton d'écriture. */
  grow: boolean;
}

export const rowLayoutFor = (count: number): RowLayout => {
  if (count <= 2)
    return { min: 96, thumb: 80, thumbRadius: 20, fontSize: 16, lines: 2, pad: 8, radius: 26, grow: true };
  if (count === 3)
    return { min: 72, thumb: 56, thumbRadius: 16, fontSize: 15, lines: 2, pad: 8, radius: 22, grow: true };
  return { min: 52, thumb: 40, thumbRadius: 12, fontSize: 14, lines: 1, pad: 6, radius: 18, grow: count === 4 };
};

/** « MES CLIENTS · 124 PERSONNES » ; le nombre n'est connu qu'après diffusion. */
export const audienceSummary = (item: BroadcastItem) => {
  const who = audienceLabel(item.audience, item.city).toUpperCase();
  const n = item.recipientsCount;
  return n > 0 ? `${who} · ${n} PERSONNE${n > 1 ? "S" : ""}` : who;
};

/** Vignette d'un envoi : sa photo, sinon une cloche sur fond teinté. */
export const BroadcastThumb: React.FC<{ uri?: string; size: number; radius: number }> = ({
  uri,
  size,
  radius,
}) => {
  const box = { width: size, height: size, borderRadius: radius };
  if (uri) return <Image source={{ uri }} style={box} contentFit="cover" transition={150} />;
  return (
    <View style={[box, styles.thumbEmpty]}>
      <Ionicons name="notifications" size={Math.round(size * 0.4)} color={BC.accent} />
    </View>
  );
};

interface Props {
  item: BroadcastItem;
  when: string;
  layout: RowLayout;
  open: boolean;
  onToggle: () => void;
  onReuse: () => void;
}

/** Envoi replié (vignette, date, titre) ; déplié, il montre le message et « Réutiliser ». */
export const BroadcastHistoryRow: React.FC<Props> = ({
  item,
  when,
  layout: c,
  open,
  onToggle,
  onReuse,
}) => (
  <View
    style={[
      styles.row,
      { minHeight: c.min, borderRadius: c.radius, flexGrow: c.grow ? 1 : 0 },
    ]}
  >
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        styles.head,
        { padding: c.pad, paddingRight: 14, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <BroadcastThumb uri={item.imageUrl} size={c.thumb} radius={c.thumbRadius} />
      <View style={styles.texts}>
        <Text style={capsLabel} numberOfLines={1}>
          {when}
        </Text>
        <Text
          style={[styles.title, { fontSize: c.fontSize, lineHeight: Math.round(c.fontSize * 1.3) }]}
          numberOfLines={c.lines}
        >
          {item.title}
        </Text>
      </View>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={BC.muted} />
    </Pressable>

    {open && (
      <View style={[styles.body, { paddingLeft: c.pad + c.thumb + 12 }]}>
        <View style={styles.bodyTexts}>
          <Text style={styles.desc}>{item.body || "Sans message"}</Text>
          <Text style={capsLabel} numberOfLines={1}>
            {audienceSummary(item)}
          </Text>
        </View>
        <Pressable
          onPress={onReuse}
          style={({ pressed }) => [styles.reuse, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={styles.reuseText}>Réutiliser</Text>
        </Pressable>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: { backgroundColor: BC.surface, overflow: "hidden" },
  head: { flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  texts: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontWeight: "600", color: BC.ink, letterSpacing: -0.1 },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 10,
    paddingBottom: 10,
  },
  bodyTexts: { flex: 1, gap: 4 },
  desc: { fontSize: 13, lineHeight: 19, color: BC.muted },
  reuse: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  reuseText: { fontSize: 13, fontWeight: "600", color: BC.ink },
  thumbEmpty: { backgroundColor: BC.accentTint, alignItems: "center", justifyContent: "center" },
});
