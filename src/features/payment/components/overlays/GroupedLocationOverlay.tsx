import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Loader } from "@/src/components/Loader";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import React from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GROUPED_SHEET_HEIGHT } from "../CartGroupedDeliverySheet.styles";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
/** Hauteur du flou quand le clavier est ouvert : tout l'ecran. */
const SCREEN_HEIGHT = Dimensions.get("window").height;

// L'overlay depasse le sheet groupe pour laisser respirer l'adresse et la note.
// Sa card occupe toute cette surface (aucune gouttiere sur le conteneur).
const SHEET_BASE_HEIGHT = GROUPED_SHEET_HEIGHT + 90;

interface GroupedLocationOverlayProps {
  onClose: () => void;
  address: string;
  note: string;
  onSave?: (address: string, note: string) => void;
  /**
   * Note vocale enregistree SUR PLACE, depuis le bouton micro pose a gauche de
   * la validation. Plus d'overlay dedie : la card du lieu porte toute la
   * manipulation, l'adresse saisie n'est donc jamais perdue.
   */
  onVoiceNoteChange?: (uri: string | null) => void;
  /** Une note est deja enregistree : le bouton micro le signale. */
  hasVoiceNote?: boolean;
}

export const GroupedLocationOverlay: React.FC<GroupedLocationOverlayProps> = ({
  onClose,
  address,
  note,
  onSave,
  onVoiceNoteChange,
  hasVoiceNote,
}) => {
  const insets = useSafeAreaInsets();
  /**
   * Enregistrement EN PLACE de la note vocale. Un appui demarre, le suivant
   * arrete et remonte l'URI ; un appui long sur une note existante l'efface.
   */
  const [recording, setRecording] = React.useState<Audio.Recording | null>(
    null,
  );

  const toggleRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        onVoiceNoteChange?.(recording.getURI());
      } catch (err) {
        console.error("Failed to stop recording", err);
      } finally {
        setRecording(null);
      }
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const [localAddress, setLocalAddress] = React.useState(address);
  const [localNote, setLocalNote] = React.useState(note);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: event.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
    // keyboardHeight est une Animated.Value stable (useRef).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pas d'auto-refresh GPS à l'ouverture : si une position est déjà enregistrée
  // (coordonnées de la commande), on la réutilise telle quelle. Relancer le GPS
  // ici écrasait le lieu choisi par la position courante du user. Le bouton
  // « position actuelle » reste disponible pour un rafraîchissement volontaire.

  // Fondu d'entree/sortie : le parent monte et demonte l'overlay d'un coup.
  const fade = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  const handleClose = () => {
    Keyboard.dismiss();
    // Deux drivers differents (layout pour le clavier, natif pour l'opacite) :
    // on les lance cote a cote, la fermeture suit le fondu.
    Animated.spring(keyboardHeight, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
    Animated.timing(fade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleGetLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        setIsLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const coords = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      setLocalAddress(coords);
    } catch {
      alert(
        "Error fetching location or timeout. Using last known if available.",
      );
      // Try a less accurate but faster fix as fallback
      try {
        const last = await Location.getLastKnownPositionAsync({});
        if (last) {
          const coords = `${last.coords.latitude.toFixed(6)}, ${last.coords.longitude.toFixed(6)}`;
          setLocalAddress(coords);
        }
      } catch {}
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    if (!localAddress.trim()) {
      setValidationError("Envoyez votre GPS ou saisissez une adresse");
      return;
    }
    if (!localNote.trim()) {
      setValidationError("Ajoutez une note (ex: Porte bleue, 2ème étage)");
      return;
    }
    setValidationError(null);
    setIsSaving(true);
    if (onSave) onSave(localAddress, localNote);
    setTimeout(() => {
      handleClose();
    }, 400);
  };

  return (
    <Animated.View style={[styles.keyboardWrapper, { opacity: fade }]}>
      {/* Au repos le flou se limite au sheet ; il grandit AVEC le clavier (meme
          interpolation continue que les overlays du checkout) jusqu'a couvrir
          tout l'ecran. */}
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
            // Des les premiers pixels de course du clavier, le flou monte
            // jusqu'en haut de l'ecran (il ne s'arrete plus a mi-hauteur).
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
          // Reserve la barre de navigation Android : la hauteur de l'overlay ne
          // change pas, seul le contenu est remonte au-dessus de la navbar.
          { paddingBottom: insets.bottom },
          {
            transform: [
              {
                // Clavier ouvert : la card remonte pour ne pas coller au clavier.
                translateY: keyboardHeight.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -95],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="location-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Delivery Address</Text>
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                style={styles.keyboardSmallBtn}
              >
                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>
                {localAddress || "(Send Live GPS Location)"}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Note (ex: Porte bleue, 2ème étage...)"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                value={localNote}
                onChangeText={setLocalNote}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />

              {isLocating && (
                <BlurView
                  intensity={30}
                  tint="light"
                  style={styles.locatingOverlay}
                  fallbackStyle={styles.blurFallbackLight}
                >
                  <Loader size={40} color="#ec4913" />
                  <Text style={styles.locatingText}>
                    Récupération de votre position actuelle...
                  </Text>
                </BlurView>
              )}
            </View>

            {validationError && (
              <Text
                style={{
                  color: "#ef4444",
                  fontSize: 12,
                  marginBottom: 6,
                  paddingHorizontal: 4,
                }}
              >
                {validationError}
              </Text>
            )}

            <TouchableOpacity style={styles.gpsBtn} onPress={handleGetLocation}>
              <Ionicons name="locate-outline" size={18} color="#334155" />
              <Text style={styles.gpsBtnText}>Send Live GPS</Text>
            </TouchableOpacity>

            {/* NOTE VOCALE, a gauche du bouton de validation : elle n'a plus
                sa propre tuile a l'etape « Informations ». Bordure orange une
                fois enregistree, comme les autres champs remplis. */}
            {onVoiceNoteChange && (
              <TouchableOpacity
                style={[
                  styles.voiceBtn,
                  (recording || hasVoiceNote) && styles.voiceBtnFilled,
                  recording && styles.voiceBtnRecording,
                ]}
                onPress={toggleRecording}
                /* Appui long : on efface la note deja enregistree. */
                onLongPress={() => {
                  if (!recording && hasVoiceNote) onVoiceNoteChange(null);
                }}
                accessibilityLabel="Enregistrer une note vocale"
              >
                <Ionicons
                  name={
                    recording ? "stop" : hasVoiceNote ? "mic" : "mic-outline"
                  }
                  size={20}
                  color={recording || hasVoiceNote ? "#fff" : "#ec4913"}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.checkBtn}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader size={34} color="white" />
              ) : (
                <Ionicons
                  name={isKeyboardVisible ? "chevron-down" : "checkmark"}
                  size={22}
                  color="white"
                />
              )}
            </TouchableOpacity>
          </View>
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
  // Android < 12 : pas de flou natif -> fond opaque pour rester lisible.
  blurFallbackLight: { backgroundColor: "#ffffff" },
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    // Android ordonne les touches par ELEVATION, pas par zIndex (sheet = 20).
    elevation: 30,
  },
  blurOverlay: {
    // Ancre en bas : sa hauteur est animee (sheet au repos, plein ecran clavier
    // ouvert), il grandit donc vers le haut.
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
    marginBottom: 16,
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
  keyboardSmallBtn: {
    marginLeft: 8,
    padding: 4,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#cbd5e1",
    letterSpacing: 1,
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
  inputContainer: {
    position: "relative",
    // `addressBox` est en `height: "100%"` et les boutons GPS / check sont
    // absolus (`bottom: 16`) : sans hauteur ici le bloc s'effondre et les
    // boutons remontent. `flex: 1` lui donne la place restante de la card.
    flex: 1,
  },
  addressBox: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 20,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#334155",
    padding: 0,
  },
  gpsBtn: {
    position: "absolute",
    bottom: 16,
    left: 16,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#334155",
  },
  /**
   * Note vocale : meme gabarit que le bouton de validation, cale juste a sa
   * gauche (40 de large + 10 d'ecart). Contour orange au repos, plein une fois
   * la note enregistree.
   */
  voiceBtn: {
    position: "absolute",
    bottom: 16,
    right: 16 + 40 + 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ec4913",
    backgroundColor: "rgba(236, 73, 19, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBtnFilled: { backgroundColor: "#ec4913" },
  /** Enregistrement en cours : rouge, comme un bouton d'arret. */
  voiceBtnRecording: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  checkBtn: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: "#ec4913",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ec4913",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  locatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
    overflow: "hidden",
  },
  locatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ec4913",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
