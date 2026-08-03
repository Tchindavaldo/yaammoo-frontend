import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { ZoneGroup, ZoneHourEntry } from "./groupZones";
import {
  GhostTable,
  GHOST_ROW_HEIGHT,
  GHOST_HEADER_HEIGHT,
  GHOST_MIN_VISIBLE,
} from "./GhostZoneTable";

interface DeliveryZoneListProps {
  groups: ZoneGroup[];
  /** Heure selectionnee (surlignage), null si vue "toutes les heures". */
  selectedHour: string | null;
  /** Lieu selectionne : distingue deux lignes partageant la meme heure. */
  selectedLieu: string | null;
  onSelect: (lieu: string, entry: ZoneHourEntry) => void;
}

/**
 * Liste des zones de livraison : une card par lieu, nom de la zone en bandeau
 * superieur, puis les heures en tableau Periodique / Express aligne.
 */
export const DeliveryZoneList: React.FC<DeliveryZoneListProps> = ({
  groups,
  selectedHour,
  selectedLieu,
  onSelect,
}) => {
  // Hauteurs mesurees : on comble le vide restant avec un tableau fantome
  // (lignes vides) tant que le contenu ne declenche pas le scroll.
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  // -16 : gap sous les zones + padding bas du conteneur.
  const freeSpace = viewportH - contentH - 16;
  // La card s'affiche des qu'il reste un vide visible (meme trop petit pour
  // son socle : elle est alors tronquee par le conteneur). Le nombre de lignes
  // se calcule sur ce qui depasse le socle.
  const showGhost = viewportH > 0 && freeSpace >= GHOST_MIN_VISIBLE;
  const ghostRows = Math.max(
    0,
    Math.floor((freeSpace - GHOST_HEADER_HEIGHT) / GHOST_ROW_HEIGHT),
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
      contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
    >
      {/* Wrapper mesure : hauteur des vraies zones, hors tableau fantome (sinon
        le fantome se mesurerait lui-meme et la hauteur ne convergerait pas). */}
      <View
        style={{ gap: 12 }}
        onLayout={(e) => setContentH(e.nativeEvent.layout.height)}
      >
        {groups.length === 0 ? (
          <Text
            style={{
              fontSize: 13,
              color: "#94a3b8",
              fontStyle: "italic",
              paddingVertical: 10,
            }}
          >
            Aucune zone renseignée
          </Text>
        ) : (
          groups.map((g, gi) => (
            <View
              key={`${g.lieu}-${gi}`}
              style={{
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
            >
              {/* Bandeau superieur : nom de la zone (fond doux, accent orange) */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#f8fafc",
                  borderBottomWidth: 1,
                  borderBottomColor: "#f1f5f9",
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                }}
              >
                <Ionicons name="location" size={14} color="#ec4913" />
                <Text
                  style={{
                    flex: 1,
                    color: "#0f172a",
                    fontSize: 13,
                    fontWeight: "bold",
                    letterSpacing: 0.5,
                  }}
                  numberOfLines={1}
                >
                  {g.lieu.toUpperCase()}
                </Text>
                <Text
                  style={{
                    color: "#94a3b8",
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {g.hours.length} h
                </Text>
              </View>

              {/* Corps : tableau des heures */}
              <View style={{ padding: 10 }}>
                {/* En-tete de colonnes */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingBottom: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1f5f9",
                  }}
                >
                  <Text style={colHeader}>Heure</Text>
                  <Text style={[colHeader, { textAlign: "right" }]}>
                    Périod.
                  </Text>
                  <Text style={[colHeader, { textAlign: "right" }]}>
                    Express
                  </Text>
                </View>

                {g.hours.map((hh, hi) => {
                  const isSelected =
                    selectedHour === hh.hour && selectedLieu === g.lieu;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      key={`${hh.hour}-${g.lieu}-${hi}`}
                      onPress={() => onSelect(g.lieu, hh)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: hi === g.hours.length - 1 ? 0 : 1,
                        borderBottomColor: "#f8fafc",
                        backgroundColor: isSelected ? "#fef3ec" : "transparent",
                        borderRadius: isSelected ? 8 : 0,
                        paddingHorizontal: isSelected ? 6 : 0,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isSelected ? "#ec4913" : "#cbd5e1",
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "bold",
                            color: "#0f172a",
                          }}
                        >
                          {hh.hour}
                        </Text>
                      </View>
                      <Text style={cellValue}>
                        {hh.periodicPrix ? `${hh.periodicPrix} F` : "—"}
                      </Text>
                      <Text style={[cellValue, { color: "#ec4913" }]}>
                        {hh.expressPrix ? `${hh.expressPrix} F` : "—"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Tableau fantome : occupe le vide restant avec des lignes vides tant
        que la liste ne remplit pas la hauteur disponible. */}
      {showGhost && <GhostTable rows={ghostRows} />}
    </ScrollView>
  );
};

export const colHeader = {
  flex: 1,
  fontSize: 9,
  fontWeight: "700" as const,
  color: "#94a3b8",
  letterSpacing: 0.5,
};

const cellValue = {
  flex: 1,
  fontSize: 12,
  fontWeight: "bold" as const,
  color: "#0f172a",
  textAlign: "right" as const,
};
