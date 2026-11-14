"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { DeliveryOffer, Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../CheckoutSheet.styles";
import { DS } from "@/src/theme/ds";
import { t, dateLocale, useLanguage } from "@/src/i18n";
import { hasExpressZones as hasExpressZonesOf } from "../../utils/expressZones";
import { DeliveryInfoCard } from "./DeliveryInfoCard";

interface DeliveryTabProps {
  delivery: Livraison;
  setDelivery: (delivery: Livraison) => void;
  onOpenLocation?: () => void;
  onOpenContact?: () => void;
  onOpenPeriod?: () => void;
  onOpenExpress?: () => void;
  onOpenVoiceNote?: () => void;
  availableHours?: any[];
  /** Zones EXPRESS de la boutique (`expressZones`) : une liste, sans heure. */
  expressZones?: unknown;
  deliveryOffer?: DeliveryOffer | null;
  /** Retrait boutique autorisé (GET /fastfood/all). `false` = masquer la card
   * « Aucun » (le user ne peut PAS venir prendre la cmd en boutique). */
  pickupAllowed?: boolean;
}

export const DeliveryTab: React.FC<DeliveryTabProps> = ({
  delivery,
  setDelivery,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
  expressZones,
  deliveryOffer,
  pickupAllowed,
}) => {
  useLanguage();
  const isLocationFilled = !!(delivery.address || delivery.note);
  const isPeriodFilled = !!delivery.hour;
  const isContactFilled = !!delivery.phone;
  const isVoiceNoteFilled = !!delivery.voiceNoteUri;
  const isExpressFilled = !!delivery.expressLieu;

  // La boutique livre-t-elle en express quelque part ? (liste `expressZones`,
  // sans heure). Si non, on masque la card Express.
  const hasExpressZones = hasExpressZonesOf(expressZones);

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
  // Groupage (un départ déjà payé couvre la course) : même affichage « Offert ».
  const deliveryFree = !!deliveryOffer?.active || delivery.grouping === "grouped";
  const groupingChecking = delivery.grouping === "checking";

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
      date = d.toLocaleDateString(dateLocale(), {
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
        { height: 230 },
      ]}
    >
      {/* Zone haute (cartes infos) */}
      <View style={localStyles.topZone}>
        {/* Layout Express : cartes sur une ligne. Zone : seulement si des
            zones express existent ; loader pendant la vérification du groupage. */}
        {deliveryType === "express" && (
          <View style={localStyles.expressRow}>
            <View style={localStyles.expressCardsCol}>
              <DeliveryInfoCard icon="location-outline" title={t("Lieux")} filled={isLocationFilled} onPress={onOpenLocation} style={{ flex: 1 }} />
              {hasExpressZones && (
                <DeliveryInfoCard icon="flash-outline" title={t("Zone")} filled={isExpressFilled} onPress={onOpenExpress} loading={groupingChecking} style={{ flex: 1 }} />
              )}
              <DeliveryInfoCard icon="call-outline" title={t("Contact")} filled={isContactFilled} onPress={onOpenContact} style={{ flex: 1 }} />
              <DeliveryInfoCard icon="mic-outline" title={t("vocale")} filled={isVoiceNoteFilled} onPress={onOpenVoiceNote} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Layout Standard : 4 cartes */}
        {deliveryType === "standard" && (
          <View style={styles.infoGrid4}>
            <DeliveryInfoCard icon="location-outline" title={t("Lieux")} filled={isLocationFilled} onPress={onOpenLocation} />
            <DeliveryInfoCard icon="time-outline" title={t("Période")} filled={isPeriodFilled} onPress={onOpenPeriod} loading={groupingChecking} />
            <DeliveryInfoCard icon="call-outline" title={t("Contact")} filled={isContactFilled} onPress={onOpenContact} />
            <DeliveryInfoCard icon="mic-outline" title={t("Vocale")} filled={isVoiceNoteFilled} onPress={onOpenVoiceNote} />
          </View>
        )}

        {deliveryType === "aucune" && (
          <View style={localStyles.aucuneBanner}>
            <Ionicons name="storefront-outline" size={20} color="#64748b" />
            <Text style={localStyles.aucuneText}>
              {t("Vous passerez en boutique récupérer votre commande")}
            </Text>
          </View>
        )}
      </View>

      {/* Zone basse (sélection du type) — prix dynamique depuis la période */}
      <View style={localStyles.bottomZone}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{t("Type de livraison")}</Text>
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
              color={delivery.type === "express" ? DS.accent : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                Express
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "express" && { color: DS.accent },
                ]}
              >
                {deliveryFree && expressPrice
                  ? t("Dès que terminée")
                  : t("Livré dès que terminée{{a}}", { a: expressPrice ? ` · ${expressPrice}F` : "" })}
              </Text>
              {deliveryFree && expressPrice ? (
                <Text
                  style={[
                    styles.deliveryTypeSubText,
                    delivery.type === "express" && { color: DS.accent },
                  ]}
                >
                  <Text style={localStyles.freeLabel}>{t("Offert")}</Text>
                  <Text style={localStyles.strikePrice}> · {expressPrice}F</Text>
                </Text>
              ) : null}
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
              color={delivery.type === "standard" ? DS.accent : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                {t("Heure")}
              </Text>
              {deliveryFree && selectedHour && periodPrice ? (
                <>
                  <Text
                    style={[
                      styles.deliveryTypeSubText,
                      delivery.type === "standard" && { color: DS.accent },
                    ]}
                    numberOfLines={1}
                  >
                    {[selectedDate, selectedHour].filter(Boolean).join(" ")}
                  </Text>
                  <Text
                    style={[
                      styles.deliveryTypeSubText,
                      delivery.type === "standard" && { color: DS.accent },
                    ]}
                  >
                    <Text style={localStyles.freeLabel}>{t("Offert")}</Text>
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
                        delivery.type === "standard" && { color: DS.accent },
                      ]}
                    >
                      {selectedDate}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.deliveryTypeSubText,
                      delivery.type === "standard" && { color: DS.accent },
                    ]}
                  >
                    {selectedHour
                      ? `${selectedHour}${periodPrice ? ` · ${periodPrice}F` : ""}`
                      : t("Choisir un créneau de livraison")}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Card « Aucun » = retrait en boutique. Quand le marchand a désactivé
            le pickup (pickupAllowed === false), elle reste affichée, NON grisée,
            juste non cliquable, avec le sous-texte qui l'explique. */}
          <TouchableOpacity
            style={[
              styles.deliveryTypeBtn,
              delivery.type === "aucune" && styles.deliveryTypeActive,
            ]}
            disabled={pickupAllowed === false}
            onPress={() =>
              setDelivery({ ...delivery, statut: false, type: "aucune" })
            }
          >
            <Ionicons
              name="remove-circle-outline"
              size={22}
              color={delivery.type === "aucune" ? DS.accent : "#94a3b8"}
            />
            <View style={styles.deliveryTypeText}>
              <Text style={[styles.deliveryTypeTitle, styles.textDark]}>
                {t("Aucun")}
              </Text>
              <Text
                style={[
                  styles.deliveryTypeSubText,
                  delivery.type === "aucune" && { color: DS.accent },
                ]}
              >
                {pickupAllowed === false
                  ? t("Retrait boutique indisponible")
                  : t("Sans urgence")}
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
  freeLabel: {
    color: "#16a34a",
    fontWeight: "600",
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
    backgroundColor: DS.slate100,
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
