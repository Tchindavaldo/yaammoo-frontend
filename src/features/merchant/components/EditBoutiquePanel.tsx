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
import {
  uploadImageToServer,
  isLocalUri,
} from "@/src/features/merchant/services/uploadImage";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";

// Hauteur approximative de la tab bar (navbar du bas) à réserver sous le contenu.
const TAB_BAR_HEIGHT = 60;

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
  const insets = useSafeAreaInsets();
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(70);

  // Form fields
  const [name, setName] = useState("");
  const [openTime, setOpenTime] = useState(new Date());
  const [closeTime, setCloseTime] = useState(new Date());
  const [number, setNumber] = useState("");
  const [deliveryHours, setDeliveryHours] = useState<string[]>([]);
  const [newHour, setNewHour] = useState("");
  // Heure dont on édite les lieux/prix (chip heure actif). null = aucune.
  const [activeHour, setActiveHour] = useState<string | null>(null);
  // Lieux + prix par heure (design only pour l'instant, pas envoyé au backend).
  const [zonesByHour, setZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  // Ligne d'édition lieu/prix : draft + index de l'item en édition (null = création).
  const [placeDraft, setPlaceDraft] = useState({ lieu: "", prix: "" });
  const [placeEditIdx, setPlaceEditIdx] = useState<number | null>(null);
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
        setLoadingData(true);
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
        } finally {
          setLoadingData(false);
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
      setActiveHour(newHour);
      setNewHour("");
    }
  };

  const removeDeliveryHour = (hour: string) => {
    setDeliveryHours(deliveryHours.filter((h) => h !== hour));
    setZonesByHour((prev) => {
      const next = { ...prev };
      delete next[hour];
      return next;
    });
    if (activeHour === hour) {
      setActiveHour(null);
      resetPlaceDraft();
    }
  };

  // ── Lieux / prix de l'heure active (design — pas encore persisté) ──
  const resetPlaceDraft = () => {
    setPlaceDraft({ lieu: "", prix: "" });
    setPlaceEditIdx(null);
  };

  const selectHour = (hour: string) => {
    setActiveHour((prev) => (prev === hour ? null : hour));
    resetPlaceDraft();
  };

  const validatePlace = () => {
    if (!activeHour || !placeDraft.lieu.trim()) return;
    const item = { lieu: placeDraft.lieu.trim(), prix: placeDraft.prix.trim() };
    setZonesByHour((prev) => {
      const list = prev[activeHour] ? [...prev[activeHour]] : [];
      if (placeEditIdx === null) list.push(item);
      else list[placeEditIdx] = item;
      return { ...prev, [activeHour]: list };
    });
    resetPlaceDraft();
  };

  const editPlace = (idx: number) => {
    if (!activeHour) return;
    const item = zonesByHour[activeHour]?.[idx];
    if (!item) return;
    setPlaceDraft({ lieu: item.lieu, prix: item.prix });
    setPlaceEditIdx(idx);
  };

  const deletePlace = () => {
    if (activeHour && placeEditIdx !== null) {
      setZonesByHour((prev) => ({
        ...prev,
        [activeHour]: (prev[activeHour] || []).filter((_, i) => i !== placeEditIdx),
      }));
    }
    resetPlaceDraft();
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

      // Nouvelle image sélectionnée (URI locale, y compris blob:/data: sur web) :
      // on l'upload AVANT l'envoi et on persiste l'URL publique. Si l'image est
      // déjà une URL (inchangée), on la renvoie telle quelle.
      if (image && isLocalUri(image)) {
        updateData.image = await uploadImageToServer(image);
      } else if (image) {
        updateData.image = image;
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
      {/* Fond blanc opaque FIXE sous le header : couvre toute la zone de contenu
          (évite que le settings transparaisse au scroll). Derrière le header, on
          laisse transparent pour que le BlurView floute le settings. */}
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Gérer ma boutique"
        subtitle="Informations du fast-food"
        right={
          <HeaderPill
            label="Retour"
            icon="arrow-back-outline"
            onPress={closeModal}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      <KeyboardAvoidingView
        style={[{ flex: 1, paddingTop: headerHeight }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              <ScrollView
                contentContainerStyle={[
                  styles.cardGrid,
                  { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 },
                ]}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {loadingData ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.primary} />
                    <Text style={styles.loaderText}>Chargement de la boutique…</Text>
                  </View>
                ) : (
                <>
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

                {/* Delivery Section — design calqué sur Extras/Boissons du create menu */}
                <View style={[styles.inputGroup, { marginTop: 20 }]}>
                  {/* Ligne label "Livraison" + ×N + chips heures (scroll horizontal) */}
                  <View style={styles.chipHeaderRow}>
                    <Text style={[styles.floatingLabel, { marginBottom: 0 }]}>
                      Livraison
                    </Text>
                    {deliveryHours.length > 0 && (
                      <Text style={styles.itemCountText}>×{deliveryHours.length}</Text>
                    )}
                    {deliveryHours.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipScroll}
                        contentContainerStyle={styles.chipScrollContent}
                        keyboardShouldPersistTaps="handled"
                      >
                        {deliveryHours.map((hour, i) => (
                          <React.Fragment key={`${hour}-${i}`}>
                            {i > 0 && <Text style={styles.chipSeparator}>·</Text>}
                            <TouchableOpacity onPress={() => selectHour(hour)}>
                              <Text
                                style={[
                                  styles.itemChipText,
                                  activeHour === hour && styles.itemChipTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {hour}
                                {zonesByHour[hour]?.length
                                  ? ` (${zonesByHour[hour].length})`
                                  : ""}
                              </Text>
                            </TouchableOpacity>
                          </React.Fragment>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  {/* Ligne d'édition heure : time picker + valider (ajoute l'heure) */}
                  <View style={styles.editRow}>
                    <TouchableOpacity
                      style={[styles.glassInput, styles.timeInput, styles.editInput, { flex: 1 }]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.timeText}>
                        {newHour || "Ajouter une heure"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.validateBtn, { opacity: newHour ? 1 : 0.5 }]}
                      onPress={addDeliveryHour}
                      disabled={!newHour}
                    >
                      <Ionicons name="checkmark" size={18} color="white" />
                    </TouchableOpacity>
                  </View>

                  {deliveryHours.length === 0 && (
                    <Text style={styles.emptyHoursText}>
                      Aucune heure configurée (optionnel)
                    </Text>
                  )}

                  {/* Sous-bloc Lieux/Prix de l'heure active (même design) */}
                  {activeHour && (
                    <View style={styles.zoneBlock}>
                      {/* Ligne label "Lieu / Prix" + ×N + chips lieux */}
                      <View style={styles.chipHeaderRow}>
                        <Text style={[styles.floatingLabel, { marginBottom: 0 }]}>
                          Lieu / Prix · {activeHour}
                        </Text>
                        {zonesByHour[activeHour]?.length ? (
                          <Text style={styles.itemCountText}>
                            ×{zonesByHour[activeHour].length}
                          </Text>
                        ) : null}
                        {zonesByHour[activeHour]?.length ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                            contentContainerStyle={styles.chipScrollContent}
                            keyboardShouldPersistTaps="handled"
                          >
                            {zonesByHour[activeHour].map((z, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <Text style={styles.chipSeparator}>·</Text>
                                )}
                                <TouchableOpacity onPress={() => editPlace(idx)}>
                                  <Text
                                    style={[
                                      styles.itemChipText,
                                      placeEditIdx === idx &&
                                        styles.itemChipTextActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {z.lieu}
                                    {z.prix ? ` · ${z.prix}` : ""}
                                  </Text>
                                </TouchableOpacity>
                              </React.Fragment>
                            ))}
                          </ScrollView>
                        ) : null}
                      </View>

                      {/* Ligne d'édition lieu : input lieu + input prix + supprimer + ajouter */}
                      <View style={styles.editRow}>
                        <TextInput
                          style={[styles.glassInput, styles.editInput, { flex: 1.4 }]}
                          value={placeDraft.lieu}
                          onChangeText={(t) =>
                            setPlaceDraft({ ...placeDraft, lieu: t })
                          }
                          placeholder="Localisation"
                          placeholderTextColor="#cbd5e1"
                        />
                        <TextInput
                          style={[styles.glassInput, styles.editInput, { flex: 1 }]}
                          value={placeDraft.prix}
                          onChangeText={(t) =>
                            setPlaceDraft({ ...placeDraft, prix: t })
                          }
                          keyboardType="numeric"
                          placeholder="Prix"
                          placeholderTextColor="#cbd5e1"
                        />
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={deletePlace}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.validateBtn]}
                          onPress={validatePlace}
                        >
                          <Ionicons name="checkmark" size={18} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Bouton mettre à jour (pleine largeur, même design que la création) */}
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={handleUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text style={styles.updateBtnText}>Mettre à jour</Text>
                    </>
                  )}
                </TouchableOpacity>
                </>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
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
    // Transparent : laisse le settings transparaître DERRIÈRE le header (effet blur).
    // Le fond blanc est posé sur la zone de contenu uniquement (cardGrid).
    backgroundColor: "transparent",
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  cardGrid: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 120,
    gap: 14,
  },
  loaderText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  updateBtn: {
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
  updateBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  formRow: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 0,
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
  // ── Design Livraison (chips + ligne d'édition), calqué sur create menu ──
  // Ligne label + ×N + chips scrollables (ne wrappe jamais).
  chipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chipScroll: {
    flex: 1,
    marginLeft: 10,
  },
  chipScrollContent: {
    alignItems: "center",
    gap: 6,
    paddingRight: 4,
  },
  itemChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    maxWidth: 160,
  },
  itemChipTextActive: {
    color: "#ec4913",
  },
  chipSeparator: {
    fontSize: 13,
    color: "#cbd5e1",
  },
  itemCountText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#ec4913",
  },
  // Ligne d'édition (inputs + boutons supprimer/valider).
  editRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 12,
  },
  editInput: {
    borderRadius: 14,
    height: 46,
  },
  actionBtn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
  },
  validateBtn: {
    backgroundColor: "#ec4913",
  },
  // Sous-bloc Lieux/Prix de l'heure active.
  zoneBlock: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  emptyHoursText: {
    color: "#94a3b8",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
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
