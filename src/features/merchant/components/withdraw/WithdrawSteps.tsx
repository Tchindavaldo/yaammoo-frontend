"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import type { PayoutNumbers, WithdrawQuote } from "../../services/withdrawService";
import {
  WALLET_NETWORKS,
  WalletBalances,
  WalletNetwork,
  balanceKey,
  formatF,
  formatPercent,
  formatPhone,
  groupThousands,
  networkLabel,
  walletLabel,
} from "../../services/walletNetwork";
import { ws } from "./WithdrawSheet.styles";

/**
 * Corps des trois etapes de la feuille de retrait (maquettes A1, C2, C3a du
 * canvas « Retrait »). Aucun chiffre calcule ici : soldes, frais et montants
 * viennent du backend (stats et devis, money-rules §8).
 */

/** Taux interreseau indicatif par reseau de RECEPTION (`/wallet/stats`). */
export type FeePercents = { mtn: number; orange: number } | undefined;

const StepHead: React.FC<{ title: string; step: 1 | 2 | 3 }> = ({ title, step }) => (
  <View style={ws.stepHead}>
    <Text style={ws.stepTitle} numberOfLines={1}>
      {title}
    </Text>
    <View style={ws.stepper}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[ws.stepDot, i === step && ws.stepDotActive]} />
      ))}
    </View>
  </View>
);

const Radio: React.FC<{ on: boolean }> = ({ on }) =>
  on ? (
    <View style={[ws.radio, ws.radioOn]}>
      <Ionicons name="checkmark" size={12} color={DS.onInk} />
    </View>
  ) : (
    <View style={ws.radio} />
  );

/** Badge de la carte « numero » : gratuit en meme reseau, taux sinon. */
const FeeBadge: React.FC<{
  source: WalletNetwork | null;
  target: WalletNetwork;
  percents: FeePercents;
  /** Frais du devis, en repli si le taux n'est pas fourni. */
  fee?: number;
}> = ({ source, target, percents, fee }) => {
  if (source === target) return <Text style={ws.badgeFree}>{t("Gratuit")}</Text>;
  const pct = percents?.[balanceKey(target)];
  const label =
    pct !== undefined
      ? t("+{{a}} % interréseau", { a: formatPercent(pct) })
      : fee !== undefined
        ? t("+{{a}} interréseau", { a: formatF(fee) })
        : t("Frais interréseau");
  return <Text style={ws.badgeFee}>{label}</Text>;
};

// ── Etape 1 : solde a debiter (A1) ─────────────────────────────────────────
export const WithdrawSourceStep: React.FC<{
  balances: WalletBalances;
  source: WalletNetwork | null;
  onSelect: (n: WalletNetwork) => void;
}> = ({ balances, source, onSelect }) => {
  useLanguage();
  return (
    <>
      <StepHead title={t("Faire un retrait")} step={1} />
      <Text style={ws.stepSub}>
        {t("Choisissez le solde à débiter. Un retrait vers un numéro du même réseau est sans frais.")}
      </Text>
      <View style={ws.cards}>
        {WALLET_NETWORKS.map((net) => {
          const on = source === net;
          return (
            <TouchableOpacity
              key={net}
              style={[ws.card, on && ws.cardActive]}
              onPress={() => onSelect(net)}
              activeOpacity={0.85}
            >
              <View style={ws.cardTop}>
                <View style={[ws.iconDot, on && ws.iconDotActive]}>
                  <Ionicons name="wallet-outline" size={16} color={DS.accent} />
                </View>
                <Radio on={on} />
              </View>
              <Text style={ws.cardLabel}>{t("Solde {{a}}", { a: networkLabel(net) })}</Text>
              <Text style={ws.cardAmount} numberOfLines={1} adjustsFontSizeToFit>
                {formatF(balances[balanceKey(net)])}
              </Text>
              <Text style={ws.cardSub}>{t("disponibles")}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

// ── Etape 2 : numero de reception (C2), le montant est dans le pied ────────
export const WithdrawReceiveStep: React.FC<{
  balances: WalletBalances;
  source: WalletNetwork | null;
  target: WalletNetwork | null;
  onSelect: (n: WalletNetwork) => void;
  numbers: PayoutNumbers;
  numbersLoading: boolean;
  percents: FeePercents;
}> = ({ balances, source, target, onSelect, numbers, numbersLoading, percents }) => {
  useLanguage();
  const other = WALLET_NETWORKS.find((n) => n !== source);
  const srcLabel = networkLabel(source);
  const sub =
    t("Débit du solde {{a}} ({{b}}). Vers {{a}} le retrait est gratuit", {
      a: srcLabel,
      b: source ? formatF(balances[balanceKey(source)]) : "",
    }) +
    (other && numbers[other]
      ? t(", vers {{a}} des frais interréseau s'ajoutent.", { a: networkLabel(other) })
      : ".");

  return (
    <>
      <StepHead title={t("Recevoir sur")} step={2} />
      <Text style={ws.stepSub}>{sub}</Text>
      <View style={ws.cards}>
        {WALLET_NETWORKS.map((net) => {
          const phone = numbers[net];
          if (!phone) {
            return (
              <View key={net} style={[ws.card, ws.cardEmpty]}>
                <View style={[ws.iconDot, ws.iconDotEmpty]}>
                  {numbersLoading ? (
                    <ActivityIndicator size={16} color={DS.slate500} />
                  ) : (
                    <Ionicons name="add" size={16} color={DS.slate500} />
                  )}
                </View>
                <Text style={ws.cardLabel}>{walletLabel(net)}</Text>
                <Text style={ws.cardEmptyText}>
                  {numbersLoading
                    ? t("Chargement du numéro…")
                    : t("Aucun numéro. À ajouter dans les informations de la boutique.")}
                </Text>
              </View>
            );
          }
          const on = target === net;
          return (
            <TouchableOpacity
              key={net}
              style={[ws.card, on && ws.cardActive]}
              onPress={() => onSelect(net)}
              activeOpacity={0.85}
            >
              <View style={ws.cardTop}>
                <View style={[ws.iconDot, on && ws.iconDotActive]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={DS.accent} />
                </View>
                <Radio on={on} />
              </View>
              <Text style={ws.cardLabel}>{walletLabel(net)}</Text>
              <Text style={ws.cardPhone} numberOfLines={1} adjustsFontSizeToFit>
                {formatPhone(phone)}
              </Text>
              <FeeBadge source={source} target={net} percents={percents} />
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

// ── Etape 3 : recapitulatif (C3a) ──────────────────────────────────────────
export const WithdrawRecapStep: React.FC<{
  source: WalletNetwork | null;
  target: WalletNetwork | null;
  phone?: string;
  quote: WithdrawQuote | null;
  percents: FeePercents;
}> = ({ source, target, phone, quote, percents }) => {
  useLanguage();
  if (!quote || !target) return null;
  const sent = quote.sentAmount ?? quote.amount;
  const remaining = quote.sourceBalance - quote.totalDebited;

  return (
    <>
      <StepHead title={t("Récapitulatif")} step={3} />
      <View style={ws.stepGap} />
      <View style={ws.cards}>
        <View style={ws.recapCard}>
          <Text style={ws.recapLabel}>{t("Depuis solde {{a}}", { a: networkLabel(source) })}</Text>
          <Text style={ws.recapValue} numberOfLines={1} adjustsFontSizeToFit>
            {groupThousands(quote.sourceBalance)}{" "}
            <Text style={ws.recapDebit}>− {formatF(quote.totalDebited)}</Text>
          </Text>
          <Text style={ws.recapLabel}>{t("restant {{a}}", { a: formatF(remaining) })}</Text>
        </View>
        <View style={ws.recapCard}>
          <Text style={ws.recapLabel}>{t("Vers")}</Text>
          <Text style={ws.recapValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatPhone(phone)}
          </Text>
          <View style={ws.recapNet}>
            <Text style={ws.recapLabel}>{walletLabel(target)}</Text>
            <FeeBadge source={source} target={target} percents={percents} fee={quote.fee} />
          </View>
        </View>
      </View>

      {/* Case FIGEE cochee : les frais de retrait sont toujours ajoutes par le
          backend (envoye = montant + kiosque). Elle informe, elle ne bascule pas. */}
      <View style={ws.feeRow} accessibilityRole="checkbox" accessibilityState={{ checked: true, disabled: true }}>
        <View style={ws.checkbox}>
          <Ionicons name="checkmark" size={13} color={DS.onInk} />
        </View>
        <Text style={ws.feeLabel}>{t("Retirer avec les frais de retrait")}</Text>
        <Text style={ws.feeValue}>+ {formatF(quote.kioskFee ?? 0)}</Text>
      </View>

      <View style={ws.receiveRow}>
        <Text style={ws.receiveLabel}>{t("Vous allez recevoir exactement")}</Text>
        <Text style={ws.receiveValue}>{formatF(sent)}</Text>
      </View>
    </>
  );
};
