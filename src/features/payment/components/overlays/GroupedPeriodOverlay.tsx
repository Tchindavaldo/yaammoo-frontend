import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { verifyBonusCode } from "@/src/features/checkout/services/verifyBonusCode";
import { DeliveryOffer } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GROUPED_SHEET_HEIGHT } from "../CartGroupedDeliverySheet.styles";
import { GroupedValidateRow } from "./GroupedValidateRow";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
/** Hauteur du flou quand le clavier est ouvert : tout l'ecran. */
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Pas de clavier ici : l'overlay peut depasser le sheet pour laisser la liste
// des creneaux respirer. La card remplit toute cette hauteur, moins le
// `paddingVertical` du conteneur (marge haute et basse).
const SHEET_BASE_HEIGHT = GROUPED_SHEET_HEIGHT + 90;

interface PeriodItem {
  hour: string;
  lieu: string;
  prix: string;
}

interface GroupedPeriodOverlayProps {
  onClose: () => void;
  selectedPeriod: string;
  onSelectPeriod: (
    period: string,
    prix?: number,
    bonusCode?: string | null,
  ) => void;
  availableHours?: any[];
  orderLeadTime?: number;
  advanceDays?: number;
  deliveryOffer?: DeliveryOffer | null;
  /** Boutique visée — transmise à `POST /bonus/verify`. */
  fastFoodId?: string | null;
  /** Toast d'erreur du sheet parent (code bonus refusé). */
  onError?: (message: string) => void;
}

export const GroupedPeriodOverlay: React.FC<GroupedPeriodOverlayProps> = ({
  onClose,
  selectedPeriod,
  onSelectPeriod,
  availableHours,
  orderLeadTime = 0,
  advanceDays,
  deliveryOffer,
  fastFoodId,
  onError,
}) => {
  // Fondu d'entree/sortie : le parent monte et demonte l'overlay d'un coup,
  // c'est donc ici qu'on l'amene et qu'on retarde la fermeture le temps de
  // l'animation.
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  // Saisie du code bonus : l'overlay suit le clavier (meme reglage que Contact).
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        Animated.spring(keyboardHeight, {
          toValue: event.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // keyboardHeight est une Animated.Value stable (useRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeWithFade = React.useCallback(
    (after?: () => void) => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        after?.();
        onClose();
      });
    },
    [fade, onClose],
  );

  const maxDays = advanceDays && advanceDays > 0 ? advanceDays : 7;

  // Construire les dates disponibles
  const dateOptions: { label: string; value: string }[] = [];
  for (let i = 0; i <= maxDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dateOptions.push({
      label: d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
      }),
      value: d.toISOString().split("T")[0],
    });
  }

  const [selectedDate, setSelectedDate] = useState<string>(
    dateOptions[0]?.value || "",
  );

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
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const validPeriods = isToday
    ? periods.filter((p) => isHourValid(p.hour))
    : periods;

  // `delivery.hour` est stocké au format "YYYY-MM-DD|HH:mm|lieu" (cf.
  // handleValidate), alors que les valeurs de la liste sont "HH:mm|lieu".
  // On retire donc la date de tête pour retrouver la période déjà choisie,
  // sinon aucune ligne n'apparaît sélectionnée à la réouverture.
  const stripDate = (value: string): string => {
    if (!value) return "";
    const parts = value.split("|");
    return /^\d{4}-\d{2}-\d{2}$/.test(parts[0])
      ? parts.slice(1).join("|")
      : value;
  };

  const [selectedValue, setSelectedValue] = useState<string>(
    stripDate(selectedPeriod || ""),
  );
  const [bonusCode, setBonusCode] = useState("");
  const [codeInputOpen, setCodeInputOpen] = useState(false);

  // Période sélectionnée (pour l'affichage de la ligne de validation)
  const selectedPeriodItem = validPeriods.find((p) => {
    const v = p.lieu ? `${p.hour}|${p.lieu}` : p.hour;
    return v === selectedValue;
  });
  const selectedLabel = selectedPeriodItem
    ? [selectedPeriodItem.hour, selectedPeriodItem.lieu]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Code validé par le serveur (`POST /bonus/verify`). Seule cette réponse fait
  // foi : on ne compare plus le code localement au bonusCode de l'offre.
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const bonusApplied = !!verifiedCode;

  // Livraison offerte → on barre les prix de la liste des périodes.
  const isFree = !!deliveryOffer?.active || bonusApplied;

  const validateAndClose = (code: string | null) => {
    const value = selectedValue
      ? `${selectedDate}|${selectedValue}`
      : selectedDate;
    const parsed = selectedPeriodItem?.prix
      ? parseInt(String(selectedPeriodItem.prix), 10)
      : NaN;
    closeWithFade(() =>
      onSelectPeriod(value, Number.isNaN(parsed) ? undefined : parsed, code),
    );
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

    // Aucun creneau choisi : valider n'a rien a enregistrer. L'overlay se
    // fermait quand meme et la card apparaissait remplie alors que la livraison
    // n'avait ni heure ni prix — « Continuer » passait ensuite sans rien voir.
    if (!selectedValue) {
      onError?.("Sélectionnez d'abord une période de livraison.");
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
    <Animated.View style={[styles.keyboardWrapper, { opacity: fade }]}>
      {/* Saisie du code bonus : le flou monte jusqu'en haut de l'ecran des que
          le clavier s'ouvre, comme sur les overlays Lieu et Contact. */}
      <AnimatedBlurView
        intensity={40}
        tint="light"
        style={[
          styles.blurOverlay,
          {
            height: keyboardHeight.interpolate({
              inputRange: [0, 200],
              outputRange: [SHEET_BASE_HEIGHT, SCREEN_HEIGHT],
              extrapolate: "clamp",
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                // Clavier ouvert : la card remonte pour ne pas coller au clavier.
                translateY: keyboardHeight.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -98],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="time-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Choisir une période</Text>
            </View>
            <TouchableOpacity
              onPress={() => closeWithFade()}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Chips dates horizontales */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateStrip}
            contentContainerStyle={styles.dateStripInner}
          >
            {dateOptions.map((opt) => {
              const isSel = selectedDate === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dateChip, isSel && styles.dateChipActive]}
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
            style={styles.slotList}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {validPeriods.map((item, idx) => {
              const value = item.lieu ? `${item.hour}|${item.lieu}` : item.hour;
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
                      {dateOptions.find((d) => d.value === selectedDate)
                        ?.label || ""}
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

          <GroupedValidateRow
            hasSelection={!!selectedValue}
            selectedLabel={selectedLabel}
            selectedPrice={selectedPeriodItem?.prix}
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
      </Animated.View>
    </Animated.View>
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
    height: SHEET_BASE_HEIGHT,
    // Aucune gouttiere : la card occupe TOUTE la surface de l'overlay.
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center",
  },
  card: {
    // La card remplit le conteneur, qui porte la hauteur de l'overlay.
    flex: 1,
    backgroundColor: "white",
    // Card collee aux bords du sheet : seuls les coins hauts sont arrondis.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  // Liste des creneaux : prend la place restante de la card, sous la bande de
  // chips et au-dessus de la ligne de validation.
  slotList: {
    flex: 1,
  },
  // Bande de chips horizontale : sans hauteur propre elle s'etire dans la card
  // et ecrase les chips. `flexGrow: 0` la fige sur son contenu.
  dateStrip: {
    flexGrow: 0,
    marginBottom: 10,
  },
  dateStripInner: {
    gap: 8,
    alignItems: "center",
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
