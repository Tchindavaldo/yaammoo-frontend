// Grille de l'ecran Settings (maquette "Settings - grille variantes").
//
// Regles de disposition :
// - Une section a plusieurs items est TOUJOURS en grille.
// - Le nombre de colonnes est constant sur toute la section ; il se deduit du
//   nombre d'items (1 -> 1, 2/4 -> 2, 3/5/6 -> 3, au-dela -> 3).
// - Les tuiles d'une meme ligne partagent la largeur a parts egales, donc une
//   derniere ligne incomplete s'etire au lieu de laisser un vide.
//
// Les enfants `false` / `null` (items masques par une condition) sont ignores,
// pour que la grille ne garde pas de trous.
import React from 'react';
import { StyleSheet, View } from 'react-native';

const GAP = 10;

/** Colonnes par nombre d'items, pour que les lignes restent homogenes. */
function columnsFor(count: number): number {
  if (count <= 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}

interface SettingGridProps {
  children: React.ReactNode;
  /** Force le nombre de colonnes au lieu de le deduire du nombre d'items. */
  columns?: number;
}

export const SettingGrid: React.FC<SettingGridProps> = ({ children, columns }) => {
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<{ inline?: boolean }> => React.isValidElement(child)
  );

  if (items.length === 0) return null;

  const cols = columns ?? columnsFor(items.length);

  const rows: React.ReactElement<{ inline?: boolean }>[][] = [];
  for (let i = 0; i < items.length; i += cols) {
    rows.push(items.slice(i, i + cols));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex > 0 && { marginTop: GAP }]}>
          {row.map((item, colIndex) => (
            <View key={colIndex} style={[styles.cell, colIndex > 0 && { marginLeft: GAP }]}>
              {/* Section a un seul item : icone et texte sur la meme ligne. */}
              {cols === 1 ? React.cloneElement(item, { inline: true }) : item}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    marginBottom: 22,
    // Bloc gris par section : les tuiles blanches ressortent dessus et la
    // separation entre sections se lit d'un coup d'oeil.
    backgroundColor: '#F2F2F7',
    borderRadius: 22,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
  },
});
