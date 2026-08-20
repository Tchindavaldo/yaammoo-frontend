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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GROUPED_SHEET_HEIGHT } from "../CartGroupedDeliverySheet.styles";
import { GroupedValidateRow } from "./GroupedValidateRow";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
/** Hauteur du flou quand le clavier est ouvert : tout l'ecran. */
const SCREEN_HEIGHT = Dimensions.get("window").height;

// Pas de clavier ici : l'overlay peut depasser le sheet pour laisser la liste
// des zones respirer. La card remplit toute cette hauteur, moins le
// `paddingVertical` du conteneur (marge haute et basse).
const SHEET_HEIGHT = GROUPED_SHEET_HEIGHT + 90;

interface ExpressZone {
  lieu: string;
  prix: string;
}

interface GroupedExpressOverlayProps {
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
export const GroupedExpressOverlay: React.FC<GroupedExpressOverlayProps> = ({
  onClose,
  selectedLieu,
  onSelectExpress,
  availableHours,
  deliveryOffer,
  fastFoodId,
  onError,
}) => {
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
          // Reserve la barre de navigation Android : la hauteur de l'overlay ne
          // change pas, seul le contenu est remonte au-dessus de la navbar.
          { paddingBottom: insets.bottom },
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
              <Ionicons name="flash-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Choisir un lieu express</Text>
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

const styles = StyleSheet.create({
  // Repli Android < 12 du voile de fond : blanc opaque.
  blurFallbackOpaque: {
    backgroundColor: "#ffffff",
    // Memes coins que la card posee dessus : sans cela le voile opaque du repli
    // Android < 12 laisse depasser deux angles droits.
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    // Android ordonne les touches par ELEVATION, pas par zIndex (sheet = 20).
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
    height: SHEET_HEIGHT,
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
  scrollContent: {
    // Bornee par la card : la liste scrolle dans la place restante.
    flex: 1,
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
