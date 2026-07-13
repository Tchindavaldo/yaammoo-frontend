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
  onOpenExpress?: () => void;
  onOpenVoiceNote?: () => void;
  availableHours?: any[];
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({
  delivery,
  setDelivery,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
  availableHours,
}) => {
  const isLocationFilled = !!delivery.address;
  const isPeriodFilled = !!delivery.hour;
  const isContactFilled = !!delivery.phone;
  const isVoiceNoteFilled = !!delivery.voiceNoteUri;
  const isExpressFilled = !!delivery.expressLieu;

  // Y a-t-il des zones express dans les données ? (nouveau format uniquement)
  // Si non (ancien format string[] ou absence), on masque la card Express.
  const hasExpressZones = Array.isArray(availableHours)
    ? availableHours.some(
        (h: any) =>
          h && typeof h === "object" && h.express && h.expressZones?.length > 0,
      )
    : false;

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

  // Prix de la période (Heure) et prix express, indépendants l'un de l'autre.
  const periodPrice =
    delivery.prix != null && Number(delivery.prix) > 0 ? delivery.prix : "";
  const expressPrice =
    delivery.expressPrix != null && Number(delivery.expressPrix) > 0
      ? delivery.expressPrix
      : "";

  // Parse `delivery.hour` au format "YYYY-MM-DD|HH:mm|lieu" → { date, heure }
  const parseHour = (raw: string) => {
    if (!raw) return { date: "", heure: "" };
    const parts = raw.split("|");
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]);
    const rawDate = isDate ? parts[0] : "";
    const heure = isDate ? parts[1] || "" : parts[0] || "";
    let date = "";
    if (rawDate) {
      const d = new Date(rawDate);
      date = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    }
    return { date, heure };
  };
  const { date: selectedDate, heure: selectedHour } = parseHour(delivery.hour);

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
              {/* Card zone express : uniquement si des zones express existent.
                  Bords surlignés quand sélectionné, aucune donnée affichée. */}
              {hasExpressZones && (
                <TouchableOpacity
                  style={[getBtnStyle(isExpressFilled), { flex: 1 }]}
                  onPress={onOpenExpress}
                >
                  <Ionicons
                    name="flash-outline"
                    size={20}
                    color={getIconColor(isExpressFilled)}
                  />
                  <View style={styles.infoBtnText}>
                    <Text
                      style={[
                        styles.infoBtnTitle,
                        { color: getTextColor(isExpressFilled) },
                      ]}
                    >
                      Zone
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
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
                {expressPrice ? ` (${expressPrice}F)` : ""}
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
              {selectedDate ? (
                <Text
                  style={[
                    styles.deliveryTypeSubText,
                    delivery.type === "standard" && { color: "#ec4913" },
                  ]}
                >
                  {selectedDate}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "standard" && { color: "#ec4913" },
                ]}
              >
                {selectedHour
                  ? `${selectedHour}${periodPrice ? ` · ${periodPrice}F` : ""}`
                  : "Choisir un créneau"}
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
