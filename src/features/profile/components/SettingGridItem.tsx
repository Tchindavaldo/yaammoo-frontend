// Copie dediee de SettingItem pour l'affichage en grille de l'ecran Settings
// (R16 : on ne modifie pas SettingItem).
// Tuile alignee a gauche : pastille d'icone, libelle dessous, hint optionnel.
// Le rendu est le meme quelle que soit la largeur ; celle-ci est fixee par
// SettingGrid.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../../theme';
import { DS } from '../../../theme/ds';

/** Teinte de la pastille d'icone. */
export type SettingTileTone = 'neutral' | 'accent' | 'info' | 'danger';

const TONES: Record<SettingTileTone, { icon: string; bg: string }> = {
  neutral: { icon: DS.ink, bg: DS.surface },
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
  /** Pastille de compteur en haut a droite (masquee si 0). */
  badge?: number;
}

export const SettingGridItem: React.FC<SettingGridItemProps> = ({
  icon,
  title,
  onPress,
  tone = 'neutral',
  hint,
  inline = false,
  loading = false,
  badge = 0,
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
          <Ionicons name={icon as any} size={19} color={iconColor} />
        )}
      </View>

      <View>
        <Text style={[styles.label, isDanger && { color: Theme.colors.danger }]}>{title}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>

      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 10,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    color: DS.ink,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: DS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: DS.bg,
    fontSize: 11,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.gray[600],
    marginTop: 2,
  },
});
