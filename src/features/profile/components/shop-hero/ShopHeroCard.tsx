"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Hero du nouveau design du profil marchand (maquette K1a du canvas Design) :
 * nom + statut, encaisse par jour de la semaine (barres, montant au-dessus),
 * puis 3 chiffres (aujourd'hui, semaine, solde).
 *
 * NOTE : apercu de design, donnees d'EXEMPLE (pas encore branchees au backend).
 */
const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const SAMPLE = { name: "Chez Mama Ndolé", perDayK: [18, 32, 15, 27, 41, 45, 0], todayIndex: 5 };
const BAR_MAX = 70;

export const ShopHeroCard: React.FC = () => {
  useLanguage();
  const max = Math.max(...SAMPLE.perDayK.slice(0, SAMPLE.todayIndex + 1), 1);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>{SAMPLE.name}</Text>
        <View style={styles.chip}>
          <View style={styles.chipDot} />
          <Text style={styles.chipText}>{t("Ouverte")} · 22h</Text>
        </View>
      </View>

      <View style={styles.chart}>
        {LETTERS.map((l, i) => {
          const future = i > SAMPLE.todayIndex;
          const today = i === SAMPLE.todayIndex;
          const v = SAMPLE.perDayK[i];
          return (
            <View key={i} style={styles.col}>
              <Text style={[styles.value, today && styles.accentText]}>
                {future ? "" : `${v}k`}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: future ? 6 : Math.max(6, Math.round((v / max) * BAR_MAX)),
                    backgroundColor: today ? DS.accent : future ? DS.track : DS.ink,
                    opacity: today || future ? 1 : 0.8,
                  },
                ]}
              />
              <Text style={[styles.letter, today && styles.accentText]}>{l}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.stats}>
        <Stat value="45 000 F" label={t("AUJOURD’HUI")} />
        <Stat value="178 000 F" label={t("SEMAINE")} />
        <Stat value="128 500 F" label={t("SOLDE")} />
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 28, backgroundColor: DS.surface },
  top: { height: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: DS.ink, letterSpacing: -0.2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 14, backgroundColor: DS.bg },
  chipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: DS.accent },
  chipText: { fontSize: 12, fontWeight: "600", color: DS.ink },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 120, paddingTop: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: DS.bg },
  col: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  value: { fontSize: 11, fontWeight: "600", color: DS.muted },
  bar: { width: "100%", maxWidth: 26, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  letter: { fontSize: 10, fontWeight: "600", color: DS.faint, paddingTop: 4, paddingBottom: 8 },
  accentText: { color: DS.accentInk },
  stats: { flexDirection: "row", gap: 6 },
  stat: { flex: 1, gap: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: DS.bg },
  statValue: { fontSize: 16, fontWeight: "600", color: DS.ink },
  statLabel: { fontSize: 10, fontWeight: "500", letterSpacing: 0.4, color: DS.muted },
});
