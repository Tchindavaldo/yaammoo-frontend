"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie adaptee du calendrier de ShopPeriodSheet (R16) : commande SUR PLACE,
// le client choisit le jour ou il passe recuperer. Jours possibles :
// aujourd'hui -> aujourd'hui + `maxDays` (reglage « advanceDays » de la boutique).
// Sous le calendrier : l'HEURE de passage, libre mais dans les horaires de la
// boutique (openTime -> closeTime), futures seulement le jour meme.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MONTHS, fromISO, monthGrid, toISO } from "@/src/features/profile/components/shop-hero/shopPeriod";
import { pickupHourSlots } from "../utils/pickupHours";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
// Calendrier + rangee d'heures + bouton.
const SHEET_HEIGHT = 440;
const EXIT = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  value?: string | null;
  /** Jours a l'avance autorises par la boutique (defaut 7). */
  maxDays?: number;
  /** Heure deja choisie "HH:mm". */
  time?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  /** Delai de preparation (min) : le jour meme, pas d'heure avant maintenant + delai. */
  leadMinutes?: number;
  onClose: () => void;
  onPick: (iso: string, time: string) => void;
}

export const PickupDateSheet: React.FC<Props> = ({ visible, value, maxDays, time, openTime, closeTime, leadMinutes, onClose, onPick }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const now = new Date();
  const todayISO = toISO(now);
  const lastISO = toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (maxDays && maxDays > 0 ? maxDays : 7)));
  const [cal, setCal] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string>(todayISO);
  const [hour, setHour] = useState<string>("");
  // Voile en fade + sheet qui glisse (comme le panier) ; Modal garde monte pendant la sortie.
  const [mounted, setMounted] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(EXIT)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: EXIT, duration: 320, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, fade, slide]);

  useEffect(() => {
    if (!visible) return;
    const start = value && value >= todayISO && value <= lastISO ? value : todayISO;
    const d = fromISO(start);
    setDay(start);
    setHour(time || "");
    setCal({ y: d.getFullYear(), m: d.getMonth() });
  }, [visible, value, time, todayISO, lastISO]);

  const step = (n: number) =>
    setCal((c) => {
      const d = new Date(c.y, c.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const prevOff = toISO(new Date(cal.y, cal.m, 0)) < todayISO;
  const nextOff = toISO(new Date(cal.y, cal.m + 1, 1)) > lastISO;
  const d = fromISO(day);
  const slots = pickupHourSlots(openTime, closeTime, day, leadMinutes);
  const hourOk = !!hour && slots.includes(hour);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom, transform: [{ translateY: slide }] }]}>
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
        <Text style={styles.hourLabel}>{t("Heure de passage")}</Text>
        {slots.length === 0 ? (
          <Text style={styles.hourEmpty}>{t("Boutique fermée pour le reste de la journée")}</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours} style={styles.hoursBox}>
            {slots.map((h) => (
              <Pressable key={h} onPress={() => setHour(h)} style={[styles.hourChip, h === hour && styles.on]}>
                <Text style={[styles.day, h === hour && styles.onText]}>{h}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Pressable onPress={() => hourOk && onPick(day, hour)} disabled={!hourOk} style={[styles.apply, !hourOk && styles.disabled]}>
          <Text style={styles.applyText}>
            {!hourOk
              ? t("Choisissez une heure")
              : `${day === todayISO ? t("Récupérer aujourd'hui") : `${t("Récupérer le")} ${d.getDate()} ${t(MONTHS[d.getMonth()])}`} · ${hour}`}
          </Text>
        </Pressable>
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: DS.sheetScrim },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: DS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  head: { height: 36, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  title: { fontSize: 18, fontWeight: "700", color: DS.ink },
  step: { width: 28, height: 28, borderRadius: 14, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  stepLabel: { minWidth: 92, textAlign: "center", fontSize: 13, fontWeight: "600", color: DS.ink },
  disabled: { opacity: 0.35 },
  row: { flexDirection: "row" },
  cell: { flex: 1, height: 34, alignItems: "center", justifyContent: "center", textAlign: "center", textAlignVertical: "center" },
  weekday: { height: 22, fontSize: 11, fontWeight: "600", color: DS.faint },
  on: { backgroundColor: DS.accent, borderRadius: 12 },
  day: { fontSize: 13.5, fontWeight: "600", color: DS.ink },
  today: { color: DS.accentInk, fontWeight: "800" },
  off: { color: DS.idle },
  onText: { color: DS.onInk },
  hourLabel: { marginTop: 8, marginBottom: 6, fontSize: 12, fontWeight: "700", color: DS.faint },
  hourEmpty: { height: 34, fontSize: 13, color: DS.faint, textAlignVertical: "center" },
  hoursBox: { flexGrow: 0 },
  hours: { gap: 6, paddingRight: 8 },
  hourChip: { height: 34, paddingHorizontal: 12, borderRadius: 12, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  apply: { height: 48, marginTop: "auto", borderRadius: 24, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14.5, fontWeight: "700", color: DS.onInk },
});
