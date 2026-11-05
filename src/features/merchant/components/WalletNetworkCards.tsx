"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { WalletBreakdown, WalletBalances } from "../services/walletNetwork";
import { t, useLanguage } from "@/src/i18n";

/**
 * Deux cartes cote a cote (MTN / Orange) : commandes + frais de retrait = total.
 * Deux presentations a comparer (maquettes C fond gris et G = C avec logos
 * Mobile Money), choisies depuis le header du portefeuille. Les montants viennent tels quels du backend.
 */
export type WalletCardsVariant = 1 | 2;

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

const NETS: { key: keyof WalletBalances; label: string }[] = [
  { key: "mtn", label: "MTN" },
  { key: "orange", label: "Orange" },
];

const LOGOS = {
  mtn: require("@/assets/images/wallet/mtn-momo.jpg"),
  orange: require("@/assets/images/wallet/orange-money.png"),
};

export const WalletNetworkCards: React.FC<{
  breakdown: WalletBreakdown;
  variant: WalletCardsVariant;
}> = ({ breakdown, variant }) => {
  useLanguage();

  return (
    <View style={s.row}>
      {NETS.map(({ key, label }) => {
        const p = breakdown[key];
        // C : carte repartition sur fond gris ; G = C avec le logo du reseau.
          const total = p.total > 0 ? p.total : 1;
          const ordersPct = (p.orders / total) * 100;
          const feesPct = p.total > 0 ? Math.max((p.fees / total) * 100, 3) : 0;
          return (
            <View key={key} style={[s.card, { backgroundColor: DS.surface }]}>
              {variant === 2 ? (
                <View style={s.logoRow}>
                  <Image
                    source={LOGOS[key]}
                    resizeMode={key === "mtn" ? "cover" : "contain"}
                    style={[s.logo, key === "mtn" ? s.logoMtn : s.logoOrange]}
                  />
                  <Text style={s.logoLbl}>{label}</Text>
                </View>
              ) : (
                <Text style={s.titleC}>{label}</Text>
              )}
              <Text style={[s.totalC, variant === 2 && { marginTop: 10 }]}>{fmt(p.total)}</Text>
              <View style={s.track}>
                <View style={{ width: `${ordersPct}%`, backgroundColor: DS.accent }} />
                <View style={{ width: `${feesPct}%`, backgroundColor: DS.ink }} />
              </View>
              <View style={s.legend}>
                <View style={[s.dot, { backgroundColor: DS.accent }]} />
                <Text style={[s.lbl, { flex: 1 }]}>{t("Commandes")}</Text>
                <Text style={s.val}>{fmt(p.orders)}</Text>
              </View>
              <View style={s.legend}>
                <View style={[s.dot, { backgroundColor: DS.ink }]} />
                <Text style={[s.lbl, { flex: 1 }]}>{t("Frais de retrait")}</Text>
                <Text style={s.val}>{fmt(p.fees)}</Text>
              </View>
            </View>
          );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 12 },
  card: { flex: 1, borderRadius: 16, padding: 14, gap: 4 },
  lbl: { fontSize: 12, color: DS.muted },
  val: { fontSize: 12, fontWeight: "600", color: DS.text2 },
  // C
  titleC: { fontSize: 12, fontWeight: "700", color: DS.muted },
  totalC: { fontSize: 22, fontWeight: "800", color: DS.ink, marginTop: 2 },
  track: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: DS.track,
    marginVertical: 8,
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  // G : logo Mobile Money
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  logoMtn: { backgroundColor: DS.mtnBlue },
  logoOrange: { backgroundColor: DS.orangeMoneyBg, padding: 5 },
  logoLbl: { fontSize: 13, fontWeight: "700", color: DS.text2 },
});
