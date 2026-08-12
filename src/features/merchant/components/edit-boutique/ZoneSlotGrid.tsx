import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import type { ZoneHourEntry } from "./groupZones";
import { zoneListStyles as st } from "./ZoneListSheet.styles";

interface ZoneSlotGridProps {
  lieu: string;
  /** Creneaux periodiques de la zone, tries par heure. */
  slots: ZoneHourEntry[];
  expressPrice: string;
  expressNote: string;
  selectedHour: string | null;
  selectedLieu: string | null;
  onSelect: (lieu: string, entry: ZoneHourEntry) => void;
  fmt: (n: number) => string;
  toNumber: (prix?: string) => number | null;
}

/** Une page de grille = 2 rangees de 4 cartes. */
const PER_PAGE = 8;

/**
 * Grille des tarifs d'une zone : toujours 4 cartes en haut et 4 en bas. La
 * premiere page s'ouvre sur la carte express ; les places libres sont
 * comblees par des cartes "non defini". Au-dela d'une page, la derniere carte
 * devient un "+N" qui fait defiler les pages en fondu.
 */
export const ZoneSlotGrid: React.FC<ZoneSlotGridProps> = ({
  lieu,
  slots,
  expressPrice,
  expressNote,
  selectedHour,
  selectedLieu,
  onSelect,
  fmt,
  toNumber,
}) => {
  const [page, setPage] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // Changer de zone remet la grille sur sa premiere page.
  useEffect(() => setPage(0), [lieu, slots.length]);

  /**
   * Decoupage en pages. La page 0 reserve une place a l'express, les
   * suivantes une place au bouton retour ; toute page qui n'est pas la
   * derniere reserve en plus sa derniere place au bouton "+N".
   */
  const pages = useMemo(() => {
    const out: ZoneHourEntry[][] = [];
    let i = 0;
    while (i < slots.length || out.length === 0) {
      // Express (page 0) ou bouton retour (pages suivantes).
      const room = PER_PAGE - 1;
      // On tente sans bouton : s'il reste des creneaux apres, il en faut un.
      const take = slots.length - i > room ? room - 1 : room;
      out.push(slots.slice(i, i + take));
      i += take;
    }
    return out;
  }, [slots]);

  const safePage = Math.min(page, pages.length - 1);
  const shown = pages[safePage] ?? [];
  const remaining =
    slots.length - pages.slice(0, safePage + 1).reduce((n, p) => n + p.length, 0);

  const goTo = (next: number) => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setPage(next);
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const cards: React.ReactNode[] = [];

  if (safePage === 0)
    cards.push(
      <View key="express" style={[st.priceCard, st.priceCardExpress]}>
        <View style={st.tag}>
          <View style={[st.tagDot, { backgroundColor: "#ec4913" }]} />
          <Text style={[st.tagText, { color: "#ec4913" }]}>Express</Text>
        </View>
        <Text style={st.priceValue}>{expressPrice}</Text>
        <Text style={st.priceNote} numberOfLines={1}>
          {expressNote}
        </Text>
      </View>,
    );
  // Pages suivantes : la premiere carte ramene a la page precedente.
  else
    cards.push(
      <TouchableOpacity
        key="back"
        onPress={() => goTo(safePage - 1)}
        activeOpacity={0.7}
        style={[st.priceCard, st.priceCardNav]}
      >
        <Ionicons name="chevron-back" size={20} color="#475569" />
        <Text style={st.priceNote} numberOfLines={1}>
          Retour
        </Text>
      </TouchableOpacity>,
    );

  shown.forEach((s) => {
    const price = toNumber(s.periodicPrix) as number;
    const active = selectedHour === s.hour && selectedLieu === lieu;
    cards.push(
      <TouchableOpacity
        key={s.hour}
        onPress={() => onSelect(lieu, s)}
        activeOpacity={0.7}
        style={[st.priceCard, st.priceCardSched, active && st.priceCardActive]}
      >
        <View style={st.tag}>
          <View style={[st.tagDot, { backgroundColor: "#10b981" }]} />
          <Text style={[st.tagText, { color: "#047857" }]}>{s.hour}</Text>
        </View>
        <Text
          style={st.priceValue}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.75}
        >
          {fmt(price)}
        </Text>
        <Text style={st.priceNote} numberOfLines={1}>
          Créneau
        </Text>
      </TouchableOpacity>,
    );
  });

  // Places libres : creneaux pas encore definis, valeurs neutres.
  while (cards.length < PER_PAGE - (remaining > 0 ? 1 : 0))
    cards.push(
      <View
        key={`empty-${cards.length}`}
        style={[st.priceCard, st.priceCardSched]}
      >
        <View style={st.tag}>
          <View style={[st.tagDot, { backgroundColor: "#10b981" }]} />
          <Text style={[st.tagText, { color: "#047857" }]}>--:--</Text>
        </View>
        <Text style={st.priceValue}>000 F</Text>
        <Text style={st.priceNote} numberOfLines={1}>
          Créneau
        </Text>
      </View>,
    );

  // Derniere carte : passage a la page suivante s'il reste des creneaux.
  if (remaining > 0)
    cards.push(
      <TouchableOpacity
        key="more"
        onPress={() => goTo(safePage + 1)}
        activeOpacity={0.7}
        style={[st.priceCard, st.priceCardNav]}
      >
        <Text style={st.priceCardMoreText}>+{remaining}</Text>
        <Text style={st.priceNote} numberOfLines={1}>
          Voir la suite
        </Text>
      </TouchableOpacity>,
    );

  const rows = [cards.slice(0, 4), cards.slice(4, 8)];

  return (
    <Animated.View style={{ flex: 1, opacity: fade }}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={[
            st.pricePair,
            st.pricePairFlex,
            ri > 0 && st.pricePairNext,
            // Souffle sous la derniere rangee, avant le pied du sheet.
            ri === rows.length - 1 && st.pricePairLast,
          ]}
        >
          {row}
        </View>
      ))}
    </Animated.View>
  );
};
