import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../../theme';

interface MenuStatsProps {
  total: number;
  available: number;
  unavailable: number;
  date: string;
}

export const MenuStats: React.FC<MenuStatsProps> = ({ total, available, unavailable, date }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.date}>{date}</Text>
      <View style={styles.row}>
        <StatItem label="Total" value={total} color={Theme.colors.dark} />
        <StatItem label="Dispo" value={available} color={Theme.colors.success} />
        <StatItem label="Indispo" value={unavailable} color={Theme.colors.danger} />
      </View>
    </View>
  );
};

const StatItem = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    margin: Theme.spacing.md,
    shadowColor: Theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  date: {
    fontSize: 14,
    color: Theme.colors.gray[600],
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: Theme.colors.gray[500],
    marginTop: 4,
  },
});
