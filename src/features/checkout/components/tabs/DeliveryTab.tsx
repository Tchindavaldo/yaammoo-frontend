import { DeliveryOffer, Livraison } from "@/src/types";
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
  deliveryOffer?: DeliveryOffer | null;
  /**
   * Remplit la hauteur disponible au lieu des 230 px du sheet de commande, et
   * supprime la marge basse qui y réserve la place de la barre d'action absolue.
   * Utilisé par le sheet de livraison groupée, qui porte sa propre hauteur.
   */
  fillHeight?: boolean;
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
  deliveryOffer,
  fillHeight = false,
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

  // Livraison offerte détectée (offre backend active) : la card Express affiche
  // « Offert » à la place du prix. Dès qu'une zone est choisie, on affiche en
  // plus le prix réel — barré — à la suite de « Livré dès que terminée ».
  const deliveryFree = !!deliveryOffer?.active;

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
      date = d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
      });
    }
    return { date, heure };
  };
  const { date: selectedDate, heure: selectedHour } = parseHour(delivery.hour);

  return (
    <View
      style={[
        styles.deliveryContainer,
        localStyles.deliveryContainer,
        fillHeight ? { flex: 1 } : { height: 230 },
      ]}
    >
      {/* Zone haute (cartes infos). En `fillHeight`, elle prend la hauteur de
          son contenu au lieu de `flex: 1` : centree dans une zone plus haute
          que 230, elle se decollait du haut et collait la zone basse. */}
      <View style={[localStyles.topZone, fillHeight && localStyles.zoneAuto]}>
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
                    vocale
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
      <View
        style={[localStyles.bottomZone, fillHeight && localStyles.zoneAuto]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Select Type</Text>
        </View>

        <View
          style={[
            styles.deliveryTypeGrid,
            localStyles.deliveryTypeGrid,
            // `deliveryTypeGrid` reserve 80 px sous la grille pour la barre
            // d'action absolue du sheet de commande : inutile ailleurs.
            fillHeight && { marginBottom: 0 },
          ]}
        >
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
                {deliveryFree ? (
                  <Text style={{ color: "#ec4913" }}> · Offert</Text>
                ) : expressPrice ? (
                  ` (${expressPrice}F)`
                ) : (
                  ""
                )}
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "express" && { color: "#ec4913" },
                ]}
              >
                Livré dès que terminée
                {deliveryFree && expressPrice ? (
                  <Text style={localStyles.strikePrice}>
                    {" "}
                    · {expressPrice}F
                  </Text>
                ) : (
                  ""
                )}
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
                {deliveryFree ? (
                  <Text style={{ color: "#ec4913" }}> · Offert</Text>
                ) : (
                  ""
                )}
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
                {selectedHour ? (
                  deliveryFree ? (
                    <>
                      {selectedHour}
                      {periodPrice ? (
                        <Text style={localStyles.strikePrice}>
                          {" "}
                          · {periodPrice}F
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    `${selectedHour}${periodPrice ? ` · ${periodPrice}F` : ""}`
                  )
                ) : (
                  "Choisir un créneau"
                )}
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
  strikePrice: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  topZone: {
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  bottomZone: {
    flex: 1,
    justifyContent: "center",
  },
  /**
   * Mode `fillHeight` : la zone prend la hauteur de son CONTENU. Avec `flex: 1`
   * et un centrage vertical, sur une hauteur superieure aux 230 px d'origine la
   * zone haute se decollait du haut pendant que la zone basse venait la coller.
   * L'espace restant est reparti par le `space-between` du conteneur.
   */
  zoneAuto: { flex: 0, justifyContent: "flex-start" },
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
