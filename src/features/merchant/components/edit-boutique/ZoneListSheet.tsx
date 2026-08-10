import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeliveryZoneList } from "./DeliveryZoneList";
import type { ZoneGroup, ZoneHourEntry } from "./groupZones";
import { useSheetAnimation } from "./useSheetAnimation";

/**
 * Hauteur du contenu, calee sur celle reellement occupee par le formulaire
 * d'ajout/edition (ZoneFormSheet : cases a cocher + ligne heure/prix + lieu).
 */
const LIST_HEIGHT = 220;

interface ZoneListSheetProps {
  visible: boolean;
  onClose: () => void;
  groups: ZoneGroup[];
  selectedHour: string | null;
  selectedLieu: string | null;
  /** Clic sur une ligne : ouvre le formulaire d'edition de cette zone. */
  onSelect: (lieu: string, entry: ZoneHourEntry) => void;
}

/**
 * Bottom sheet de consultation des zones de livraison. Reutilise le meme
 * tableau que la page 2 (DeliveryZoneList) pour un rendu identique.
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

  if (!mounted) return null;

  return (
    <Modal transparent={true} visible={mounted} animationType="none">
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(15,23,42,0.4)",
            opacity: backdropOpacity,
          }}
        />
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={{
            transform: [{ translateY }],
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            // Degage la barre de navigation systeme.
            paddingBottom: 28 + insets.bottom,
            maxHeight: "95%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a" }}>
              Vos adresses et heures de livraison
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#f1f5f9",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Hauteur explicite : la liste ne se dimensionne pas toute seule
              (ScrollView), un maxHeight ne suffit donc pas a agrandir le sheet. */}
          <View style={{ height: LIST_HEIGHT }}>
            <DeliveryZoneList
              groups={groups}
              selectedHour={selectedHour}
              selectedLieu={selectedLieu}
              onSelect={onSelect}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
