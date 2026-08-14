import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Loader } from "@/src/components/Loader";
import { Ionicons } from "@expo/vector-icons";
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
import { GROUPED_SHEET_HEIGHT } from "../CartGroupedDeliverySheet.styles";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
/** Hauteur du flou quand le clavier est ouvert : tout l'ecran. */
const SCREEN_HEIGHT = Dimensions.get("window").height;

// L'overlay depasse le sheet groupe, comme les autres overlays du parcours.
// Sa card occupe toute cette surface (aucune gouttiere sur le conteneur).
const SHEET_BASE_HEIGHT = GROUPED_SHEET_HEIGHT + 90;

interface GroupedContactOverlayProps {
  onClose: () => void;
  phone: string;
  onSelectPhone?: (phone: string) => void;
}

export const GroupedContactOverlay: React.FC<GroupedContactOverlayProps> = ({
  onClose,
  phone,
  onSelectPhone,
}) => {
  const [localPhone, setLocalPhone] = React.useState(phone);
  const [isSaving, setIsSaving] = React.useState(false);
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

  const handleSave = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    setIsSaving(true);
    if (onSelectPhone) onSelectPhone(localPhone);

    // Wait for the animation to progress/finish before closing the overlay
    setTimeout(() => {
      handleClose();
    }, 400); // 400ms is standard for keyboard animation
  };

  return (
    <Animated.View style={[styles.keyboardWrapper, { opacity: fade }]}>
      {/* Au repos le flou se limite au sheet ; il grandit AVEC le clavier (meme
          interpolation continue que les overlays du checkout) jusqu'a couvrir
          tout l'ecran. */}
      <AnimatedBlurView
        intensity={40}
        tint="light"
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
          {
            transform: [
              {
                // Clavier ouvert : la card remonte un peu plus haut que la
                // simple compensation, pour ne pas coller au clavier.
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
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <Text style={styles.headerTitle}>Contact Number</Text>
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
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  value={localPhone}
                  onChangeText={setLocalPhone}
                />
              </View>

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
                    size={28}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Our courier will use this number to contact you upon arrival if
              there are any issues with your delivery.
            </Text>
          </View>
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
    // La card remplit le conteneur, qui porte la hauteur de l'overlay.
    flex: 1,
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
    // Place restante de la card, au lieu d'une hauteur fixe qui debordait.
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    height: 60,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1e293b",
    padding: 0,
  },
  checkBtn: {
    width: 60,
    height: 60,
    backgroundColor: "#ec4913",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ec4913",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  helperText: {
    marginTop: 16,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
});
