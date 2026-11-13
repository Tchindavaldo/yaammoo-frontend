"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bottom sheet de choix de periode du hero marchand (maquettes A1 + A3 du
// canvas, page « Période ») : deux vues de MEME hauteur, pour que la bascule
// ne fasse pas sauter le sheet.
//  - racine : 5 raccourcis (un tap = applique et ferme) + « Choisir une période › » ;
//  - calendrier : 1er tap = debut, 2e tap = fin, puis « Afficher ».
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MONTHS, ShopPeriod, fromISO, monthGrid, periodLabel, presetPeriod, toISO } from "./shopPeriod";

const PRESETS = ["week", "lastWeek", "month", "lastMonth", "year"] as const;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
// Hauteur commune aux deux vues (titre + contenu), calee sur le calendrier
// le plus haut (6 semaines + bouton).
const BODY_HEIGHT = 350;

interface Props {
  visible: boolean;
  value: ShopPeriod;
  onClose: () => void;
  onChange: (p: ShopPeriod) => void;
}

export const ShopPeriodSheet: React.FC<Props> = ({ visible, value, onClose, onChange }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const todayISO = toISO(new Date());
  const [view, setView] = useState<"root" | "range">("root");
  const [cal, setCal] = useState({ y: 0, m: 0 });
  const [draft, setDraft] = useState<{ from: string; to: string | null } | null>(null);

  // Fond en FONDU + sheet qui glisse (comme MerchantFilterSheet).
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    slide.setValue(1);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
    ]).start();
  }, [visible, fade, slide]);

  // A l'ouverture : vue racine, calendrier cale sur la periode active.
  useEffect(() => {
    if (!visible) return;
    const d = fromISO(value.to > todayISO ? todayISO : value.to);
    setView("root");
    setCal({ y: d.getFullYear(), m: d.getMonth() });
    setDraft(value.kind === "range" ? { from: value.from, to: value.to } : null);
  }, [visible, value, todayISO]);

  const pick = (p: ShopPeriod) => {
    onChange(p);
    onClose();
  };

  const tapDay = (iso: string) => {
    if (!draft || draft.to) return setDraft({ from: iso, to: null });
    const [a, b] = iso < draft.from ? [iso, draft.from] : [draft.from, iso];
    setDraft({ from: a, to: b });
  };

  const stepCal = (n: number) =>
    setCal((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const nextDisabled = toISO(new Date(cal.y, cal.m + 1, 1)) > todayISO;

  const end = draft?.to ?? draft?.from;
  const draftPeriod: ShopPeriod | null = draft ? { kind: "range", from: draft.from, to: end as string } : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          // Contenu pose sur la bande safe-area, sans marge en plus (R19).
          { paddingBottom: insets.bottom, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }) }] },
        ]}
      >
        <View style={{ height: BODY_HEIGHT }}>
          {view === "root" ? (
            <>
              <View style={styles.head}>
                <Text style={[styles.title, { flex: 1 }]}>{t("Choisir une période")}</Text>
                <Pressable onPress={onClose} hitSlop={8} style={styles.round} accessibilityRole="button">
                  <Ionicons name="close" size={18} color={DS.ink} />
                </Pressable>
              </View>
              <View style={styles.card}>
                {PRESETS.map((k, i) => {
                  const p = presetPeriod(k);
                  const active = value.kind === k;
                  return (
                    <Pressable key={k} onPress={() => pick(p)} style={styles.row}>
                      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{periodLabel(p)}</Text>
                      <Text style={styles.rowHint}>{periodLabel({ kind: "range", from: p.from, to: p.to > todayISO ? todayISO : p.to }, true)}</Text>
                      {active && <Ionicons name="checkmark" size={16} color={DS.accent} />}
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.card, { marginTop: 10 }]}>
                <Pressable onPress={() => setView("range")} style={styles.row}>
                  <Text style={[styles.rowLabel, value.kind === "range" && styles.rowLabelActive]}>{t("Sélectionner une période")}</Text>
                  {value.kind === "range" && <Text style={styles.rowHint}>{periodLabel(value)}</Text>}
                  <Ionicons name="chevron-forward" size={14} color={DS.idle} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.head}>
                <Pressable onPress={() => setView("root")} hitSlop={8} style={styles.round}>
                  <Ionicons name="chevron-back" size={18} color={DS.ink} />
                </Pressable>
                <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{t("Période")}</Text>
                <Pressable onPress={() => stepCal(-1)} hitSlop={6} style={styles.step}>
                  <Ionicons name="chevron-back" size={14} color={DS.ink} />
                </Pressable>
                <Text style={styles.stepLabel}>{`${t(MONTHS[cal.m])} ${cal.y}`}</Text>
                <Pressable onPress={() => stepCal(1)} disabled={nextDisabled} hitSlop={6} style={[styles.step, nextDisabled && styles.disabled]}>
                  <Ionicons name="chevron-forward" size={14} color={DS.ink} />
                </Pressable>
              </View>
              <View style={styles.calRow}>
                {WEEKDAYS.map((w, i) => (
                  <Text key={i} style={[styles.cell, styles.weekday]}>{w}</Text>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                {monthGrid(cal.y, cal.m).map((row, ri) => (
                  <View key={ri} style={styles.calRow}>
                    {row.map((d, di) => {
                      if (!d) return <View key={di} style={styles.cell} />;
                      const iso = toISO(d);
                      const future = iso > todayISO;
                      const inRange = !!draft && iso >= draft.from && iso <= (end as string);
                      const edge = !!draft && (iso === draft.from || iso === end);
                      return (
                        <Pressable key={di} disabled={future} onPress={() => tapDay(iso)} style={[styles.cell, inRange && styles.inRange, edge && styles.edge]}>
                          <Text style={[styles.day, iso === todayISO && styles.today, future && styles.future, edge && styles.edgeText]}>{d.getDate()}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
              <Pressable disabled={!draftPeriod} onPress={() => draftPeriod && pick(draftPeriod)} style={[styles.apply, !draftPeriod && styles.disabled]}>
                <Text style={styles.applyText}>
                  {draftPeriod ? `${t("Afficher")} ${periodLabel(draftPeriod)}` : t("Touchez un jour de début puis de fin")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
        <SafeAreaDebugBand />
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: DS.sheetScrim },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: DS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  head: { height: 40, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", color: DS.ink },
  card: { borderRadius: 16, backgroundColor: DS.surface, overflow: "hidden" },
  row: { height: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 },
  rowLabel: { flex: 1, fontSize: 14.5, fontWeight: "500", color: DS.ink },
  rowLabelActive: { fontWeight: "600", color: DS.accentInk },
  rowHint: { fontSize: 12.5, color: DS.faint },
  round: { width: 32, height: 32, borderRadius: 16, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  stepLabel: { minWidth: 92, textAlign: "center", fontSize: 13, fontWeight: "600", color: DS.ink },
  disabled: { opacity: 0.35 },
  calRow: { flexDirection: "row" },
  cell: { flex: 1, height: 36, alignItems: "center", justifyContent: "center", textAlign: "center", textAlignVertical: "center" },
  weekday: { height: 26, fontSize: 11, fontWeight: "600", color: DS.faint },
  inRange: { backgroundColor: DS.accentTint },
  edge: { backgroundColor: DS.accent, borderRadius: 12 },
  day: { fontSize: 13.5, fontWeight: "600", color: DS.ink },
  today: { color: DS.accentInk, fontWeight: "800" },
  future: { color: DS.idle },
  edgeText: { color: DS.onInk },
  apply: { height: 48, borderRadius: 24, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14.5, fontWeight: "700", color: DS.onInk },
});
