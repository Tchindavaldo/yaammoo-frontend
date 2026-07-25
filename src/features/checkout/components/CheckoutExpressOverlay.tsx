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
import { verifyBonusCode } from "../services/verifyBonusCode";

const SHEET_HEIGHT = 384;

interface ExpressZone {
  lieu: string;
  prix: string;
}

interface CheckoutExpressOverlayProps {
  onClose: () => void;
  selectedLieu: string;
  onSelectExpress: (
    lieu: string,
    prix?: number,
    bonusCode?: string | null,
  ) => void;
  availableHours?: any[];
  deliveryOffer?: DeliveryOffer | null;
  /** Boutique visée — transmise à `POST /bonus/verify`. */
  fastFoodId?: string | null;
  /** Toast d'erreur du sheet parent (code bonus refusé). */
  onError?: (message: string) => void;
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
  deliveryOffer,
  fastFoodId,
  onError,
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
  const [bonusCode, setBonusCode] = useState("");
  const [codeInputOpen, setCodeInputOpen] = useState(false);

  const selectedZone = zones.find((z) => z.lieu === selectedValue);

  // Code validé par le serveur (`POST /bonus/verify`). Seule cette réponse fait
  // foi : on ne compare plus le code localement au bonusCode de l'offre.
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const bonusApplied = !!verifiedCode;

  // Livraison offerte → on barre les prix de la liste des zones.
  const isFree = !!deliveryOffer?.active || bonusApplied;

  const validateAndClose = (code: string | null) => {
    const parsed = selectedZone?.prix
      ? parseInt(String(selectedZone.prix), 10)
      : NaN;
    onSelectExpress(
      selectedValue,
      Number.isNaN(parsed) ? undefined : parsed,
      code,
    );
    onClose();
  };

  // Modifier le code annule la vérification précédente : sinon un code validé
  // puis édité laisserait la livraison affichée comme offerte à tort.
  const handleChangeBonusCode = (code: string) => {
    setBonusCode(code);
    if (verifiedCode) setVerifiedCode(null);
  };

  const handleValidate = async () => {
    if (verifying) return;
    const typed = bonusCode.trim();

    // Un code ne s'applique qu'à une livraison précise : sans zone choisie,
    // il n'y a rien à offrir → on refuse et l'overlay reste ouvert.
    if (typed && !selectedValue) {
      onError?.("Sélectionnez d'abord une zone de livraison.");
      return;
    }

    // Aucun code saisi → validation directe. Une offre active sans saisie
    // n'envoie rien : c'est au backend de la redériver.
    if (!typed) {
      validateAndClose(null);
      return;
    }

    // Code déjà vérifié et inchangé → pas de second appel réseau.
    if (verifiedCode && verifiedCode.toUpperCase() === typed.toUpperCase()) {
      validateAndClose(verifiedCode);
      return;
    }

    setVerifying(true);
    const result = await verifyBonusCode(typed, fastFoodId);
    setVerifying(false);

    // Code refusé → toast d'erreur, l'overlay RESTE ouvert pour ressaisie.
    if (!result.valid) {
      setVerifiedCode(null);
      onError?.(result.message || "Code bonus invalide.");
      return;
    }

    setVerifiedCode(typed);
    validateAndClose(typed);
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
              })
            )}
          </ScrollView>

          <DeliveryValidateRow
            hasSelection={!!selectedValue}
            selectedLabel={selectedZone?.lieu}
            selectedPrice={selectedZone?.prix}
            deliveryOffer={deliveryOffer}
            bonusCode={bonusCode}
            onChangeBonusCode={handleChangeBonusCode}
            codeInputOpen={codeInputOpen}
            onToggleCodeInput={() => setCodeInputOpen((v) => !v)}
            onValidate={handleValidate}
            bonusApplied={bonusApplied}
            verifying={verifying}
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
