import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ZoneGroup, ZoneHourEntry } from "./groupZones";
import { useSheetAnimation } from "./useSheetAnimation";
import { zoneListStyles as st } from "./ZoneListSheet.styles";
import { ZoneBanner } from "./ZoneBanner";
import { ZoneSlotGrid } from "./ZoneSlotGrid";

interface ZoneListSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: ZoneGroup[];
  selectedHour: string | null;
  selectedLieu: string | null;
  /** Clic sur un creneau : ouvre le formulaire d'edition de cette zone. */
  onSelect: (lieu: string, entry: ZoneHourEntry) => void;
}

const toNumber = (prix?: string): number | null => {
  if (!prix) return null;
  const n = Number(String(prix).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR").replace(/ |,/g, " ")} F`;

/**
 * Bottom sheet de consultation des zones de livraison. Une zone est
 * selectionnee par une chip horizontale ; le sheet resume alors son tarif
 * express et son tarif programme, puis liste ses creneaux (le moins cher est
 * mis en avant). Cliquer un creneau ouvre son formulaire d'edition.
 */
export const ZoneListSheet: React.FC<ZoneListSheetProps> = ({
  visible,
  onClose,
  groups,
  selectedHour,
  selectedLieu,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const { mounted, backdropOpacity, translateY } = useSheetAnimation(visible);
  const [index, setIndex] = useState(0);

  // A l'ouverture, se caler sur la zone en cours d'edition si elle existe.
  useEffect(() => {
    if (!visible) return;
    const i = selectedLieu
      ? groups.findIndex((g) => g.lieu === selectedLieu)
      : -1;
    setIndex(i >= 0 ? i : 0);
  }, [visible, selectedLieu, groups]);

  const current = groups[index];

  const view = useMemo(() => {
    if (!current) return null;

    // Express : prix le plus bas parmi les heures qui en proposent un.
    const expressPrices = current.hours
      .map((h) => toNumber(h.expressPrix))
      .filter((n): n is number => n !== null);
    const expressLo = expressPrices.length ? Math.min(...expressPrices) : null;

    // Programme : les creneaux periodiques, tries par heure.
    const slots = current.hours
      .filter((h) => toNumber(h.periodicPrix) !== null)
      .slice()
      .sort((a, b) => a.hour.localeCompare(b.hour));
    return {
      expressPrice: expressLo !== null ? fmt(expressLo) : "—",
      expressNote:
        expressLo !== null
          ? `${expressPrices.length} heure${expressPrices.length > 1 ? "s" : ""}`
          : "Non desservi",
      slots,
    };
  }, [current]);

  if (!mounted) return null;

  return (
    <Modal transparent={true} visible={mounted} animationType="none">
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            st.sheet,
            {
              transform: [{ translateY }],
              // Degage la barre de navigation systeme.
              paddingBottom: 28 + insets.bottom,
              maxHeight: "95%",
            },
          ]}
        >
          <View style={st.header}>
            <Text style={st.title}>Vos adresses et heures de livraison</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Hauteur fixe, alignee sur celle du formulaire d'ajout/edition
              pour que les deux sheets ouvrent a la meme taille. */}
          <View style={st.body}>
          {!current || !view ? (
            <Text style={st.empty}>Aucune zone de livraison enregistrée.</Text>
          ) : (
            <>
              {/* Une seule zone : pas de chips a faire defiler, on nomme
                  directement la zone dans un bandeau. */}
              {(() => {
                // 1 ou 2 zones : bandeaux nommes plutot que des chips.
                if (groups.length === 1)
                  return (
                    <ZoneBanner
                      lieu={current.lieu}
                      sub="Votre unique zone de livraison"
                    />
                  );

                // Jusqu'a 3 zones, les bandeaux tiennent sur une ligne.
                if (groups.length <= 3)
                  return (
                    <View style={st.chipsRowFill}>
                      {groups.map((g, i) => (
                        <ZoneBanner
                          key={g.lieu}
                          lieu={g.lieu}
                          sub={`${g.hours.length} horaire${g.hours.length > 1 ? "s" : ""}`}
                          compact={true}
                          // A 3, la place manque pour l'icone de localisation.
                          hidePin={groups.length === 3}
                          active={i === index}
                          onPress={() => setIndex(i)}
                        />
                      ))}
                    </View>
                  );

                const chips = groups.map((g, i) => {
                  const on = i === index;
                  return (
                    <TouchableOpacity
                      key={g.lieu}
                      onPress={() => setIndex(i)}
                      style={[st.chip, on && st.chipOn]}
                    >
                      <Text
                        style={[st.chipText, on && st.chipTextOn]}
                        numberOfLines={1}
                      >
                        {g.lieu}
                      </Text>
                    </TouchableOpacity>
                  );
                });

                return (
                  <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -20, flexGrow: 0 }}
                    contentContainerStyle={st.chipsRow}
                  >
                    {chips}
                  </ScrollView>
                );
              })()}

              {/* Les rangees se partagent la hauteur restante : tout tient
                  dans le sheet, sans defilement. */}
              <View style={{ flex: 1, marginTop: 14 }}>
                <ZoneSlotGrid
                  lieu={current.lieu}
                  slots={view.slots}
                  expressPrice={view.expressPrice}
                  expressNote={view.expressNote}
                  selectedHour={selectedHour}
                  selectedLieu={selectedLieu}
                  onSelect={onSelect}
                  fmt={fmt}
                  toNumber={toNumber}
                />
              </View>

              <Text style={st.footer}>
                {current.lieu} · touchez un créneau pour le modifier
              </Text>
            </>
          )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
