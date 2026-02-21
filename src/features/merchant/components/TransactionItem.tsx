import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Transaction } from '@/src/types';
import moment from 'moment';

interface TransactionItemProps {
  transaction: Transaction;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const isCredit = transaction.type === 'credit';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: isCredit ? Theme.colors.success + '15' : Theme.colors.danger + '15' }]}>
        <Ionicons 
          name={isCredit ? "arrow-down" : "arrow-up"} 
          size={20} 
          color={isCredit ? Theme.colors.success : Theme.colors.danger} 
        />
      </View>
      <View style={styles.details}>
        <Text style={styles.name}>{transaction.name}</Text>
        <Text style={styles.date}>{moment(transaction.createdAt).format('DD MMM YYYY, HH:mm')}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: isCredit ? Theme.colors.success : Theme.colors.danger }]}>
          {isCredit ? '+' : '-'}{transaction.amount} F
        </Text>
        <Text style={styles.payBy}>via {transaction.payBy}</Text>
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
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  date: {
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
  payBy: {
    fontSize: 10,
    color: Theme.colors.gray[400],
    marginTop: 2,
    textTransform: 'uppercase',
  }
});
