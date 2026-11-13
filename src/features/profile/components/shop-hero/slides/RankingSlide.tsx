"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Slide, SlideBody } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** T1 — classements avec onglets. Donnees d'EXEMPLE. */
type Tab = "dishes" | "views" | "clients" | "drivers" | "zones";
const TABS: { key: Tab; label: string }[] = [
  { key: "dishes", label: "Plats" },
  { key: "views", label: "Vues" },
  { key: "clients", label: "Clients" },
  { key: "drivers", label: "Livreurs" },
  { key: "zones", label: "Zones" },
];
const DATA: Record<Tab, { rows: [string, number][]; stats: { value: string; label: string }[] }> = {
  dishes: {
    rows: [["Burger maison", 42], ["Poulet DG", 31], ["Shawarma", 24], ["Frites", 18]],
    stats: [{ value: "127", label: "PLATS VENDUS" }, { value: "Burger", label: "N° 1" }, { value: "3", label: "JAMAIS VENDUS" }],
  },
  views: {
    rows: [["Burger maison", 380], ["Shawarma", 251], ["Poulet DG", 198], ["Pizza", 120]],
    stats: [{ value: "1 265", label: "VUES" }, { value: "Burger", label: "N° 1" }, { value: "30 %", label: "PART DU N° 1" }],
  },
  clients: {
    rows: [["Aïcha N.", 9], ["Paul M.", 7], ["Kevin T.", 6], ["Grâce B.", 5]],
    stats: [{ value: "64", label: "CLIENTS" }, { value: "Aïcha", label: "N° 1" }, { value: "27 000 F", label: "DÉPENSÉS PAR LE N° 1" }],
  },
  drivers: {
    rows: [["Junior", 34], ["Boris", 27], ["Serge", 14], ["Alain", 6]],
    stats: [{ value: "81", label: "LIVRAISONS" }, { value: "Junior", label: "N° 1" }, { value: "4", label: "LIVREURS" }],
  },
  zones: {
    rows: [["Bastos", 28], ["Mvan", 21], ["Essos", 17], ["Biyem-Assi", 9]],
    stats: [{ value: "12", label: "ZONES" }, { value: "Bastos", label: "N° 1" }, { value: "35 %", label: "PART DU N° 1" }],
  },
};

export const RankingSlide: React.FC = () => {
  const [tab, setTab] = useState<Tab>("dishes");
  const d = DATA[tab];
  const max = d.rows[0][1];
  return (
    <Slide>
      <SlideBody full style={styles.body}>
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
        <View style={styles.rows}>
          {d.rows.map(([name, v], i) => (
            <View key={name} style={styles.item}>
              <View style={styles.head}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.value}>{v}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(v / max) * 100}%`, backgroundColor: i === 0 ? DS.accent : DS.ink }]} />
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.summary} numberOfLines={1}>
          {`${d.stats[0].value} ${t(d.stats[0].label).toLowerCase()} · ${d.stats[2].value} ${t(d.stats[2].label).toLowerCase()}`}
        </Text>
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: DS.surface },
  tabOn: { backgroundColor: DS.ink },
  tabText: { fontSize: 11.5, fontWeight: "600", color: DS.ink },
  tabTextOn: { color: DS.onInk },
  rows: { flex: 1, gap: 12 },
  summary: { textAlign: "right", fontSize: 11, fontWeight: "500", color: DS.muted },
  item: { gap: 3 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  name: { flexShrink: 1, fontSize: 12, color: DS.ink },
  value: { fontSize: 12, fontWeight: "700", color: DS.ink },
  track: { height: 10, borderRadius: 5, backgroundColor: DS.line },
  fill: { height: 10, borderRadius: 5 },
});
