import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

const { width, height } = Dimensions.get("window");

interface EditBoutiquePanelProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditBoutiquePanel: React.FC<EditBoutiquePanelProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [openTime, setOpenTime] = useState(new Date());
  const [closeTime, setCloseTime] = useState(new Date());
  const [number, setNumber] = useState("");
  const [deliveryHours, setDeliveryHours] = useState<string[]>([]);
  const [newHour, setNewHour] = useState("");
  const [image, setImage] = useState<string>("");
  const [orderLeadTime, setOrderLeadTime] = useState("");
  const [tempDeliveryTime, setTempDeliveryTime] = useState(new Date());

  // Picker states
  const [showOpenPicker, setShowOpenPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Animation values
  const cardSlideAnim = useRef(new Animated.Value(250)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.96)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Toast Anim
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: "",
    type: "success",
  });
  const toastAnimY = useRef(new Animated.Value(-100)).current;

  // Helpers
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
    duration = 3000,
  ) => {
    setToastConfig({ message, type });
    setToastVisible(true);
    Animated.sequence([
      Animated.spring(toastAnimY, {
        toValue: Platform.OS === "ios" ? 60 : 40,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.delay(duration),
      Animated.timing(toastAnimY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const resetAnims = () => {
    cardSlideAnim.setValue(250);
    cardScaleAnim.setValue(0.96);
    cardFadeAnim.setValue(0);
    fadeAnim.setValue(0);
  };

  // Load boutique data when visible
  useEffect(() => {
    if (visible && userData?.fastFoodId) {
      const loadBoutiqueData = async () => {
        try {
          const response = await axios.get(
            `${Config.apiUrl}/fastfood/${userData.fastFoodId}`,
            {
              headers: { "ngrok-skip-browser-warning": "true" },
            }
          );
          if (response.data?.data) {
            const data = response.data.data;
            setName(data.name || "");
            setNumber(data.number || "");
            setDeliveryHours(data.deliveryHours || []);
            setImage(data.image || "");
            setOrderLeadTime(data.orderLeadTime !== undefined ? String(data.orderLeadTime) : "");

            // Parse times
            if (data.openTime) {
              const [hours, minutes] = data.openTime.split(":").map(Number);
              const open = new Date();
              open.setHours(hours, minutes);
              setOpenTime(open);
            }
            if (data.closeTime) {
              const [hours, minutes] = data.closeTime.split(":").map(Number);
              const close = new Date();
              close.setHours(hours, minutes);
              setCloseTime(close);
            }
          }
        } catch (error) {
          console.error("Error loading boutique data:", error);
        }
      };
      loadBoutiqueData();
    }
  }, [visible, userData?.fastFoodId]);

  // Entry animations sequence
  useEffect(() => {
    if (visible) {
      setIsEntering(true);
      resetAnims();

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(cardFadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(cardSlideAnim, {
              toValue: 0,
              tension: 18,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(cardScaleAnim, {
              toValue: 1,
              tension: 18,
              friction: 8,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => setIsEntering(false));
    }
  }, [visible]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const addDeliveryHour = () => {
    if (newHour && !deliveryHours.includes(newHour)) {
      const sorted = [...deliveryHours, newHour].sort();
      setDeliveryHours(sorted);
      setNewHour("");
    }
  };

  const removeDeliveryHour = (hour: string) => {
    setDeliveryHours(deliveryHours.filter((h) => h !== hour));
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showToast("Erreur lors de la sélection de l'image", "error");
    }
  };

  const handleUpdate = async () => {
    if (!name || !number) {
      showToast("Veuillez remplir les champs obligatoires", "error");
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        name,
        openTime: formatTime(openTime),
        closeTime: formatTime(closeTime),
        number,
        orderLeadTime: orderLeadTime ? parseInt(orderLeadTime, 10) : undefined,
        deliveryHours: deliveryHours.length > 0 ? deliveryHours : undefined,
      };

      // Add image if it's a new selection (starts with file:// or content://)
      if (image && (image.startsWith("file://") || image.startsWith("content://"))) {
        updateData.image = image;
      } else if (!image) {
        // Optionally clear image if user removes it
        // updateData.image = "";
      }

      const response = await axios.post(
        `${Config.apiUrl}/fastfood/${userData?.fastFoodId}`,
        updateData
      );

      if (response.data && response.data.success) {
        showToast("Boutique mise à jour avec succès !", "success", 2000);
        setTimeout(() => {
          closeModal();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        showToast("Impossible de mettre à jour la boutique", "error");
      }
    } catch (error: any) {
      console.error("Error updating boutique:", error);
      const errorMessage =
        error?.response?.data?.error ||
        "Une erreur est survenue lors de la mise à jour";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsEntering(false);
    resetAnims();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.backgroundWhite} />

      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim, zIndex: 998 }]}
        pointerEvents="auto"
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={closeModal}
          pointerEvents="auto"
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={[{ flex: 1, zIndex: 999 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        {/* Card — centered in modal */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: cardFadeAnim,
              transform: [
                { translateY: cardSlideAnim },
                { scale: cardScaleAnim },
              ],
              zIndex: 999,
            },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.cardWrapper}>
            <View style={styles.glassCardWrapper}>
              <View style={styles.whiteBackground} pointerEvents="none" />

              <ScrollView
                contentContainerStyle={styles.cardGrid}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, zIndex: 1 }}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                pointerEvents="auto"
              >
                {/* Header */}
                <View style={styles.headerSection}>
                  <Ionicons name="storefront-outline" size={24} color="#ec4913" />
                  <Text style={styles.headerTitle}>Modifier votre boutique</Text>
                </View>

                {/* Avatar + Name row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <TouchableOpacity onPress={pickImage} style={styles.avatarCircle}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="image-outline" size={28} color="#cbd5e1" />
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.floatingLabel}>Nom Boutique</Text>
                    <TextInput
                      style={[styles.glassInput, { borderRadius: 20 }]}
                      value={name}
                      onChangeText={setName}
                      placeholder="Entrer le nom de votre boutique"
                      placeholderTextColor="#cbd5e1"
                    />
                  </View>
                </View>

                {/* Time inputs */}
                <View style={[styles.formRow, { marginTop: 10 }]}>
                  <View style={{ flex: 1, marginRight: 5 }}>
                    <Text style={styles.floatingLabel}>Ouverture</Text>
                    <TouchableOpacity
                      style={[
                        styles.glassInput,
                        styles.timeInput,
                        { borderRadius: 20 },
                      ]}
                      onPress={() => setShowOpenPicker(true)}
                    >
                      <Text style={styles.timeText}>{formatTime(openTime)}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, marginLeft: 5 }}>
                    <Text style={styles.floatingLabel}>Fermeture</Text>
                    <TouchableOpacity
                      style={[
                        styles.glassInput,
                        styles.timeInput,
                        { borderRadius: 20 },
                      ]}
                      onPress={() => setShowClosePicker(true)}
                    >
                      <Text style={styles.timeText}>{formatTime(closeTime)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Number input */}
                <View style={[styles.inputGroup, { marginTop: 15 }]}>
                  <Text style={styles.floatingLabel}>Numero (OM)</Text>
                  <TextInput
                    style={[styles.glassInput, { borderRadius: 20 }]}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    placeholder="Entrer le numero (Orange Money)"
                    placeholderTextColor="#cbd5e1"
                  />
                </View>

                {/* Delivery Cutoff Time input */}
                <View style={[styles.inputGroup, { marginTop: 15 }]}>
                  <Text style={styles.floatingLabel}>Délai avant une livraison (minutes)</Text>
                  <Text style={styles.helperText}>
                    Les clients ne pourront plus commander X minutes avant l'heure de livraison
                  </Text>
                  <TextInput
                    style={[styles.glassInput, { borderRadius: 20 }]}
                    value={orderLeadTime}
                    onChangeText={setOrderLeadTime}
                    keyboardType="numeric"
                    placeholder="ex: 30"
                    placeholderTextColor="#cbd5e1"
                  />
                </View>

                {/* Delivery Hours Section */}
                <View style={[styles.inputGroup, { marginTop: 20 }]}>
                  <Text style={styles.floatingLabel}>Heures de livraison</Text>
                  <Text style={styles.helperText}>
                    Sélectionnez les créneaux horaires disponibles pour la livraison
                  </Text>

                  {/* Add time slot */}
                  <View style={styles.addHourRow}>
                    <TouchableOpacity
                      style={[
                        styles.glassInput,
                        styles.timeInput,
                        { flex: 1, marginRight: 8 },
                      ]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeText}>
                        {newHour || "Ajouter une heure"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.glassInput,
                        styles.addButton,
                        {
                          width: 50,
                          paddingHorizontal: 0,
                          opacity: newHour ? 1 : 0.5,
                        },
                      ]}
                      onPress={addDeliveryHour}
                      disabled={!newHour}
                    >
                      <Ionicons name="add" size={22} color="#ec4913" />
                    </TouchableOpacity>
                  </View>

                  {/* Hours list */}
                  {deliveryHours.length > 0 && (
                    <View style={styles.hoursGrid}>
                      {deliveryHours.map((hour, idx) => (
                        <View key={`${hour}-${idx}`} style={styles.hourChip}>
                          <Text style={styles.hourChipText}>{hour}</Text>
                          <TouchableOpacity
                            onPress={() => removeDeliveryHour(hour)}
                            style={styles.hourChipRemove}
                          >
                            <Ionicons name="close-outline" size={14} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {deliveryHours.length === 0 && (
                    <Text style={styles.emptyHoursText}>
                      Aucune heure configurée (optionnel)
                    </Text>
                  )}
                </View>

                {/* Buttons row */}
                <View style={[styles.actionRow, { justifyContent: "flex-end" }]}>
                  <TouchableOpacity
                    style={styles.chipBtn}
                    onPress={closeModal}
                    disabled={isEntering}
                  >
                    <Ionicons name="close" size={18} color="white" />
                    <Text style={styles.chipText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chipBtn, { marginLeft: 10 }]}
                    onPress={handleUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="white"
                        />
                        <Text style={styles.chipText}>Mettre à jour</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Subtle border-glow flare */}
              <View style={styles.cardBorder} pointerEvents="none" />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* --- TIME PICKERS --- */}

      {/* Open Time Picker */}
      {showOpenPicker && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.iosPickerContainer}
            >
              <TouchableOpacity
                style={styles.iosPickerDone}
                onPress={() => setShowOpenPicker(false)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Terminer
                </Text>
              </TouchableOpacity>
              <DateTimePicker
                value={openTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                textColor="white"
                onChange={(e, d) => d && setOpenTime(d)}
              />
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Close Time Picker */}
      {showClosePicker && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.iosPickerContainer}
            >
              <TouchableOpacity
                style={styles.iosPickerDone}
                onPress={() => setShowClosePicker(false)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Terminer
                </Text>
              </TouchableOpacity>
              <DateTimePicker
                value={closeTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                textColor="white"
                onChange={(e, d) => d && setCloseTime(d)}
              />
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Delivery Hour Time Picker */}
      {showTimePicker && (
        <Modal transparent={true} visible={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.iosPickerContainer}
            >
              <TouchableOpacity
                style={styles.iosPickerDone}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                  Sélectionner
                </Text>
              </TouchableOpacity>
              <DateTimePicker
                value={tempDeliveryTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                textColor="white"
                onChange={(e, d) => {
                  if (d) {
                    setTempDeliveryTime(d);
                    const formatted = d.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    setNewHour(formatted);
                  }
                }}
              />
            </BlurView>
          </View>
        </Modal>
      )}

      {/* Global Toast */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            toastConfig.type === "error"
              ? styles.toastError
              : styles.toastSuccess,
            { transform: [{ translateY: toastAnimY }] },
          ]}
        >
          <Ionicons
            name={
              toastConfig.type === "success"
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={24}
            color="white"
          />
          <Text style={styles.toastText}>{toastConfig.message}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundWhite: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 999,
  },
  cardContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 1,
    maxHeight: "90%",
  },
  cardWrapper: {
    width: "100%",
    // maxWidth: 480,
    borderRadius: 30,
    overflow: "hidden",
    position: "relative",
    maxHeight: 620,
  },
  glassCardWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  whiteBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#ffffff",
    borderRadius: 30,
  },
  glassCard: {
    width: "100%",
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 30,
    zIndex: 10,
    overflow: "hidden",
  },
  cardBorder: {
    position: "absolute",
    zIndex: 5,
    width: "100%",
    height: "100%",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardGrid: {
    flexGrow: 1,
    padding: 20,
  },
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  headerTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "bold",
  },
  formRow: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  imagePicker: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imageOverlayText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  noImage: {
    alignItems: "center",
    gap: 8,
  },
  noImageText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  floatingLabel: {
    color: "#64748b",
    fontSize: 10,
    marginBottom: 4,
    marginLeft: 2,
    fontWeight: "600",
  },
  helperText: {
    color: "#94a3b8",
    fontSize: 9,
    marginBottom: 8,
    marginLeft: 2,
  },
  glassInput: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 15,
    height: 50,
    color: "#0f172a",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeInput: {
    justifyContent: "center",
  },
  timeText: {
    color: "#0f172a",
    fontSize: 13,
  },
  addHourRow: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 12,
  },
  addButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  hoursGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  hourChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(236,73,19,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  hourChipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  hourChipRemove: {
    padding: 2,
  },
  emptyHoursText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  chipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ec4913",
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#ec4913",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 34,
  },
  chipText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  // iOS Picker Overlays
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iosPickerDone: {
    alignItems: "flex-end",
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  // Toast Styles
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 60,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    gap: 12,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: Theme.colors.success || "#28a745",
  },
  toastError: {
    backgroundColor: Theme.colors.danger || "#dc3545",
  },
  toastText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
});
