import { Commande, FastFood } from "@/src/types";
import React, { useState } from "react";
import {
  GestureResponderHandlers,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DS } from "@/src/theme/ds";

/**
 * En-tête du détail client (`OrderBottomSheet`) : avatar de la boutique +
 * nom, puis l'adresse — ou, sur une ligne multi-commandes, les chips « Cmd N »
 * avec leur badge « +N » de débordement. Porte la poignée de swipe
 * (`panHandlers`). Sorti d'`OrderBottomSheet` (R4), rendu inchangé.
 */

const COLORS = [
  { bg: "#EAF3DE", text: "#4B7C16", badge: "#7CB342" },
  { bg: DS.accentCream, text: "#A04000", badge: "#E67E22" },
  { bg: "#D6EAF8", text: "#1B4F72", badge: "#3498DB" },
  { bg: "#E8DAEF", text: "#512E5F", badge: "#8E44AD" },
];

/** Largeur d'un chip + gap : convertit des pixels masqués en nb de chips. */
const CMD_CHIP_W = 58;

type Props = {
  boutique?: FastFood | null;
  allOrders?: Commande[];
  selectedOrder: Commande | null;
  selectedOrderIdx: number;
  onSelectOrder: (idx: number) => void;
  panHandlers: GestureResponderHandlers;
};

export function OrderSheetHeader({
  boutique,
  allOrders,
  selectedOrder,
  selectedOrderIdx,
  onSelectOrder,
  panHandlers,
}: Props) {
  const hasMultiple = !!allOrders && allOrders.length > 1;

  // ─── Chips « Cmd » : compteur de débordement « +N » ───────────────────────
  const [cmdViewportW, setCmdViewportW] = useState(0);
  const [cmdContentW, setCmdContentW] = useState(0);
  const [cmdScrollX, setCmdScrollX] = useState(0);
  // Un chip n'est compté que s'il est masqué à plus de moitié.
  const hiddenPx = Math.max(0, cmdContentW - cmdViewportW - cmdScrollX);
  const hiddenCount = Math.floor(hiddenPx / CMD_CHIP_W + 0.5);

  const initials = (boutique?.nom || "B").substring(0, 2).toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return (
    <View {...panHandlers} style={styles.header}>
      <View style={styles.userRow}>
        <View style={[styles.avatar, { backgroundColor: theme.bg }]}>
          <Text style={[styles.avatarText, { color: theme.text }]}>
            {initials}
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.badge }]}>
            <Text style={styles.badgeText}>
              {allOrders ? allOrders.length : 1}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{boutique?.nom || "Boutique"}</Text>
          {hasMultiple ? (
            /* Multi-commandes : chips Cmd 1/2/3… à la place de l'adresse. */
            <View style={styles.cmdRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cmdScroll}
                style={{ flexShrink: 1 }}
                onScroll={(e) => setCmdScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={16}
                onLayout={(e) => setCmdViewportW(e.nativeEvent.layout.width)}
                onContentSizeChange={(w) => setCmdContentW(w)}
              >
                {allOrders!.map((o, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.cmdChip,
                      selectedOrderIdx === idx && styles.cmdChipActive,
                    ]}
                    onPress={() => onSelectOrder(idx)}
                  >
                    <Text
                      style={[
                        styles.cmdChipText,
                        selectedOrderIdx === idx && styles.cmdChipTextActive,
                      ]}
                    >
                      {/* Vrai rang de la commande (aligné sur l'onglet
                          Montant), pas la position dans la liste. */}
                      Cmd {(o as any).rank ?? idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Débordement : « +N » tant que la liste n'a pas été scrollée. */}
              {hiddenCount > 0 && (
                <View style={styles.cmdMore}>
                  <Text style={styles.cmdMoreText}>+{hiddenCount}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.userAddr} numberOfLines={1}>
              {selectedOrder?.delivery?.location || "Sur place"}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "800",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  userAddr: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cmdRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cmdScroll: { flexDirection: "row", gap: 6, paddingRight: 2 },
  cmdChip: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.gray100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cmdChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  cmdChipText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  cmdChipTextActive: { color: "#FFFFFF" },
  cmdMore: {
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  cmdMoreText: { fontSize: 10, fontWeight: "800", color: "#4B5563" },
});
