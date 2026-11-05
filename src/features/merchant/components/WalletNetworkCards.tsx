"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { WalletBreakdown, WalletBalances } from "../services/walletNetwork";
import { t, useLanguage } from "@/src/i18n";

/**
 * Deux cartes cote a cote (MTN / Orange) : commandes + frais de retrait = total.
 * Quatre presentations a comparer (maquettes B, C, D, F), choisies depuis le
 * header du portefeuille. Les montants viennent tels quels du backend.
 */
export type WalletCardsVariant = 1 | 2 | 3 | 4;

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

const NETS: { key: keyof WalletBalances; label: string }[] = [
  { key: "mtn", label: "MTN" },
  { key: "orange", label: "Orange" },
];

const LOGOS = {
  mtn: require("@/assets/images/wallet/mtn-momo.jpg"),
  orange: require("@/assets/images/wallet/orange-money.png"),
};

const Line: React.FC<{ lbl: string; val: string }> = ({ lbl, val }) => (
  <View style={s.line}>
    <Text style={s.lbl}>{lbl}</Text>
    <Text style={s.val}>{val}</Text>
  </View>
);

export const WalletNetworkCards: React.FC<{
  breakdown: WalletBreakdown;
  variant: WalletCardsVariant;
}> = ({ breakdown, variant }) => {
  useLanguage();

  // F : colonnes sans fond, separees par un trait.
  if (variant === 4) {
    return (
      <View style={s.rowF}>
        {NETS.map(({ key, label }, i) => {
          const p = breakdown[key];
          return (
            <React.Fragment key={key}>
              {i > 0 && <View style={s.sepF} />}
              <View style={s.colF}>
                <Text style={s.titleF}>{label}</Text>
                <Text style={s.totalF}>{fmt(p.total)}</Text>
                <Line lbl={t("Commandes")} val={fmt(p.orders)} />
                <Line lbl={t("Frais de retrait")} val={fmt(p.fees)} />
              </View>
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <View style={s.row}>
      {NETS.map(({ key, label }) => {
        const p = breakdown[key];
        // B : carte ticket, total en bas apres un trait.
        if (variant === 1) {
          return (
            <View key={key} style={[s.card, s.cardBorder]}>
              <Text style={s.chip}>{label}</Text>
              <Line lbl={t("Commandes")} val={fmt(p.orders)} />
              <Line lbl={t("Frais de retrait")} val={fmt(p.fees)} />
              <View style={s.ticketTotal}>
                <Text style={s.totalLbl}>{t("Total")}</Text>
                <Text style={s.totalB}>{fmt(p.total)}</Text>
              </View>
            </View>
          );
        }
        // C : carte repartition sur fond gris, barre commandes / frais.
        if (variant === 2) {
          const total = p.total > 0 ? p.total : 1;
          const ordersPct = (p.orders / total) * 100;
          const feesPct = p.total > 0 ? Math.max((p.fees / total) * 100, 3) : 0;
          return (
            <View key={key} style={[s.card, { backgroundColor: DS.surface }]}>
              <Text style={s.titleC}>{label}</Text>
              <Text style={s.totalC}>{fmt(p.total)}</Text>
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
        }
        // D : logo Mobile Money du reseau.
        return (
          <View key={key} style={[s.card, s.cardBorder]}>
            <View style={s.logoRow}>
              <Image
                source={LOGOS[key]}
                resizeMode={key === "mtn" ? "cover" : "contain"}
                style={[s.logo, key === "mtn" ? s.logoMtn : s.logoOrange]}
              />
              <Text style={s.logoLbl}>{label}</Text>
            </View>
            <Text style={s.totalD}>{fmt(p.total)}</Text>
            <Line lbl={t("Commandes")} val={fmt(p.orders)} />
            <Line lbl={t("Frais de retrait")} val={fmt(p.fees)} />
          </View>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 12 },
  card: { flex: 1, borderRadius: 16, padding: 14, gap: 4 },
  cardBorder: { backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.line },
  line: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  lbl: { fontSize: 12, color: DS.muted },
  val: { fontSize: 12, fontWeight: "600", color: DS.text2 },
  // B
  chip: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: DS.text2,
    backgroundColor: DS.surface,
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  ticketTotal: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: DS.idle,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLbl: { fontSize: 12, fontWeight: "700", color: DS.muted },
  totalB: { fontSize: 18, fontWeight: "800", color: DS.ink },
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
  // D
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  logoMtn: { backgroundColor: DS.mtnBlue },
  logoOrange: { backgroundColor: DS.orangeMoneyBg, padding: 5 },
  logoLbl: { fontSize: 13, fontWeight: "700", color: DS.text2 },
  totalD: { fontSize: 20, fontWeight: "800", color: DS.ink, marginVertical: 8 },
  // F
  rowF: { flexDirection: "row", paddingTop: 20, paddingBottom: 16 },
  colF: { flex: 1, paddingHorizontal: 20 },
  sepF: { width: 1, backgroundColor: DS.line },
  titleF: {
    fontSize: 12,
    fontWeight: "700",
    color: DS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalF: { fontSize: 24, fontWeight: "800", color: DS.ink, marginTop: 4, marginBottom: 10 },
});
