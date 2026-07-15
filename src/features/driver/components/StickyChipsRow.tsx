import React, { useCallback, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Theme } from "@/src/theme";

export interface ChipItem {
  key: string;
  label: string;
  /** Nb affiché en pastille juste après le nom (ex. cmd en attente). */
  count?: number;
}

interface StickyChipsRowProps {
  items: ChipItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * Barre de chips horizontale avec deux comportements :
 *  1. Auto-scroll au clic : le chip cliqué est recentré s'il était coupé.
 *  2. Sticky au scroll manuel : si le chip ACTIF sort de l'écran, une copie
 *     flottante s'épingle au bord (gauche s'il est sorti à gauche, droite sinon)
 *     et reste cliquable.
 */
export const StickyChipsRow: React.FC<StickyChipsRowProps> = ({
  items,
  activeKey,
  onSelect,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, { x: number; w: number }>>({});
  const [viewW, setViewW] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const activeItem = items.find((i) => i.key === activeKey);
  const activeL = activeItem ? layouts.current[activeItem.key] : undefined;

  // Le chip actif est-il hors-vue ? De quel côté ?
  let stuckSide: "left" | "right" | null = null;
  if (activeL && viewW) {
    if (activeL.x < scrollX) stuckSide = "left";
    else if (activeL.x + activeL.w > scrollX + viewW) stuckSide = "right";
  }

  const scrollIntoView = useCallback(
    (key: string) => {
      const l = layouts.current[key];
      if (!l || !viewW) return;
      const target = Math.max(0, l.x - viewW / 2 + l.w / 2);
      scrollRef.current?.scrollTo({ x: target, animated: true });
    },
    [viewW],
  );

  const handleSelect = (key: string) => {
    onSelect(key);
    scrollIntoView(key);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  const renderChip = (item: ChipItem, floating = false) => {
    const active = item.key === activeKey;
    return (
      <TouchableOpacity
        key={floating ? `float_${item.key}` : item.key}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => handleSelect(item.key)}
        activeOpacity={0.8}
        onLayout={
          floating
            ? undefined
            : (ev) =>
                (layouts.current[item.key] = {
                  x: ev.nativeEvent.layout.x,
                  w: ev.nativeEvent.layout.width,
                })
        }
      >
        <Text
          style={[styles.chipText, active && styles.chipTextActive]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.count != null && item.count > 0 && (
          <View style={[styles.badge, active && styles.badgeActive]}>
            <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
              {item.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setViewW(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.row}
      >
        {items.map((i) => renderChip(i))}
      </ScrollView>

      {/* Copie flottante du chip actif quand il est hors-vue */}
      {stuckSide && activeItem && (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatWrap,
            stuckSide === "left" ? styles.floatLeft : styles.floatRight,
          ]}
        >
          {renderChip(activeItem, true)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    justifyContent: "center",
  },
  row: {
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  floatWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  floatLeft: { left: 0 },
  floatRight: { right: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "10",
    maxWidth: 150,
  },
  chipActive: { backgroundColor: Theme.colors.primary },
  chipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  chipTextActive: { color: "#fff" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  badgeTextActive: { color: "#fff" },
});
