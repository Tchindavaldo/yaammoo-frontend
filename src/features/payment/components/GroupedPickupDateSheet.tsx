"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de checkout/PickupDateSheet (R16), panier groupe : commande SUR PLACE,
// le client choisit le jour ou il passe recuperer. Jours possibles :
// aujourd'hui -> aujourd'hui + `maxDays` (reglage « advanceDays » de la boutique).
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MONTHS, fromISO, monthGrid, toISO } from "@/src/features/profile/components/shop-hero/shopPeriod";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  visible: boolean;
  value?: string | null;
  /** Jours a l'avance autorises par la boutique (defaut 7). */
  maxDays?: number;
  onClose: () => void;
  onPick: (iso: string) => void;
}

export const GroupedPickupDateSheet: React.FC<Props> = ({ visible, value, maxDays, onClose, onPick }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const now = new Date();
  const todayISO = toISO(now);
  const lastISO = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (maxDays && maxDays > 0 ? maxDays : 7)));
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string>(todayISO);

  useEffect(() => {
    if (!visible) return;
    const start = value && value >= todayISO && value <= lastISO ? value : todayISO;
    const d = fromISO(start);
    setDay(start);
    setCal({ y: d.getFullYear(), m: d.getMonth() });
  }, [visible, value, todayISO, lastISO]);

  const step = (n: number) =>
    setCal((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const prevOff = toISO(new Date(cal.y, cal.m, 0)) < todayISO;
  const nextOff = toISO(new Date(cal.y, cal.m + 1, 1)) > lastISO;
  const d = fromISO(day);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{t("Jour du retrait")}</Text>
          <Pressable onPress={() => step(-1)} disabled={prevOff} hitSlop={6} style={[styles.step, prevOff && styles.disabled]}>
            <Ionicons name="chevron-back" size={14} color={DS.ink} />
          </Pressable>
          <Text style={styles.stepLabel}>{`${t(MONTHS[cal.m])} ${cal.y}`}</Text>
          <Pressable onPress={() => step(1)} disabled={nextOff} hitSlop={6} style={[styles.step, nextOff && styles.disabled]}>
            <Ionicons name="chevron-forward" size={14} color={DS.ink} />
          </Pressable>
        </View>
        <View style={styles.row}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[styles.cell, styles.weekday]}>{w}</Text>
          ))}
        </View>
        {monthGrid(cal.y, cal.m).map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((c, ci) => {
              if (!c) return <View key={ci} style={styles.cell} />;
              const iso = toISO(c);
              const off = iso < todayISO || iso > lastISO;
              const on = iso === day;
              return (
                <Pressable key={ci} disabled={off} onPress={() => setDay(iso)} style={[styles.cell, on && styles.on]}>
                  <Text style={[styles.day, iso === todayISO && styles.today, off && styles.off, on && styles.onText]}>{c.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <Pressable onPress={() => onPick(day)} style={styles.apply}>
          <Text style={styles.applyText}>
            {day === todayISO ? t("Récupérer aujourd'hui") : `${t("Récupérer le")} ${d.getDate()} ${t(MONTHS[d.getMonth()])}`}
          </Text>
        </Pressable>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: DS.sheetScrim },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: DS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  head: { height: 40, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: DS.ink },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  stepLabel: { minWidth: 92, textAlign: "center", fontSize: 13, fontWeight: "600", color: DS.ink },
  disabled: { opacity: 0.35 },
  row: { flexDirection: "row" },
  cell: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", textAlign: "center", textAlignVertical: "center" },
  weekday: { height: 26, fontSize: 11, fontWeight: "600", color: DS.faint },
  on: { backgroundColor: DS.accent, borderRadius: 12 },
  day: { fontSize: 13.5, fontWeight: "600", color: DS.ink },
  today: { color: DS.accentInk, fontWeight: "800" },
  off: { color: DS.idle },
  onText: { color: DS.onInk },
  apply: { height: 48, marginTop: 8, borderRadius: 24, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14.5, fontWeight: "700", color: DS.onInk },
});
