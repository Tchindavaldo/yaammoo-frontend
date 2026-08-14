import { styles } from "@/src/features/checkout/components/CheckoutSheet.styles";
import { DeliveryOffer, Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface GroupedDeliveryTabProps {
  delivery: Livraison;
  setDelivery: (delivery: Livraison) => void;
  onOpenLocation?: () => void;
  onOpenContact?: () => void;
  onOpenPeriod?: () => void;
  onOpenExpress?: () => void;
  onOpenVoiceNote?: () => void;
  availableHours?: any[];
  deliveryOffer?: DeliveryOffer | null;
}

/**
 * Section livraison du sheet de commande GROUPEE — copie dediee de
 * `DeliveryTab` (checkout), pilotee independamment de celui-ci.
 *
 * Ce qui change par rapport a l'original : le conteneur n'est plus fige a
 * 230 px decoupes en deux `flex: 1`, chaque zone porte sa PROPRE hauteur fixe.
 * Le sheet groupe a sa propre hauteur et un bouton en flux : sans cela la
 * grille « Select Type » venait coller « Valider et payer ».
 */
export const GroupedDeliveryTab: React.FC<GroupedDeliveryTabProps> = ({
  delivery,
  setDelivery,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
  availableHours,
  deliveryOffer,
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
    { backgroundColor: "#f1f5f9", borderColor: "#cbd5e1", borderWidth: 1 },
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
    <View style={[styles.deliveryContainer, localStyles.deliveryContainer]}>
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
                    Note
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Layout Standard : 4 cartes */}
        {deliveryType === "standard" && (
          <View style={[styles.infoGrid4, localStyles.infoGrid4]}>
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
        <View style={[styles.sectionHeader, localStyles.sectionHeader]}>
          <Text style={styles.sectionHeaderText}>Select Type</Text>
        </View>

        <View style={[styles.deliveryTypeGrid, localStyles.deliveryTypeGrid]}>
          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              localStyles.deliveryTypeBtn,
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
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "express" && { color: "#ec4913" },
                ]}
              >
                {deliveryFree && expressPrice
                  ? "Dès que terminée"
                  : `Livré dès que terminée${expressPrice ? ` · ${expressPrice}F` : ""}`}
              </Text>
              {deliveryFree && expressPrice ? (
                <Text
                  style={[
                    styles.deliveryTypeSubText,
                    delivery.type === "express" && { color: "#ec4913" },
                  ]}
                >
                  <Text style={localStyles.freeLabel}>Offert</Text>
                  <Text style={localStyles.strikePrice}>
                    {" "}
                    · {expressPrice}F
                  </Text>
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              localStyles.deliveryTypeBtn,
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
              {deliveryFree && selectedHour && periodPrice ? (
                <>
                  <Text
                    style={[
                      styles.deliveryTypeSubText,
                      delivery.type === "standard" && { color: "#ec4913" },
                    ]}
                    numberOfLines={1}
                  >
                    {[selectedDate, selectedHour].filter(Boolean).join(" ")}
                  </Text>
                  <Text
                    style={[
                      styles.deliveryTypeSubText,
                      delivery.type === "standard" && { color: "#ec4913" },
                    ]}
                  >
                    <Text style={localStyles.freeLabel}>Offert</Text>
                    <Text style={localStyles.strikePrice}>
                      {" "}
                      · {periodPrice}F
                    </Text>
                  </Text>
                </>
              ) : (
                <>
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
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              localStyles.deliveryTypeBtn,
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
    height: 235,
    paddingTop: 0,
    // Neutralise le `flex: 1` herite : le bloc mesure ses deux zones, il ne
    // s'etire pas jusqu'au bouton.
    flex: 0,
    justifyContent: "space-between",

    // DEBUG visuel : conteneur des deux zones (top + bottom). A retirer.
    // backgroundColor: "rgba(0, 0, 255, 0.12)",
  },
  strikePrice: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  freeLabel: {
    color: "#16a34a",
    fontWeight: "600",
  },
  // Les deux zones se calent sur leur contenu : l'espace libre du calque va
  // au-dessus du bloc (le sheet le pousse en bas), pas entre les deux zones.
  topZone: {
    height: 85,
    justifyContent: "flex-start",
    overflow: "hidden",
    // backgroundColor: "rgba(102, 255, 0, 0.12)",
  },
  // Respiration au-dessus de « Select Type », mesuree ici et nulle part ailleurs.
  bottomZone: {
    paddingBottom: 1,
    justifyContent: "flex-end",
    // backgroundColor: "rgba(255, 0, 0, 0.12)",
  },
  // Cards « Select Type » : bordure plus fine/discrete que celle du checkout.
  deliveryTypeBtn: { borderWidth: 1, borderColor: "#e2e8f0" },
  // Titre « Select Type » resserre sur sa grille : l'original reserve 16 px
  // sous le filet, trop dans ce sheet ou la place est comptee.
  sectionHeader: { paddingBottom: 4, marginBottom: 12 },
  // Cards du haut sans marge basse : l'ecart avec « Select Type » est porte
  // par `bottomZone`, une seule fois.
  infoGrid4: { marginBottom: 0 },
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
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 80,
  },
  aucuneText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
});
