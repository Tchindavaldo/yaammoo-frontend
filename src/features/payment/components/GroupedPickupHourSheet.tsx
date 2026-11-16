"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Panier groupe, SUR PLACE : choix de l'HEURE de passage (tuile « Heure »).
// Meme habillage que GroupedPickupDateSheet (R16 : copie dediee). Heures
// libres au pas de 15 min, dans les horaires de la boutique (openTime ->
// closeTime), futures seulement si le jour retenu est aujourd'hui.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { pickupDayLabel, pickupHourSlots } from "@/src/features/checkout/utils/pickupHours";

const SHEET_HEIGHT = 384;
const EXIT = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  /** Jour retenu "YYYY-MM-DD". */
  day: string;
  value?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  leadMinutes?: number;
  onClose: () => void;
  onPick: (time: string) => void;
}

export const GroupedPickupHourSheet: React.FC<Props> = ({ visible, day, value, openTime, closeTime, leadMinutes, onClose, onPick }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const [hour, setHour] = useState("");
  const [mounted, setMounted] = useState(visible);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(EXIT)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setHour(value || "");
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
  }, [visible, value, fade, slide]);

  const slots = pickupHourSlots(openTime, closeTime, day, leadMinutes);
  const ok = !!hour && slots.includes(hour);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.sheet, { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom, transform: [{ translateY: slide }] }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{t("Heure de passage")}</Text>
          <Text style={styles.sub}>{pickupDayLabel(day)}</Text>
        </View>
        {slots.length === 0 ? (
          <Text style={styles.empty}>{t("Boutique fermée pour le reste de la journée")}</Text>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {slots.map((h) => (
              <Pressable key={h} onPress={() => setHour(h)} style={[styles.chip, h === hour && styles.on]}>
                <Text style={[styles.chipText, h === hour && styles.onText]}>{h}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Pressable onPress={() => ok && onPick(hour)} disabled={!ok} style={[styles.apply, !ok && styles.disabled]}>
          <Text style={styles.applyText}>{ok ? `${t("Passer à")} ${hour}` : t("Choisissez une heure")}</Text>
        </Pressable>
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: DS.sheetScrim },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: DS.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingHorizontal: 16 },
  head: { height: 36, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", color: DS.ink },
  sub: { fontSize: 13, fontWeight: "600", color: DS.faint },
  empty: { fontSize: 13, color: DS.faint, paddingVertical: 12 },
  list: { flex: 1, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { width: "22%", flexGrow: 1, height: 38, borderRadius: 12, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13.5, fontWeight: "600", color: DS.ink },
  on: { backgroundColor: DS.accent },
  onText: { color: DS.onInk },
  disabled: { opacity: 0.35 },
  apply: { height: 48, marginTop: "auto", borderRadius: 24, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 14.5, fontWeight: "700", color: DS.onInk },
});
