import { Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../CheckoutSheet.styles";

interface DeliveryTabProps {
  delivery: Livraison;
  setDelivery: (delivery: Livraison) => void;
  onOpenLocation?: () => void;
  onOpenContact?: () => void;
  onOpenPeriod?: () => void;
  onOpenVoiceNote?: () => void;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({
  delivery,
  setDelivery,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenVoiceNote,
}) => {
  const isLocationFilled = !!delivery.address;
  const isPeriodFilled = !!delivery.hour;
  const isContactFilled = !!delivery.phone;
  const isVoiceNoteFilled = !!delivery.voiceNoteUri;

  const getBtnStyle = (filled: boolean) => [
    styles.infoBtnLarge,
    filled && {
      borderColor: "#ec4913",
      borderWidth: 2,
      backgroundColor: "rgba(236, 73, 19, 0.05)",
    },
  ];

  const getIconColor = (filled: boolean) => (filled ? "#ec4913" : "#94a3b8");
  const getTextColor = (filled: boolean) => (filled ? "#ec4913" : "#0f172a");

  const deliveryType = delivery.type;

  // Prix affiché dans les boutons Express/Heure (vient de la période sélectionnée)
  const selectedPrice = delivery.deliveryPrice || delivery.price || "";

  return (
    <View
      style={[
        styles.deliveryContainer,
        localStyles.deliveryContainer,
        { height: 230 },
      ]}
    >
      {/* Zone haute (cartes infos) */}
      <View style={localStyles.topZone}>
        {/* Layout Express : 3 cartes sur une ligne */}
        {deliveryType === "express" && (
          <View style={localStyles.expressRow}>
            <View style={localStyles.expressCardsCol}>
              <TouchableOpacity
                style={[getBtnStyle(isLocationFilled), { flex: 1 }]}
                onPress={onOpenLocation}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={getIconColor(isLocationFilled)}
                />
                <View style={styles.infoBtnText}>
                  <Text
                    style={[
                      styles.infoBtnTitle,
                      { color: getTextColor(isLocationFilled) },
                    ]}
                  >
                    Lieux
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[getBtnStyle(isContactFilled), { flex: 1 }]}
                onPress={onOpenContact}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={getIconColor(isContactFilled)}
                />
                <View style={styles.infoBtnText}>
                  <Text
                    style={[
                      styles.infoBtnTitle,
                      { color: getTextColor(isContactFilled) },
                    ]}
                  >
                    Contact
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[getBtnStyle(isVoiceNoteFilled), { flex: 1 }]}
                onPress={onOpenVoiceNote}
              >
                <Ionicons
                  name="mic-outline"
                  size={20}
                  color={getIconColor(isVoiceNoteFilled)}
                />
                <View style={styles.infoBtnText}>
                  <Text
                    style={[
                      styles.infoBtnTitle,
                      { color: getTextColor(isVoiceNoteFilled) },
                    ]}
                  >
                    Note vocale
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Layout Standard : 4 cartes */}
        {deliveryType === "standard" && (
          <View style={styles.infoGrid4}>
            <TouchableOpacity
              style={getBtnStyle(isLocationFilled)}
              onPress={onOpenLocation}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={getIconColor(isLocationFilled)}
              />
              <View style={styles.infoBtnText}>
                <Text
                  style={[
                    styles.infoBtnTitle,
                    { color: getTextColor(isLocationFilled) },
                  ]}
                >
                  Lieux
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={getBtnStyle(isPeriodFilled)}
              onPress={onOpenPeriod}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={getIconColor(isPeriodFilled)}
              />
              <View style={styles.infoBtnText}>
                <Text
                  style={[
                    styles.infoBtnTitle,
                    { color: getTextColor(isPeriodFilled) },
                  ]}
                >
                  Période
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={getBtnStyle(isContactFilled)}
              onPress={onOpenContact}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color={getIconColor(isContactFilled)}
              />
              <View style={styles.infoBtnText}>
                <Text
                  style={[
                    styles.infoBtnTitle,
                    { color: getTextColor(isContactFilled) },
                  ]}
                >
                  Contact
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={getBtnStyle(isVoiceNoteFilled)}
              onPress={onOpenVoiceNote}
            >
              <Ionicons
                name="mic-outline"
                size={20}
                color={getIconColor(isVoiceNoteFilled)}
              />
              <View style={styles.infoBtnText}>
                <Text
                  style={[
                    styles.infoBtnTitle,
                    { color: getTextColor(isVoiceNoteFilled) },
                  ]}
                >
                  Note
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {deliveryType === "aucune" && (
          <View style={localStyles.aucuneBanner}>
            <Ionicons name="storefront-outline" size={20} color="#64748b" />
            <Text style={localStyles.aucuneText}>
              Vous passerez en boutique récupérer votre commande
            </Text>
          </View>
        )}
      </View>

      {/* Zone basse (sélection du type) — prix dynamique depuis la période */}
      <View style={localStyles.bottomZone}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Select Type</Text>
        </View>

        <View style={[styles.deliveryTypeGrid, localStyles.deliveryTypeGrid]}>
          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              delivery.type === "express" && styles.deliveryTypeActive,
            ]}
            onPress={() =>
              setDelivery({ ...delivery, statut: true, type: "express" })
            }
          >
            <Ionicons
              name="flash-outline"
              size={22}
              color={delivery.type === "express" ? "#ec4913" : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                Express
                {selectedPrice ? ` (${selectedPrice}F)` : ""}
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "express" && { color: "#ec4913" },
                ]}
              >
                Livré dès que terminée
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              delivery.type === "standard" && styles.deliveryTypeActive,
            ]}
            onPress={() =>
              setDelivery({ ...delivery, statut: true, type: "standard" })
            }
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={delivery.type === "standard" ? "#ec4913" : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                Heure
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "standard" && { color: "#ec4913" },
                ]}
              >
                {selectedPrice ? `${selectedPrice}F` : "Choisir un créneau"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              delivery.type === "aucune" && styles.deliveryTypeActive,
            ]}
            onPress={() =>
              setDelivery({ ...delivery, statut: false, type: "aucune" })
            }
          >
            <Ionicons
              name="remove-circle-outline"
              size={22}
              color={delivery.type === "aucune" ? "#ec4913" : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                Aucun
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "aucune" && { color: "#ec4913" },
                ]}
              >
                No rush
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  deliveryContainer: {
    justifyContent: "space-between",
  },
  topZone: {
    flex: 1,
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  bottomZone: {
    flex: 1,
    justifyContent: "center",
  },
  expressRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  expressCardsCol: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  deliveryTypeGrid: {
    marginBottom: 0,
  },
  aucuneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 14,
  },
  aucuneText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});
