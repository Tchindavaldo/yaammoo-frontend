"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bottom sheet des villes du home (appui sur la pilule de localisation) :
// « Ma localisation » (ville par defaut), « Toutes les villes », puis chaque
// ville desservie avec son nombre de boutiques (`GET /fastfood/cities`).
// Voile en fondu, sheet qui monte du bas (R28).
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetAnimation } from "@/src/hooks/useSheetAnimation";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { fetchHomeCities, type HomeCitiesData, type HomeCity } from "../../hooks/useHomeCity";

interface Props {
  visible: boolean;
  homeCity: HomeCity;
  /** Lieu precis du client : sert a retirer de la liste la ville ou il se trouve. */
  placeLabel: string;
  /** Ville reelle du geocodage de la position (prioritaire sur le libelle). */
  placeCity: string;
  onClose: () => void;
}

export function HomeCitySheet({ visible, homeCity, placeLabel, placeCity, onClose }: Props) {
  useLanguage();
  const { bottom } = useSheetSafeInsets();
  const anim = useSheetAnimation(visible);
  const [data, setData] = useState<HomeCitiesData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetchHomeCities().then(d => { setData(d); setLoading(false); });
  }, [visible]);

  // La ville ou se trouve le client est deja couverte par « Ma localisation »
  // (son lieu precis y est inclus) : on ne la repete pas dans la liste.
  const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // 1) ville du geocodage (city/town/village), 2) repli : nom cite dans le libelle.
  const cities = data?.cities ?? [];
  const myCity =
    (placeCity ? cities.find(c => norm(c.name) === norm(placeCity)) ?? cities.find(c => norm(placeCity).includes(norm(c.name)) || norm(c.name).includes(norm(placeCity))) : undefined) ??
    cities.find(c => norm(placeLabel).includes(norm(c.name)));
  const pick = (fn: () => void) => { fn(); onClose(); };
  const Row = ({ icon, label, count, selected, onPress }: { icon: any; label: string; count?: number; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.row, selected && styles.rowOn]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.icon}><Ionicons name={icon} size={17} color={DS.accentDeep} /></View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {count != null ? <Text style={styles.count}>{count === 1 ? t("1 resto") : t("{{n}} restos", { n: count })}</Text> : null}
      {selected ? <Ionicons name="checkmark-circle" size={20} color={DS.accent} /> : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={anim.mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, anim.backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View onLayout={anim.onSheetLayout} style={[styles.sheet, anim.sheetStyle, { paddingBottom: bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t("Choisir une ville")}</Text>
        <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
          <Row icon="navigate" label={t("Ma localisation")} selected={!homeCity.manual} onPress={() => pick(() => void homeCity.resetToMyLocation())} />
          <Row icon="globe-outline" label={t("Toutes les villes")} count={data?.total} selected={homeCity.manual && !homeCity.city} onPress={() => pick(() => void homeCity.chooseCity(null))} />
          {loading && !data ? <ActivityIndicator style={{ marginVertical: 16 }} color={DS.accent} /> : null}
          {(data?.cities ?? []).filter(c => c !== myCity).map(c => (
            <Row key={c.name} icon="location-sharp" label={c.name} count={c.count} selected={homeCity.manual && homeCity.city === c.name} onPress={() => pick(() => void homeCity.chooseCity(c.name))} />
          ))}
        </ScrollView>
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DS.backdrop },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "80%", backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: DS.slate200, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "700", color: DS.ink, textAlign: "center", marginBottom: 14 },
  list: { flexGrow: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, height: 54, borderRadius: 16, backgroundColor: DS.slate50, borderWidth: 1, borderColor: DS.slate200 },
  rowOn: { borderColor: DS.accent, backgroundColor: DS.accentAlpha(0.08) },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: DS.accentAlpha(0.14), alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: DS.ink },
  count: { fontSize: 13, color: DS.muted },
});
