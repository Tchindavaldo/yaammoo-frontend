"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import moment from 'moment';
import { WalletDayStat } from '@/src/features/merchant/services/walletStatsService';
import { t, useLanguage } from "@/src/i18n";

interface WalletDayStatItemProps {
  stat: WalletDayStat;
}

// Libelle de chaque sortie du jour (backend payoutByType). Sans detail (ancien
// backend) : une seule ligne « débit ».
const PAYOUT_LABELS: Record<string, string> = {
  withdrawal: "retrait",
  merchant_debit: "remboursement",
  sms_fee: "coût SMS",
};

function payoutLines(stat: WalletDayStat): [string, number][] {
  const byType = stat.payoutByType;
  if (!byType) return stat.payout > 0 ? [["débit", stat.payout]] : [];
  return Object.entries(byType)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => [PAYOUT_LABELS[type] ?? "débit", amount]);
}

export const WalletDayStatItem: React.FC<WalletDayStatItemProps> = ({ stat }) => {
  useLanguage();
  const hasActivity = stat.count > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: Theme.colors.gray[100] }]}>
        <Ionicons name="calendar-outline" size={20} color={Theme.colors.dark} />
      </View>
      <View style={styles.details}>
        <Text style={styles.day}>{moment(stat.period).format('dddd DD MMM YYYY')}</Text>
        <Text style={styles.count}>
          {stat.count} {t("transaction")}{stat.count > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: !hasActivity ? Theme.colors.gray[400] : stat.net < 0 ? Theme.colors.danger : Theme.colors.success }]}>
          {stat.net.toLocaleString('fr-FR')} F
        </Text>
        {payoutLines(stat).map(([label, amount]) => (
          <Text key={label} style={styles.payout}>-{amount.toLocaleString('fr-FR')} {t(label)}</Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  details: {
    flex: 1,
  },
  day: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    textTransform: 'capitalize',
  },
  count: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  payout: {
    fontSize: 10,
    color: Theme.colors.danger,
    marginTop: 2,
  },
});
