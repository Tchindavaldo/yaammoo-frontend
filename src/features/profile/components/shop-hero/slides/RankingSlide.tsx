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
// [nom, nombre, montant depense en F (clients, livreurs, zones)]
type Row = [string, number, number?];
// Unite du nombre : commandes partout, sauf l'onglet Vues.
const DATA: Record<Tab, { unit: "cmd" | "vues"; rows: Row[] }> = {
  dishes: { unit: "cmd", rows: [["Burger maison", 42], ["Poulet DG", 31], ["Shawarma", 24], ["Frites", 18]] },
  views: { unit: "vues", rows: [["Burger maison", 380], ["Shawarma", 251], ["Poulet DG", 198], ["Pizza", 120]] },
  clients: { unit: "cmd", rows: [["Aïcha N.", 9, 27000], ["Paul M.", 7, 19500], ["Kevin T.", 6, 16000], ["Grâce B.", 5, 13500]] },
  drivers: { unit: "cmd", rows: [["Junior", 34, 98000], ["Boris", 27, 76500], ["Serge", 14, 41000], ["Alain", 6, 17500]] },
  zones: { unit: "cmd", rows: [["Bastos", 28, 86000], ["Mvan", 21, 59500], ["Essos", 17, 47000], ["Biyem-Assi", 9, 25500]] },
};
const money = (n: number) => `${n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} F`;

export const RankingSlide: React.FC = () => {
  const [tab, setTab] = useState<Tab>("dishes");
  const d = DATA[tab];
  const max = d.rows[0][1];
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        <View style={styles.rows}>
          {d.rows.map(([name, v, amount], i) => (
            <View key={name} style={styles.item}>
              <View style={styles.head}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <Text style={styles.value}>
                  {`${v} ${t(d.unit)}`}
                  {amount ? <Text style={styles.amount}>{`  ·  ${money(amount)}`}</Text> : null}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(v / max) * 100}%`, backgroundColor: i === 0 ? DS.accent : DS.ink }]} />
              </View>
            </View>
          ))}
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
  amount: { fontWeight: "500", color: DS.muted },
  item: { gap: 3 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  name: { flexShrink: 1, fontSize: 12, color: DS.ink },
  value: { fontSize: 12, fontWeight: "700", color: DS.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: DS.line },
  fill: { height: 8, borderRadius: 4 },
});
