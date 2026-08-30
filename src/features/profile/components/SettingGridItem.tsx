// Copie dediee de SettingItem pour l'affichage en grille de l'ecran Settings
// (R16 : on ne modifie pas SettingItem).
// Tuile alignee a gauche : pastille d'icone, libelle dessous, hint optionnel.
// Le rendu est le meme quelle que soit la largeur ; celle-ci est fixee par
// SettingGrid.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../../theme';

/** Teinte de la pastille d'icone. */
export type SettingTileTone = 'neutral' | 'accent' | 'info' | 'danger';

const TONES: Record<SettingTileTone, { icon: string; bg: string }> = {
  neutral: { icon: Theme.colors.dark, bg: 'rgba(28,28,30,0.06)' },
  accent: { icon: Theme.colors.primary, bg: Theme.colors.primary + '1A' },
  info: { icon: Theme.colors.info, bg: Theme.colors.info + '1A' },
  danger: { icon: Theme.colors.danger, bg: Theme.colors.danger + '1A' },
};

interface SettingGridItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  tone?: SettingTileTone;
  /** Petite mention sous le libelle (ex. "2 en cours"). */
  hint?: string;
  /** Icone et texte sur la meme ligne (tuile seule dans sa section). */
  inline?: boolean;
  /** Affiche un loader a la place de l'icone et desactive le press. */
  loading?: boolean;
}

export const SettingGridItem: React.FC<SettingGridItemProps> = ({
  icon,
  title,
  onPress,
  tone = 'neutral',
  hint,
  inline = false,
  loading = false,
}) => {
  const { icon: iconColor, bg } = TONES[tone];
  const isDanger = tone === 'danger';

  return (
    <TouchableOpacity
      style={[styles.tile, inline && styles.tileInline, isDanger && styles.tileDanger]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: bg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={20} color={iconColor} />
        )}
      </View>

      <View>
        <Text style={[styles.label, isDanger && { color: Theme.colors.danger }]}>{title}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#F2F2F7',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 9,
  },
  tileDanger: {
    backgroundColor: Theme.colors.danger + '0D',
    borderColor: Theme.colors.danger + '33',
  },
  tileInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.gray[600],
    marginTop: 2,
  },
});
