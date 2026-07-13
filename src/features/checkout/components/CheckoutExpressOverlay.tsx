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

const SHEET_HEIGHT = 384;

interface ExpressZone {
  lieu: string;
  prix: string;
}

interface CheckoutExpressOverlayProps {
  onClose: () => void;
  selectedLieu: string;
  onSelectExpress: (lieu: string, prix?: number) => void;
  availableHours?: any[];
}

/**
 * Overlay de sélection du lieu de livraison EXPRESS.
 * Contrairement à la période (créneau horaire), l'express est immédiat :
 * pas de dates ni d'heures, seulement le choix d'une zone (lieu + prix).
 *
 * Les zones proviennent des `expressZones` de chaque entrée `deliveryHours`,
 * dédupliquées par lieu. Si aucune zone express n'existe (ancien format
 * backend / app), la liste est vide — le parent masque la card dans ce cas.
 */
export const CheckoutExpressOverlay: React.FC<CheckoutExpressOverlayProps> = ({
  onClose,
  selectedLieu,
  onSelectExpress,
  availableHours,
}) => {
  const buildZones = (): ExpressZone[] => {
    if (!availableHours || availableHours.length === 0) return [];
    // Ancien format (string[]) → pas de zones express possibles.
    if (typeof availableHours[0] === "string") return [];

    const seen = new Set<string>();
    const zones: ExpressZone[] = [];
    availableHours.forEach((entry: any) => {
      if (entry.express && entry.expressZones?.length > 0) {
        entry.expressZones.forEach((z: any) => {
          const lieu = z.lieu || "";
          if (!lieu || seen.has(lieu)) return;
          seen.add(lieu);
          zones.push({ lieu, prix: z.prix || "" });
        });
      }
    });
    return zones;
  };

  const zones = buildZones();

  const [selectedValue, setSelectedValue] = useState<string>(selectedLieu || "");

  const handleValidate = () => {
    const selected = zones.find((z) => z.lieu === selectedValue);
    const parsed = selected?.prix
      ? parseInt(String(selected.prix), 10)
      : NaN;
    onSelectExpress(selectedValue, Number.isNaN(parsed) ? undefined : parsed);
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
              <Ionicons name="flash-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Choisir un lieu express</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {zones.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucune zone express disponible
              </Text>
            ) : (
              zones.map((item, idx) => {
                const isSelected = selectedValue === item.lieu;
                return (
                  <TouchableOpacity
                    key={`${item.lieu}-${idx}`}
                    style={[
                      styles.periodRow,
                      isSelected && styles.periodRowActive,
                    ]}
                    onPress={() => setSelectedValue(item.lieu)}
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
                      <Text
                        style={[
                          styles.periodLieu,
                          isSelected && { color: "#ec4913" },
                        ]}
                      >
                        {item.lieu}
                      </Text>
                    </View>
                    {item.prix ? (
                      <Text
                        style={[
                          styles.periodPrix,
                          isSelected && { color: "#ec4913" },
                        ]}
                      >
                        {item.prix} F
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={styles.checkBtn} onPress={handleValidate}>
            <Text style={styles.checkBtnText}>VALIDER</Text>
          </TouchableOpacity>
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
  scrollContent: {
    height: 240,
  },
  scrollInner: {
    paddingBottom: 4,
    gap: 2,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 24,
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
  periodLieu: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0f172a",
    marginLeft: 10,
  },
  periodPrix: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  checkBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#ec4913",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ec4913",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  checkBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
