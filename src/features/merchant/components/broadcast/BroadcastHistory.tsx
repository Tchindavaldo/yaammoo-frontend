import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import type { BroadcastItem } from "../../types/broadcast.types";
import { sentLabel } from "../../utils/broadcastQuota";
import { BroadcastHistoryRow, audienceSummary, rowLayoutFor } from "./BroadcastHistoryRow";
import { BC, capsLabel } from "./broadcastTheme";

interface Props {
  items: BroadcastItem[];
  now: Date;
  loading: boolean;
  onReuse: (item: BroadcastItem) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Derniers envois, occupant tout l'espace jusqu'au bouton d'écriture :
 * 1 envoi = carte dépliée ; 2 à 4 = lignes repliées qui se partagent la
 * hauteur ; au-delà, lignes compactes et la page défile.
 */
export const BroadcastHistory: React.FC<Props> = ({ items, now, loading, onReuse, style }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const count = items.length;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={[styles.zone, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {count === 1 ? "Dernière envoyée" : "Dernières envoyées"}
        </Text>
        <Text style={capsLabel}>{count}</Text>
      </View>

      {count === 0 && (
        <View style={styles.empty}>
          {loading ? (
            <ActivityIndicator color={BC.muted} />
          ) : (
            <>
              <Text style={styles.emptyTitle}>Aucune notification envoyée</Text>
              <Text style={styles.emptyText}>Vos envois apparaîtront ici.</Text>
            </>
          )}
        </View>
      )}

      {count === 1 && (
        <HeroCard item={items[0]} when={sentLabel(items[0].sentAt, now)} onReuse={() => onReuse(items[0])} />
      )}

      {count >= 2 && (
        <View style={styles.rows}>
          {items.map((it) => (
            <BroadcastHistoryRow
              key={it.id}
              item={it}
              when={sentLabel(it.sentAt, now)}
              layout={rowLayoutFor(count)}
              open={openId === it.id}
              onToggle={() => toggle(it.id)}
              onReuse={() => onReuse(it)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/** Envoi unique : déplié d'office, la photo prend toute la hauteur libre. */
const HeroCard: React.FC<{ item: BroadcastItem; when: string; onReuse: () => void }> = ({
  item,
  when,
  onReuse,
}) => (
  <View style={styles.hero}>
    <View style={styles.heroPhoto}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.heroNoPhoto]}>
          <Ionicons name="notifications" size={36} color={BC.accent} />
        </View>
      )}
      <View style={styles.heroChips}>
        <View style={styles.heroChip}>
          <Text style={[capsLabel, { color: BC.ink }]}>{when}</Text>
        </View>
        <View style={styles.heroChip}>
          <Text style={[capsLabel, { color: BC.ink }]} numberOfLines={1}>
            {audienceSummary(item)}
          </Text>
        </View>
      </View>
    </View>
    <View style={styles.heroFoot}>
      <View style={styles.heroTexts}>
        <Text style={styles.heroTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.heroDesc} numberOfLines={2}>
          {item.body || "Sans message"}
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
  </View>
);

const styles = StyleSheet.create({
  zone: { gap: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  headerTitle: { fontSize: 13, fontWeight: "600", color: BC.ink },
  empty: {
    flexGrow: 1,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BC.idle,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600", color: BC.ink },
  emptyText: { fontSize: 13, color: BC.muted },
  rows: { flexGrow: 1, gap: 8 },
  hero: {
    flexGrow: 1,
    minHeight: 240,
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderRadius: 26,
    backgroundColor: BC.surface,
  },
  heroPhoto: {
    flexGrow: 1,
    minHeight: 120,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E5E5EA",
  },
  heroNoPhoto: { alignItems: "center", justifyContent: "center", backgroundColor: BC.accentTint },
  heroChips: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  heroChip: {
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  heroFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 6,
    paddingRight: 4,
  },
  heroTexts: { flex: 1, minWidth: 0, gap: 3 },
  heroTitle: { fontSize: 17, fontWeight: "600", color: BC.ink, letterSpacing: -0.2 },
  heroDesc: { fontSize: 13, lineHeight: 18, color: BC.muted },
  reuse: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  reuseText: { fontSize: 13, fontWeight: "600", color: BC.ink },
});
