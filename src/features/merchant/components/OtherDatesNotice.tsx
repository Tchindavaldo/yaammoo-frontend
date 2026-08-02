import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  /**
   * Nombre de commandes non traitées sur les jours PASSÉS, tous statuts et
   * toutes dates confondus (jamais restreint à la date filtrée). 0 = pas de carte.
   */
  pastCount: number;
  /** Idem pour les jours À VENIR. 0 = pas de carte. */
  futureCount: number;
  /** Ouvre le sheet de filtres pour choisir la date concernée. */
  onPress: () => void;
  /**
   * `false` dans un état vide, dont le parent porte déjà son propre padding
   * horizontal (sinon les marges s'additionnent et les cartes rétrécissent).
   */
  inset?: boolean;
}

/**
 * Rappel de fin de liste (et d'état vide) : ce qui existe sur d'AUTRES dates
 * que celle affichée. Une carte par cas, avec sa propre couleur : rouge pour le
 * passé non traité (du retard), bleu pour le futur (planning). Quand les deux
 * sont présents, elles se partagent la ligne à hauteur égale
 * (`alignItems: stretch` + `flex: 1`).
 *
 * Les compteurs sont GLOBAUX : ils comptent toutes les commandes concernées,
 * pas seulement celles de la date filtrée — c'est ce que le marchand veut
 * savoir avant de changer de date.
 */
export const OtherDatesNotice: React.FC<Props> = ({
  pastCount,
  futureCount,
  onPress,
  inset = true,
}) => {
  if (pastCount === 0 && futureCount === 0) return null;

  return (
    <View style={[styles.row, !inset && styles.rowFlush]}>
      {pastCount > 0 && (
        <TouchableOpacity
          style={[styles.card, styles.cardPast]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={18} color={PAST_COLOR} />
          <Text style={[styles.text, { color: PAST_COLOR }]}>
            {pastCount} Commandes passées non traitées
          </Text>
        </TouchableOpacity>
      )}

      {futureCount > 0 && (
        <TouchableOpacity
          style={[styles.card, styles.cardFuture]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={18} color={FUTURE_COLOR} />
          <Text style={[styles.text, { color: FUTURE_COLOR }]}>
            {futureCount} Commandes futur pas encore traité
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** Passé non traité : du retard, on alerte. */
const PAST_COLOR = "#C0392B";
/** Futur non traité : information de planning, pas une alerte. */
const FUTURE_COLOR = "#2E6FD9";

const styles = StyleSheet.create({
  row: {
    // Le parent état-vide est en `alignItems: center` : sans ça, la ligne se
    // réduirait à son contenu au lieu d'occuper la largeur disponible.
    alignSelf: "stretch",
    flexDirection: "row",
    // Les deux cartes gardent la même hauteur même si un libellé passe sur
    // deux lignes.
    alignItems: "stretch",
    gap: 10,
    marginTop: 14,
    marginHorizontal: 16,
  },
  rowFlush: {
    marginHorizontal: 0,
  },
  card: {
    // Une seule carte occupe toute la ligne ; deux la partagent à parts égales.
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardPast: {
    backgroundColor: PAST_COLOR + "12",
    borderColor: PAST_COLOR + "33",
  },
  cardFuture: {
    backgroundColor: FUTURE_COLOR + "12",
    borderColor: FUTURE_COLOR + "33",
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
});
