import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { DeliveryOffer } from "@/src/types";
import { DeliveryValidateRow } from "./shared/DeliveryValidateRow";

const SHEET_HEIGHT = 384;

interface PeriodItem {
  hour: string;
  lieu: string;
  prix: string;
}

interface CheckoutPeriodOverlayProps {
  onClose: () => void;
  selectedPeriod: string;
  onSelectPeriod: (
    period: string,
    prix?: number,
    bonus?: { type: string; code: string } | null,
  ) => void;
  availableHours?: any[];
  orderLeadTime?: number;
  advanceDays?: number;
  deliveryOffer?: DeliveryOffer | null;
}

export const CheckoutPeriodOverlay: React.FC<CheckoutPeriodOverlayProps> = ({
  onClose,
  selectedPeriod,
  onSelectPeriod,
  availableHours,
  orderLeadTime = 0,
  advanceDays,
  deliveryOffer,
}) => {
  const maxDays = advanceDays && advanceDays > 0 ? advanceDays : 7;

  // Construire les dates disponibles
  const dateOptions: { label: string; value: string }[] = [];
  for (let i = 0; i <= maxDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push({
      label: d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }),
      value: d.toISOString().split("T")[0],
    });
  }

  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0]?.value || "");

  // Construire les périodes
  const buildPeriods = (): PeriodItem[] => {
    if (!availableHours || availableHours.length === 0) {
      return ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"].map(
        (h) => ({ hour: h, lieu: "", prix: "" }),
      );
    }

    if (typeof availableHours[0] === "string") {
      return availableHours.map((h: string) => ({
        hour: h,
        lieu: "",
        prix: "",
      }));
    }

    const periods: PeriodItem[] = [];
    availableHours.forEach((entry: any) => {
      const hour = entry.hour;
      if (!hour) return;

      if (entry.periodic && entry.periodicZones?.length > 0) {
        entry.periodicZones.forEach((z: any) => {
          periods.push({ hour, lieu: z.lieu || "", prix: z.prix || "" });
        });
      } else if (entry.express && entry.expressZones?.length > 0) {
        entry.expressZones.forEach((z: any) => {
          periods.push({ hour, lieu: z.lieu || "", prix: z.prix || "" });
        });
      } else {
        periods.push({ hour, lieu: "", prix: "" });
      }
    });
    return periods;
  };

  const periods = buildPeriods();

  const isHourValid = (hour: string): boolean => {
    if (orderLeadTime <= 0) return true;
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const [hs, ms] = hour.split(":");
    const hTotal = parseInt(hs, 10) * 60 + parseInt(ms, 10);
    return currentTotalMinutes < hTotal - orderLeadTime;
  };

  // Pour aujourd'hui, on filtre les heures passées. Pour les autres jours, toutes sont valides.
  const isToday =
    selectedDate === new Date().toISOString().split("T")[0];
  const validPeriods = isToday
    ? periods.filter((p) => isHourValid(p.hour))
    : periods;

  const [selectedValue, setSelectedValue] = useState<string>(
    selectedPeriod || "",
  );
  const [bonusCode, setBonusCode] = useState("");
  const [codeInputOpen, setCodeInputOpen] = useState(false);

  // Période sélectionnée (pour l'affichage de la ligne de validation)
  const selectedPeriodItem = validPeriods.find((p) => {
    const v = p.lieu ? `${p.hour}|${p.lieu}` : p.hour;
    return v === selectedValue;
  });
  const selectedLabel = selectedPeriodItem
    ? [selectedPeriodItem.hour, selectedPeriodItem.lieu].filter(Boolean).join(" · ")
    : "";

  const bonusApplied =
    !!bonusCode &&
    !!deliveryOffer?.bonusCode &&
    bonusCode.trim().toUpperCase() === deliveryOffer.bonusCode.toUpperCase();

  // Livraison offerte → on barre les prix de la liste des périodes.
  const isFree = !!deliveryOffer?.active || bonusApplied;

  const handleValidate = () => {
    const value = selectedValue
      ? `${selectedDate}|${selectedValue}`
      : selectedDate;
    const parsed = selectedPeriodItem?.prix
      ? parseInt(String(selectedPeriodItem.prix), 10)
      : NaN;
    let bonus: { type: string; code: string } | null = null;
    if (deliveryOffer?.active) {
      bonus = {
        type: deliveryOffer.reason,
        code: deliveryOffer.bonusCode || "",
      };
    } else if (bonusApplied && deliveryOffer) {
      bonus = { type: deliveryOffer.reason, code: bonusCode.trim() };
    }
    onSelectPeriod(value, Number.isNaN(parsed) ? undefined : parsed, bonus);
    onClose();
  };

  return (
    <View style={styles.keyboardWrapper}>
      <BlurView
        intensity={40}
        tint="light"
        style={[styles.blurOverlay, { height: SHEET_HEIGHT }]}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="time-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Choisir une période</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Chips dates horizontales */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {dateOptions.map((opt) => {
              const isSel = selectedDate === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dateChip,
                    isSel && styles.dateChipActive,
                  ]}
                  onPress={() => setSelectedDate(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      isSel && styles.dateChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Liste des périodes */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {validPeriods.map((item, idx) => {
              const value = item.lieu
                ? `${item.hour}|${item.lieu}`
                : item.hour;
              const isSelected = selectedValue === value;
              return (
                <TouchableOpacity
                  key={`${item.hour}-${item.lieu}-${idx}`}
                  style={[
                    styles.periodRow,
                    isSelected && styles.periodRowActive,
                  ]}
                  onPress={() => setSelectedValue(value)}
                  activeOpacity={0.6}
                >
                  <View style={styles.periodLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxActive,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                    <Text style={styles.periodDate}>
                      {dateOptions.find((d) => d.value === selectedDate)?.label || ""}
                    </Text>
                    <Text
                      style={[
                        styles.periodHour,
                        isSelected && { color: "#ec4913" },
                      ]}
                    >
                      {item.hour}
                    </Text>
                    {item.lieu ? (
                      <Text style={styles.periodLieu}>{item.lieu}</Text>
                    ) : null}
                  </View>
                  {item.prix ? (
                    isFree ? (
                      <View style={styles.pricePair}>
                        <Text style={styles.strikePrix}>{item.prix} F</Text>
                        <Text style={styles.freePrix}>Offert</Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.periodPrix,
                          isSelected && { color: "#ec4913" },
                        ]}
                      >
                        {item.prix} F
                      </Text>
                    )
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <DeliveryValidateRow
            hasSelection={!!selectedValue}
            selectedLabel={selectedLabel}
            selectedPrice={selectedPeriodItem?.prix}
            deliveryOffer={deliveryOffer}
            bonusCode={bonusCode}
            onChangeBonusCode={setBonusCode}
            codeInputOpen={codeInputOpen}
            onToggleCodeInput={() => setCodeInputOpen((v) => !v)}
            onValidate={handleValidate}
            bonusApplied={bonusApplied}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  blurOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateChipActive: {
    backgroundColor: "#ec4913",
    borderColor: "#ec4913",
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  dateChipTextActive: {
    color: "white",
  },
  scrollContent: {
    height: 190,
  },
  scrollInner: {
    paddingBottom: 4,
    gap: 2,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
  },
  periodRowActive: {
    backgroundColor: "transparent",
  },
  periodLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#ec4913",
    borderColor: "#ec4913",
  },
  periodDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ec4913",
    marginLeft: 10,
    marginRight: 6,
  },
  periodHour: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    marginRight: 4,
  },
  periodLieu: {
    fontSize: 13,
    color: "#64748b",
  },
  periodPrix: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  pricePair: {
    alignItems: "flex-end",
  },
  strikePrix: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  freePrix: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ec4913",
  },
});
