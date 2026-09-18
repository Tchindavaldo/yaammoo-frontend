// Tuile de grille portant un Switch (Notifications, Mode sombre) pour l'ecran
// Settings. Meme gabarit que SettingGridItem, mais non pressable : le Switch
// est place en haut a droite de la tuile, comme dans la maquette.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Theme } from '../../../theme';
import type { SettingTileTone } from './SettingGridItem';

const TONES: Record<SettingTileTone, { icon: string; bg: string }> = {
  neutral: { icon: Theme.colors.dark, bg: 'rgba(28,28,30,0.06)' },
  accent: { icon: Theme.colors.primary, bg: Theme.colors.primary + '1A' },
  info: { icon: Theme.colors.info, bg: Theme.colors.info + '1A' },
  danger: { icon: Theme.colors.danger, bg: Theme.colors.danger + '1A' },
};

interface SettingGridSwitchProps {
  icon: string;
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  tone?: SettingTileTone;
  /** Icone, libelle et Switch sur la meme ligne (tuile pleine largeur). */
  inline?: boolean;
}

export const SettingGridSwitch: React.FC<SettingGridSwitchProps> = ({
  icon,
  title,
  value,
  onValueChange,
  tone = 'neutral',
  inline = false,
}) => {
  const { icon: iconColor, bg } = TONES[tone];

  const control = (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Theme.colors.gray[200], true: Theme.colors.primary + '60' }}
      thumbColor={value ? Theme.colors.primary : Theme.colors.gray[400]}
    />
  );

  if (inline) {
    return (
      <View style={[styles.tile, styles.tileInline]}>
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[styles.label, styles.labelInline]}>{title}</Text>
        {control}
      </View>
    );
  }

  return (
    <View style={styles.tile}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        {control}
      </View>
      <Text style={styles.label}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECF0',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 9,
  },
  tileInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelInline: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: -0.1,
    color: Theme.colors.dark,
  },
});
