"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { verifyBonusCode } from "@/src/features/checkout/services/verifyBonusCode";
import { expressZonesOf } from "@/src/features/checkout/utils/expressZones";
import { DeliveryOffer } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Safe-area basse : source unique (R19), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { SHEET_HEIGHT, styles } from "./GroupedExpressOverlay.styles";
import { GroupedValidateRow } from "./GroupedValidateRow";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
/** Hauteur du flou quand le clavier est ouvert : tout l'ecran. */
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Pas de clavier ici : l'overlay peut depasser le sheet pour laisser la liste
// des zones respirer. La card remplit toute cette hauteur, moins le
// `paddingVertical` du conteneur (marge haute et basse).


interface GroupedExpressOverlayProps {
  onClose: () => void;
  selectedLieu: string;
  onSelectExpress: (
    lieu: string,
    prix?: number,
    bonusCode?: string | null,
  ) => void;
  /** Zones EXPRESS de la boutique (`expressZones`) : une liste, sans heure. */
  expressZones?: unknown;
  deliveryOffer?: DeliveryOffer | null;
  /** Groupage : ce départ est déjà payé (course « Groupée avec ta commande »). */
  isGroupedSlot?: (probe: { zone: string; type: "time" | "express"; date: string; time?: string }) => boolean;
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
 * Les zones proviennent de `expressZones` (boutique, un prix par lieu, sans
 * heure — backend migration 073). Si aucune zone express n'existe, la liste est
 * vide — le parent masque la card dans ce cas.
 */
export const GroupedExpressOverlay: React.FC<GroupedExpressOverlayProps> = ({
  onClose,
  selectedLieu,
  onSelectExpress,
  expressZones,
  deliveryOffer,
  isGroupedSlot,
  fastFoodId,
  onError,
}) => {
  useLanguage();
  const insets = useSafeAreaInsets();
  // Fondu d'entree/sortie : le parent monte et demonte l'overlay d'un coup,
  // c'est donc ici qu'on l'amene et qu'on retarde la fermeture le temps de
  // l'animation. `closeWithFade` remplace `onClose` sur tous les chemins de
  // sortie (croix, validation).
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

  // Un lieu = un prix, celui que le backend facture (`zoneDeliveryPrice`).
  const zones = expressZonesOf(expressZones);

  const [selectedValue, setSelectedValue] = useState<string>(
    selectedLieu || "",
  );
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
    closeWithFade(() =>
      onSelectExpress(
        selectedValue,
        Number.isNaN(parsed) ? undefined : parsed,
        code,
      ),
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

    // Aucune zone choisie : valider n'a rien a enregistrer. L'overlay se
    // fermait quand meme et la card apparaissait remplie alors que la livraison
    // n'avait ni lieu ni prix — « Continuer » passait ensuite sans rien voir.
    if (!selectedValue) {
      onError?.(t("Sélectionnez d'abord une zone de livraison."));
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
      onError?.(result.message || t("Code bonus invalide."));
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
        // Voile decoratif : il ne doit capter aucun geste.
        pointerEvents="none"
        // Android < 12 : pas de flou natif -> voile blanc opaque. iOS et
        // Android 12+ gardent le flou, ce style n'y est jamais applique.
        fallbackStyle={styles.blurFallbackOpaque}
        style={[
          styles.blurOverlay,
          {
            height: keyboardHeight.interpolate({
              inputRange: [0, 200],
              outputRange: [SHEET_HEIGHT, SCREEN_HEIGHT],
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
        <SafeAreaDebugBand />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="flash-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>{t("Choisir un lieu express")}</Text>
            </View>
            <TouchableOpacity
              onPress={() => closeWithFade()}
              style={styles.closeBtn}
            >
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
                {t("Aucune zone express disponible")}
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
                          isSelected && { color: DS.accent },
                        ]}
                      >
                        {item.lieu}
                      </Text>
                    </View>
                    {item.prix ? (
                      isGroupedSlot?.({ zone: item.lieu || "", type: "express", date: new Date().toISOString().split("T")[0] }) ? (
                        <Text style={styles.freePrix}>{t("Groupée avec ta commande")}</Text>
                      ) : isFree ? (
                        <View style={styles.pricePair}>
                          <Text style={styles.strikePrix}>{item.prix} F</Text>
                          <Text style={styles.freePrix}>{t("Offert")}</Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.periodPrix,
                            isSelected && { color: DS.accent },
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

          <GroupedValidateRow
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
      </Animated.View>
    </Animated.View>
  );
};
