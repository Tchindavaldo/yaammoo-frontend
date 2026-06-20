import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import moment from 'moment';
import { WalletDayStat } from '@/src/features/merchant/services/walletStatsService';

interface WalletDayStatItemProps {
  stat: WalletDayStat;
}

export const WalletDayStatItem: React.FC<WalletDayStatItemProps> = ({ stat }) => {
  const hasActivity = stat.count > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: Theme.colors.success + '15' }]}>
        <Ionicons name="calendar-outline" size={20} color={Theme.colors.success} />
      </View>
      <View style={styles.details}>
        <Text style={styles.day}>{moment(stat.period).format('dddd DD MMM YYYY')}</Text>
        <Text style={styles.count}>
          {stat.count} transaction{stat.count > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: hasActivity ? Theme.colors.success : Theme.colors.gray[400] }]}>
          {stat.net.toLocaleString('fr-FR')} F
        </Text>
        {stat.payout > 0 && (
          <Text style={styles.payout}>-{stat.payout.toLocaleString('fr-FR')} retrait</Text>
        )}
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
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
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
