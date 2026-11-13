"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Grow, Slide, SlideBody, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { MerchantStats, money } from "../useMerchantStats";

/** T1 — classements avec onglets (top 4). */
type Tab = "dishes" | "views" | "clients" | "drivers" | "zones";
const TABS: { key: Tab; label: string }[] = [
  { key: "dishes", label: "Plats" },
  { key: "views", label: "Vues" },
  { key: "clients", label: "Clients" },
  { key: "drivers", label: "Livreurs" },
  { key: "zones", label: "Zones" },
];

export const RankingSlide: React.FC<{ stats: MerchantStats; version: number }> = ({ stats, version }) => {
  const [tab, setTab] = useState<Tab>("dishes");
  const grow = useGrow(version * 10 + TABS.findIndex((x) => x.key === tab));
  const rows = stats.rankings[tab] || [];
  const unit = tab === "views" ? "vues" : "cmd";
  const max = Math.max(rows[0]?.count || 0, 1);
  const withAmount = tab === "clients" || tab === "drivers" || tab === "zones";
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        <View style={styles.rows}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>{t("Aucune donnée sur la période")}</Text>
          ) : (
            rows.map((r, i) => (
              <View key={`${r.name}-${i}`} style={styles.item}>
                <View style={styles.head}>
                  <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.value}>
                    {`${r.count} ${t(unit)}`}
                    {withAmount && r.amount ? <Text style={styles.amount}>{`  ·  ${money(Number(r.amount))}`}</Text> : null}
                  </Text>
                </View>
                <View style={styles.track}>
                  <Grow p={grow} dir="right" style={[styles.fill, { width: `${(r.count / max) * 100}%`, backgroundColor: i === 0 ? DS.accent : DS.ink }]} />
                </View>
              </View>
            ))
          )}
        </View>
        <View style={styles.tabs}>
          {TABS.map((tb) => {
            const on = tb.key === tab;
            return (
              <Pressable key={tb.key} onPress={() => setTab(tb.key)} hitSlop={4} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{t(tb.label)}</Text>
              </Pressable>
            );
          })}
        </View>
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: DS.surface },
  tabOn: { backgroundColor: DS.ink },
  tabText: { fontSize: 11.5, fontWeight: "600", color: DS.ink },
  tabTextOn: { color: DS.onInk },
  rows: { flex: 1, gap: 6 },
  empty: { marginTop: 30, textAlign: "center", fontSize: 12, color: DS.faint },
  amount: { fontWeight: "500", color: DS.muted },
  item: { gap: 3 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  name: { flexShrink: 1, fontSize: 12, color: DS.ink },
  value: { fontSize: 12, fontWeight: "700", color: DS.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: DS.line },
  fill: { height: 8, borderRadius: 4 },
});
