"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bottom sheet de choix de periode du hero marchand : raccourcis (semaine,
// mois, annee), un mois precis (annee au choix), ou une semaine / un
// intervalle de jours sur un calendrier fait main.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  MONTHS,
  MONTHS_SHORT,
  ShopPeriod,
  fromISO,
  monthGrid,
  monthPeriod,
  periodLabel,
  presetPeriod,
  toISO,
  weekPeriod,
} from "./shopPeriod";

const PRESETS = ["week", "lastWeek", "month", "lastMonth", "year"] as const;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  visible: boolean;
  value: ShopPeriod;
  onClose: () => void;
  onChange: (p: ShopPeriod) => void;
}

export const ShopPeriodSheet: React.FC<Props> = ({ visible, value, onClose, onChange }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const now = new Date();
  const todayISO = toISO(now);
  const [year, setYear] = useState(now.getFullYear());
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth() });
  // Intervalle en cours de saisie : 1er tap = debut, 2e tap = fin.
  const [draft, setDraft] = useState<{ from: string; to: string | null } | null>(null);

  // A l'ouverture : calendrier et annee recales sur la periode active.
  useEffect(() => {
    if (!visible) return;
    const d = fromISO(value.from);
    setYear(d.getFullYear());
    setCal({ y: d.getFullYear(), m: d.getMonth() });
    setDraft(value.kind === "range" ? { from: value.from, to: value.to } : null);
  }, [visible, value]);

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

  const rangeEnd = draft?.to ?? draft?.from;
  const inDraft = (iso: string) => !!draft && iso >= draft.from && iso <= (rangeEnd as string);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{t("Période")}</Text>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Raccourcis */}
          <View style={styles.wrapRow}>
            {PRESETS.map((k) => {
              const active = value.kind === k;
              return (
                <Pressable key={k} onPress={() => pick(presetPeriod(k))} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{periodLabel(presetPeriod(k))}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Un mois precis */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>{t("Un mois")}</Text>
              <Stepper label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} />
            </View>
            <View style={styles.wrapRow}>
              {MONTHS_SHORT.map((m, i) => {
                const p = monthPeriod(year, i);
                const future = p.from > todayISO;
                const active = value.kind !== "range" && value.from === p.from && value.to === p.to;
                return (
                  <Pressable
                    key={m}
                    disabled={future}
                    onPress={() => pick(p)}
                    style={[styles.month, active && styles.chipActive, future && styles.disabled]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(m)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Semaine ou jours */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockTitle}>{t("Semaine ou jours")}</Text>
              <Stepper label={`${t(MONTHS[cal.m])} ${cal.y}`} onPrev={() => stepCal(-1)} onNext={() => stepCal(1)} />
            </View>
            <Text style={styles.hint}>{t("Touchez « Sem. » pour une semaine, ou un jour de début puis un jour de fin.")}</Text>
            <View style={styles.calRow}>
              <View style={styles.weekCell} />
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={[styles.dayCell, styles.weekday]}>{w}</Text>
              ))}
            </View>
            {monthGrid(cal.y, cal.m).map((row, ri) => {
              const firstDay = row.find(Boolean) as Date;
              const wk = weekPeriod(firstDay);
              return (
                <View key={ri} style={styles.calRow}>
                  <Pressable
                    disabled={wk.from > todayISO}
                    onPress={() => setDraft({ from: wk.from, to: wk.to })}
                    style={[styles.weekCell, wk.from > todayISO && styles.disabled]}
                  >
                    <Text style={styles.weekText}>{t("Sem.")}</Text>
                  </Pressable>
                  {row.map((d, di) => {
                    if (!d) return <View key={di} style={styles.dayCell} />;
                    const iso = toISO(d);
                    const future = iso > todayISO;
                    const sel = inDraft(iso);
                    const edge = !!draft && (iso === draft.from || iso === rangeEnd);
                    return (
                      <Pressable key={di} disabled={future} onPress={() => tapDay(iso)} style={[styles.dayCell, sel && styles.daySel, edge && styles.dayEdge]}>
                        <Text style={[styles.dayText, iso === todayISO && styles.today, future && styles.futureText, edge && styles.edgeText]}>
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <Pressable
              disabled={!draft}
              onPress={() => draft && pick({ kind: "range", from: draft.from, to: draft.to ?? draft.from })}
              style={[styles.apply, !draft && styles.disabled]}
            >
              <Text style={styles.applyText}>
                {draft ? `${t("Afficher")} ${periodLabel({ kind: "range", from: draft.from, to: draft.to ?? draft.from })}` : t("Choisissez des jours")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const Stepper = ({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) => (
  <View style={styles.stepper}>
    <Pressable onPress={onPrev} hitSlop={8} style={styles.stepBtn}>
      <Ionicons name="chevron-back" size={16} color={DS.ink} />
    </Pressable>
    <Text style={styles.stepLabel}>{label}</Text>
    <Pressable onPress={onNext} hitSlop={8} style={styles.stepBtn}>
      <Ionicons name="chevron-forward" size={16} color={DS.ink} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: DS.sheetScrim },
  sheet: { maxHeight: "88%", backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: DS.track },
  title: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, fontSize: 18, fontWeight: "700", color: DS.ink },
  content: { padding: 16, gap: 14 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: DS.line, justifyContent: "center" },
  chipActive: { backgroundColor: DS.accentTint, borderColor: "transparent" },
  chipText: { fontSize: 13, fontWeight: "600", color: DS.ink },
  chipTextActive: { color: DS.accentInk },
  block: { gap: 10, padding: 12, borderRadius: 20, backgroundColor: DS.surface },
  blockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  blockTitle: { fontSize: 14, fontWeight: "700", color: DS.ink },
  month: { flexBasis: "22%", flexGrow: 1, height: 38, borderRadius: 12, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.35 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" },
  stepLabel: { minWidth: 70, textAlign: "center", fontSize: 13, fontWeight: "600", color: DS.ink },
  hint: { fontSize: 11.5, color: DS.muted },
  calRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  weekCell: { width: 38, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: DS.bg },
  weekText: { fontSize: 10.5, fontWeight: "700", color: DS.accentInk },
  dayCell: { flex: 1, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", textAlign: "center", textAlignVertical: "center" },
  weekday: { fontSize: 11, fontWeight: "600", color: DS.faint },
  daySel: { backgroundColor: DS.accentTint },
  dayEdge: { backgroundColor: DS.accent },
  dayText: { fontSize: 13, fontWeight: "600", color: DS.ink },
  today: { color: DS.accentInk, fontWeight: "800" },
  futureText: { color: DS.faint },
  edgeText: { color: DS.onInk },
  apply: { marginTop: 4, height: 44, borderRadius: 22, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14, fontWeight: "700", color: DS.onInk },
});
