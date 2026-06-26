import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import axios from "axios";
import { Config } from "@/src/api/config";
import {
  uploadImageToServer,
  isLocalUri,
} from "@/src/features/merchant/services/uploadImage";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";

// Hauteur approximative de la tab bar (navbar du bas) à réserver sous le contenu.
const TAB_BAR_HEIGHT = 60;

interface CreateBoutiquePanelProps {
  /** Retour à l'écran d'accueil "pas de boutique". */
  onCancel: () => void;
}

/**
 * Écran PLEINE PAGE de création de boutique. Reprend le formulaire complet de
 * gestion (avatar, nom, horaires, numéro OM, délai, créneaux de livraison) mais
 * exploite tout l'espace disponible au lieu d'une carte modale, et coiffe le tout
 * du header global (TabHeader). À la création, met à jour userData → le parent
 * boutique.tsx bascule instantanément vers l'interface marchande.
 */
export const CreateBoutiquePanel: React.FC<CreateBoutiquePanelProps> = ({
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(70);

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

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    message: "",
    type: "success",
  });
  const toastAnimY = useRef(new Animated.Value(-100)).current;

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
    ]).start(() => setToastVisible(false));
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const addDeliveryHour = () => {
    if (newHour && !deliveryHours.includes(newHour)) {
      setDeliveryHours([...deliveryHours, newHour].sort());
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

  const handleCreate = async () => {
    if (!name || !number) {
      showToast("Veuillez remplir les champs obligatoires", "error");
      return;
    }

    setLoading(true);
    try {
      const userId = userData?.uid;
      // Upload de l'image AVANT l'envoi : on ne doit jamais persister une URI
      // locale (file://, blob:…) — le backend/home ne pourrait pas l'afficher.
      let imageUrl = "";
      if (image) {
        imageUrl = isLocalUri(image) ? await uploadImageToServer(image) : image;
      }
      const response = await axios.post(`${Config.apiUrl}/fastFood`, {
        name,
        openTime: formatTime(openTime),
        closeTime: formatTime(closeTime),
        userId,
        number,
        image: imageUrl,
        orderLeadTime: orderLeadTime ? parseInt(orderLeadTime, 10) : undefined,
        deliveryHours: deliveryHours.length > 0 ? deliveryHours : undefined,
      });

      if (response.data && response.data.success) {
        // Bascule immédiate vers l'interface marchande.
        if (userData) {
          setUserData({
            ...userData,
            fastFoodId: response.data.data.id,
            isMarchand: true,
          });
        }
        showToast("Votre boutique a été créée avec succès !", "success", 2000);
      } else {
        showToast("Impossible de créer la boutique", "error");
      }
    } catch (error: any) {
      console.error("Error creating boutique:", error);
      const errorMessage =
        error?.response?.data?.error ||
        "Une erreur est survenue lors de la création";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TabHeader
        title="Créer ma boutique"
        subtitle="Informations du fast-food"
        right={
          <HeaderPill label="Retour" icon="arrow-back-outline" onPress={onCancel} />
        }
        onHeightChange={setHeaderHeight}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: headerHeight }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar + Nom */}
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarCircle}>
              {image ? (
                <Image source={{ uri: image }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="image-outline" size={28} color="#cbd5e1" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nom Boutique</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Entrer le nom de votre boutique"
                placeholderTextColor="#cbd5e1"
              />
            </View>
          </View>

          {/* Horaires ouverture / fermeture */}
          <View style={[styles.formRow, { marginTop: 14 }]}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Text style={styles.label}>Ouverture</Text>
              <TouchableOpacity
                style={[styles.input, styles.timeInput]}
                onPress={() => setShowOpenPicker(true)}
              >
                <Text style={styles.timeText}>{formatTime(openTime)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Text style={styles.label}>Fermeture</Text>
              <TouchableOpacity
                style={[styles.input, styles.timeInput]}
                onPress={() => setShowClosePicker(true)}
              >
                <Text style={styles.timeText}>{formatTime(closeTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Numéro OM */}
          <View style={{ marginTop: 15 }}>
            <Text style={styles.label}>Numero (OM)</Text>
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={setNumber}
              keyboardType="numeric"
              placeholder="Entrer le numero (Orange Money)"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          {/* Délai avant livraison */}
          <View style={{ marginTop: 15 }}>
            <Text style={styles.label}>Délai avant une livraison (minutes)</Text>
            <Text style={styles.helperText}>
              Les clients ne pourront plus commander X minutes avant l'heure de
              livraison
            </Text>
            <TextInput
              style={styles.input}
              value={orderLeadTime}
              onChangeText={setOrderLeadTime}
              keyboardType="numeric"
              placeholder="ex: 30"
              placeholderTextColor="#cbd5e1"
            />
          </View>

          {/* Heures de livraison */}
          <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>Heures de livraison</Text>
            <Text style={styles.helperText}>
              Sélectionnez les créneaux horaires disponibles pour la livraison
            </Text>

            <View style={styles.addHourRow}>
              <TouchableOpacity
                style={[styles.input, styles.timeInput, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeText}>
                  {newHour || "Ajouter une heure"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.addButton,
                  { width: 50, paddingHorizontal: 0, opacity: newHour ? 1 : 0.5 },
                ]}
                onPress={addDeliveryHour}
                disabled={!newHour}
              >
                <Ionicons name="add" size={22} color="#ec4913" />
              </TouchableOpacity>
            </View>

            {deliveryHours.length > 0 ? (
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
            ) : (
              <Text style={styles.emptyHoursText}>
                Aucune heure configurée (optionnel)
              </Text>
            )}
          </View>

          {/* Bouton créer */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.createBtnText}>Créer ma boutique</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers horaires */}
      {showOpenPicker && (
        <TimePickerModal
          value={openTime}
          onDone={() => setShowOpenPicker(false)}
          onChange={(d) => d && setOpenTime(d)}
          doneLabel="Terminer"
        />
      )}
      {showClosePicker && (
        <TimePickerModal
          value={closeTime}
          onDone={() => setShowClosePicker(false)}
          onChange={(d) => d && setCloseTime(d)}
          doneLabel="Terminer"
        />
      )}
      {showTimePicker && (
        <TimePickerModal
          value={tempDeliveryTime}
          onDone={() => setShowTimePicker(false)}
          onChange={(d) => {
            if (d) {
              setTempDeliveryTime(d);
              setNewHour(
                d.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
              );
            }
          }}
          doneLabel="Sélectionner"
        />
      )}

      {/* Toast */}
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

// Picker horaire en spinner (même rendu que la gestion de boutique).
const TimePickerModal = ({
  value,
  onChange,
  onDone,
  doneLabel,
}: {
  value: Date;
  onChange: (d?: Date) => void;
  onDone: () => void;
  doneLabel: string;
}) => (
  <Modal transparent visible animationType="fade">
    <View style={styles.modalOverlay}>
      <BlurView intensity={90} tint="dark" style={styles.iosPickerContainer}>
        <TouchableOpacity style={styles.iosPickerDone} onPress={onDone}>
          <Text style={{ color: "white", fontWeight: "bold" }}>{doneLabel}</Text>
        </TouchableOpacity>
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          display="spinner"
          textColor="white"
          onChange={(_, d) => onChange(d)}
        />
      </BlurView>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  formRow: {
    flexDirection: "row",
  },
  label: {
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
  input: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 15,
    height: 50,
    color: "#0f172a",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 6,
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
    color: "#94a3b8",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    marginTop: 28,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerContainer: {
    width: "85%",
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
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 0,
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
