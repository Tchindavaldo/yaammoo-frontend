import React, { useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { DeliveryOffer } from "@/src/types";
import { DeliveryValidateRow } from "./shared/DeliveryValidateRow";
import { verifyBonusCode } from "../services/verifyBonusCode";

// Hauteur NUE du sheet de commande. A l'ecran il occupe `384 + insets.bottom`
// (voir `CheckoutSheet` / `CartCheckoutSheet`) : l'overlay ajoute donc le meme
// inset, sinon il s'arrete au-dessus du bord bas du sheet.
const SHEET_HEIGHT = 384;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

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

export const CheckoutPeriodOverlay: React.FC<CheckoutPeriodOverlayProps> = ({
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
  const insets = useSafeAreaInsets();
  const sheetHeight = SHEET_HEIGHT + insets.bottom;

  // Fondu d'entree/sortie : le parent monte et demonte l'overlay d'un coup,
  // c'est donc ici qu'on l'amene et qu'on retarde la fermeture le temps de
  // l'animation.
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      // Driver JS : sur Android une opacite pilotee en natif cree un calque de
      // composition qui n'achemine plus les evenements de mouvement aux
      // scrollables enfants (le tap passe, le drag est perdu).
      useNativeDriver: false,
    }).start();
  }, [fade]);

  // Saisie du code bonus : l'overlay remonte avec le clavier, comme sur le
  // parcours groupe. Sans cela la ligne de validation restait cachee dessous.
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
        // Meme driver que l'entree : melanger natif et JS sur la meme
        // `Animated.Value` leve une exception au runtime.
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
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

  // `delivery.hour` est stocké au format "YYYY-MM-DD|HH:mm|lieu" (cf.
  // handleValidate), alors que les valeurs de la liste sont "HH:mm|lieu".
  // On retire donc la date de tête pour retrouver la période déjà choisie,
  // sinon aucune ligne n'apparaît sélectionnée à la réouverture.
  const stripDate = (value: string): string => {
    if (!value) return "";
    const parts = value.split("|");
    return /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts.slice(1).join("|") : value;
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
    ? [selectedPeriodItem.hour, selectedPeriodItem.lieu].filter(Boolean).join(" · ")
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

    // Un code ne s'applique qu'à une livraison précise : sans période choisie,
    // il n'y a rien à offrir → on refuse et l'overlay reste ouvert.
    if (typed && !selectedValue) {
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
      <AnimatedBlurView
        intensity={40}
        tint="light"
        // Voile decoratif : il ne doit capter aucun geste.
        pointerEvents="none"
        // Android < 12 : pas de flou natif -> voile blanc opaque. iOS et
        // Android 12+ gardent le flou, ce style n'y est jamais applique.
        fallbackStyle={styles.blurFallbackOpaque}
        style={[
          styles.blurOverlay,
          {
            // Meme reglage que les overlays Lieu / Contact / Note vocale : le
            // voile grandit avec le clavier. Fige a `sheetHeight`, il laissait
            // la zone liberee a decouvert (fond transparent sur Android < 12).
            height: keyboardHeight.interpolate({
              inputRange: [0, 700],
              outputRange: [sheetHeight, sheetHeight + 1000],
            }),
          },
        ]}
      />
      <Animated.View
        style={[
          styles.container,
          {
            height: sheetHeight,
            // `sheetHeight` COMPREND la safe area : sans ce padding la card
            // descend dessous et se colle a la barre de navigation Android.
            paddingBottom: insets.bottom,
            // On decale `bottom` et NON `transform` : un parent porteur d'un
            // transform anime en JS ne retransmet pas les evenements de
            // mouvement sur Android, ce qui bloquerait le scroll de la liste.
            bottom: keyboardHeight,
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
  // Repli Android < 12 (pas de flou natif) : voile blanc opaque, memes coins
  // que la card posee dessus.
  blurFallbackOpaque: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    // Android ordonne les touches par ELEVATION, pas par zIndex : sans une
    // elevation superieure a celle du sheet, c'est lui qui recoit le geste et
    // son ScrollView le consomme — la liste ne defilait jamais.
    elevation: 30,
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
    // hauteur portee au runtime (safe area comprise), voir `sheetHeight`
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
