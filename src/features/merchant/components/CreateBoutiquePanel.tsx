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
import { buildDeliveryPayload } from "@/src/features/merchant/services/buildDeliveryPayload";

const TAB_BAR_HEIGHT = 60;

const CAMEROON_CITIES = [
  "Douala",
  "Yaoundé",
  "Bamenda",
  "Garoua",
  "Maroua",
  "Bafoussam",
  "Ngaoundéré",
  "Bertoua",
  "Edéa",
  "Loum",
  "Kumba",
  "Buéa",
  "Nkongsamba",
  "Limbe",
  "Kousseri",
  "Dschang",
  "Mokolo",
  "Mbalmayo",
  "Bangangté",
  "Sangmélima",
  "Foumban",
  "Ebolowa",
  "Mbouda",
  "Guider",
  "Meiganga",
  "Yagoua",
  "Mballa",
  "Obala",
  "Melong",
  "Kribi",
];

interface CreateBoutiquePanelProps {
  onCancel: () => void;
}

export const CreateBoutiquePanel: React.FC<CreateBoutiquePanelProps> = ({
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(70);
  const [page, setPage] = useState(1);

  // Form fields
  const [name, setName] = useState("");
  const [openTime, setOpenTime] = useState(new Date());
  const [closeTime, setCloseTime] = useState(new Date());
  const [number, setNumber] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState<string[]>([]);
  const [newHour, setNewHour] = useState("");
  const [activeHour, setActiveHour] = useState<string | null>(null);
  const [image, setImage] = useState<string>("");
  const [orderLeadTime, setOrderLeadTime] = useState("");
  const [advanceDays, setAdvanceDays] = useState("");
  const [pickupAllowed, setPickupAllowed] = useState(false);
  const [tempDeliveryTime, setTempDeliveryTime] = useState(new Date());
  const [periodicEnabled, setPeriodicEnabled] = useState<
    Record<string, boolean>
  >({});
  const [periodicZonesByHour, setPeriodicZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  const [expressEnabled, setExpressEnabled] = useState<Record<string, boolean>>(
    {},
  );
  const [expressZonesByHour, setExpressZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  const [periodicDraft, setPeriodicDraft] = useState({ lieu: "", prix: "" });
  const [expressDraft, setExpressDraft] = useState({ lieu: "", prix: "" });
  const [periodicEditIdx, setPeriodicEditIdx] = useState<number | null>(null);
  const [expressEditIdx, setExpressEditIdx] = useState<number | null>(null);

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
      setActiveHour(newHour);
      setNewHour("");
      return;
    }
    setActiveHour(null);
    setNewHour("");
  };

  const removeDeliveryHour = (hour: string) => {
    setDeliveryHours((prev) => prev.filter((h) => h !== hour));
    setPeriodicZonesByHour((prev) => {
      const next = { ...prev };
      delete next[hour];
      return next;
    });
    setExpressZonesByHour((prev) => {
      const next = { ...prev };
      delete next[hour];
      return next;
    });
    setExpressEnabled((prev) => {
      const next = { ...prev };
      delete next[hour];
      return next;
    });
    if (activeHour === hour) setActiveHour(null);
  };

  const selectHour = (hour: string) => {
    setActiveHour((prev) => (prev === hour ? null : hour));
    setNewHour(hour);
    const [h, m] = hour.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempDeliveryTime(d);
    setPeriodicDraft({ lieu: "", prix: "" });
    setExpressDraft({ lieu: "", prix: "" });
    setPeriodicEditIdx(null);
    setExpressEditIdx(null);
    if (
      activeHour !== hour &&
      periodicZonesByHour[hour]?.length &&
      !expressZonesByHour[hour]?.length
    ) {
      setExpressZonesByHour((prev) => ({
        ...prev,
        [hour]: [...(periodicZonesByHour[hour] || [])],
      }));
    }
  };

  const validatePeriodic = () => {
    if (!activeHour || !periodicDraft.lieu.trim()) return;
    const item = {
      lieu: periodicDraft.lieu.trim(),
      prix: periodicDraft.prix.trim(),
    };
    setPeriodicZonesByHour((prev) => {
      const list = prev[activeHour] ? [...prev[activeHour]] : [];
      if (periodicEditIdx === null) list.push(item);
      else list[periodicEditIdx] = item;
      return { ...prev, [activeHour]: list };
    });
    setExpressZonesByHour((prev) => {
      if (prev[activeHour]?.length) return prev;
      return {
        ...prev,
        [activeHour]: [...(periodicZonesByHour[activeHour] || []), item],
      };
    });
    setPeriodicDraft({ lieu: "", prix: "" });
    setPeriodicEditIdx(null);
  };

  const deletePeriodic = () => {
    if (activeHour && periodicEditIdx !== null) {
      setPeriodicZonesByHour((prev) => ({
        ...prev,
        [activeHour]: (prev[activeHour] || []).filter(
          (_, i) => i !== periodicEditIdx,
        ),
      }));
    }
    setPeriodicDraft({ lieu: "", prix: "" });
    setPeriodicEditIdx(null);
  };

  const validateExpress = () => {
    if (!activeHour || !expressDraft.lieu.trim()) return;
    const item = {
      lieu: expressDraft.lieu.trim(),
      prix: expressDraft.prix.trim(),
    };
    setExpressZonesByHour((prev) => {
      const list = prev[activeHour] ? [...prev[activeHour]] : [];
      if (expressEditIdx === null) list.push(item);
      else list[expressEditIdx] = item;
      return { ...prev, [activeHour]: list };
    });
    setExpressDraft({ lieu: "", prix: "" });
    setExpressEditIdx(null);
  };

  const deleteExpress = () => {
    if (activeHour && expressEditIdx !== null) {
      setExpressZonesByHour((prev) => ({
        ...prev,
        [activeHour]: (prev[activeHour] || []).filter(
          (_, i) => i !== expressEditIdx,
        ),
      }));
    }
    setExpressDraft({ lieu: "", prix: "" });
    setExpressEditIdx(null);
  };

  const toggleExpress = (hour: string) => {
    setExpressEnabled((prev) => {
      const next = !prev[hour];
      if (
        next &&
        !expressZonesByHour[hour]?.length &&
        periodicZonesByHour[hour]?.length
      ) {
        setExpressZonesByHour((z) => ({
          ...z,
          [hour]: [...(periodicZonesByHour[hour] || [])],
        }));
      }
      return { ...prev, [hour]: next };
    });
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
        momoNumber,
        whatsappNumber,
        cities: selectedCities,
        image: imageUrl,
        orderLeadTime: orderLeadTime ? parseInt(orderLeadTime, 10) : undefined,
        advanceDays: advanceDays ? parseInt(advanceDays, 10) : undefined,
        pickupAllowed,
        deliveryHours:
          deliveryHours.length > 0
            ? buildDeliveryPayload(
                deliveryHours,
                periodicEnabled,
                periodicZonesByHour,
                expressEnabled,
                expressZonesByHour,
              )
            : undefined,
      });

      if (response.data && response.data.success) {
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
          <HeaderPill
            label="Retour"
            icon="arrow-back-outline"
            onPress={onCancel}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: headerHeight }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {page === 1 ? (
          // ── PAGE 1 : Infos générales ──
          <View style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Avatar + Nom */}
              <View style={styles.avatarRow}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.avatarCircle}
                >
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
              <View style={[styles.formRow, { marginTop: 14, gap: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ouverture</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.timeInput]}
                    onPress={() => setShowOpenPicker(true)}
                  >
                    <Text style={styles.timeText}>{formatTime(openTime)}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Fermeture</Text>
                  <TouchableOpacity
                    style={[styles.input, styles.timeInput]}
                    onPress={() => setShowClosePicker(true)}
                  >
                    <Text style={styles.timeText}>{formatTime(closeTime)}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* OM / MOMO / WhatsApp */}
              <View style={[styles.formRow, { marginTop: 15, gap: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>OM</Text>
                  <TextInput
                    style={styles.input}
                    value={number}
                    onChangeText={setNumber}
                    keyboardType="numeric"
                    placeholder="Orange Money"
                    placeholderTextColor="#cbd5e1"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>MOMO</Text>
                  <TextInput
                    style={styles.input}
                    value={momoNumber}
                    onChangeText={setMomoNumber}
                    keyboardType="numeric"
                    placeholder="MTN Mobile Money"
                    placeholderTextColor="#cbd5e1"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>WhatsApp</Text>
                  <TextInput
                    style={styles.input}
                    value={whatsappNumber}
                    onChangeText={setWhatsappNumber}
                    keyboardType="numeric"
                    placeholder="WhatsApp"
                    placeholderTextColor="#cbd5e1"
                  />
                </View>
              </View>

              {/* Localisation - Villes */}
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>
                  Localisation
                  {selectedCities.length > 0
                    ? ` (${selectedCities.length})`
                    : ""}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.timeInput,
                    { minHeight: 50, paddingVertical: 10 },
                  ]}
                  onPress={() => setShowCityPicker(true)}
                >
                  {selectedCities.length > 0 ? (
                    <Text
                      style={{ color: "#334155", fontSize: 13 }}
                      numberOfLines={2}
                    >
                      {selectedCities.join(", ")}
                    </Text>
                  ) : (
                    <Text style={{ color: "#cbd5e1", fontSize: 13 }}>
                      Sélectionner les villes de livraison
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Délai livraison */}
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Délai livraison (minutes)</Text>
                <Text style={styles.helperText}>
                  Les clients ne pourront plus commander X minutes avant l'heure
                  de livraison
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

              {/* Jours en avance */}
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Jours en avance</Text>
                <Text style={styles.helperText}>
                  Nombre de jours à l'avance qu'un client peut commander (ex: 3
                  = aujourd'hui, demain, après-demain)
                </Text>
                <TextInput
                  style={styles.input}
                  value={advanceDays}
                  onChangeText={setAdvanceDays}
                  keyboardType="numeric"
                  placeholder="ex: 3"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.createBtn,
                { marginTop: 16, marginBottom: insets.bottom + TAB_BAR_HEIGHT },
              ]}
              onPress={() => setPage(2)}
            >
              <Text style={styles.createBtnText}>Suivant</Text>
              <Ionicons name="arrow-forward-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          // ── PAGE 2 : Livraison (heures + zones) ──
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Heures de livraison */}
            <View style={{ marginTop: 0 }}>
              <Text style={styles.label}>Heures de livraison</Text>
              <Text style={styles.helperText}>
                Sélectionnez les créneaux horaires disponibles pour la livraison
              </Text>

              <View style={styles.addHourRow}>
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.timeInput,
                    { flex: 1, marginRight: 8 },
                  ]}
                  onPress={() => {
                    if (activeHour) {
                      setNewHour(activeHour);
                      const [h, m] = activeHour.split(":").map(Number);
                      const d = new Date();
                      d.setHours(h, m, 0, 0);
                      setTempDeliveryTime(d);
                    }
                    setShowTimePicker(true);
                  }}
                >
                  <Text style={styles.timeText}>
                    {newHour || activeHour || "Ajouter une heure"}
                  </Text>
                </TouchableOpacity>
                {activeHour && (
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.deleteButton,
                      { width: 50, paddingHorizontal: 0 },
                    ]}
                    onPress={() => removeDeliveryHour(activeHour)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc3545" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.input,
                    styles.addButton,
                    {
                      width: 50,
                      paddingHorizontal: 0,
                      opacity: newHour || activeHour ? 1 : 0.5,
                    },
                  ]}
                  onPress={addDeliveryHour}
                  disabled={!newHour && !activeHour}
                >
                  <Ionicons name="checkmark" size={22} color="#ec4913" />
                </TouchableOpacity>
              </View>

              {deliveryHours.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 12 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {deliveryHours.map((hour, idx) => (
                    <TouchableOpacity
                      key={`${hour}-${idx}`}
                      style={[
                        styles.hourChip,
                        activeHour === hour && styles.hourChipActive,
                      ]}
                      onPress={() => selectHour(hour)}
                    >
                      <Text style={styles.hourChipText}>{hour}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {deliveryHours.length === 0 && (
                <Text style={styles.emptyHoursText}>
                  Aucune heure configurée (optionnel)
                </Text>
              )}

              {/* Blocs Lieux/Prix */}
              {activeHour && (
                <>
                  {/* Bloc Livraison périodique */}
                  <View
                    style={[
                      styles.zoneBlock,
                      { opacity: periodicEnabled[activeHour] ? 1 : 0.5 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        setPeriodicEnabled((prev) => ({
                          ...prev,
                          [activeHour]: !prev[activeHour],
                        }))
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          periodicEnabled[activeHour] && styles.checkboxActive,
                        ]}
                      >
                        {periodicEnabled[activeHour] && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          periodicEnabled[activeHour] && { color: "#10b981" },
                        ]}
                      >
                        Livraison périodique · {activeHour}
                      </Text>
                    </TouchableOpacity>

                    {periodicEnabled[activeHour] && (
                      <>
                        {periodicZonesByHour[activeHour]?.length > 0 && (
                          <View style={styles.chipsRow}>
                            {periodicZonesByHour[activeHour].map((z, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => {
                                  setPeriodicDraft({
                                    lieu: z.lieu,
                                    prix: z.prix,
                                  });
                                  setPeriodicEditIdx(idx);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    periodicEditIdx === idx &&
                                      styles.chipTextActive,
                                  ]}
                                >
                                  {z.lieu}
                                  {z.prix ? ` · ${z.prix}` : ""}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.input, { flex: 1.4, height: 42 }]}
                            value={periodicDraft.lieu}
                            onChangeText={(t) =>
                              setPeriodicDraft({ ...periodicDraft, lieu: t })
                            }
                            placeholder="Localisation"
                            placeholderTextColor="#cbd5e1"
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, height: 42 }]}
                            value={periodicDraft.prix}
                            onChangeText={(t) =>
                              setPeriodicDraft({ ...periodicDraft, prix: t })
                            }
                            keyboardType="numeric"
                            placeholder="Prix"
                            placeholderTextColor="#cbd5e1"
                          />
                          <TouchableOpacity
                            style={styles.smallBtn}
                            onPress={deletePeriodic}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#dc3545"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.smallBtn,
                              { backgroundColor: "#ec4913" },
                            ]}
                            onPress={validatePeriodic}
                          >
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Bloc Livraison express */}
                  <View
                    style={[
                      styles.zoneBlock,
                      { opacity: expressEnabled[activeHour] ? 1 : 0.5 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => {
                        setExpressEnabled((prev) => {
                          const next = !prev[activeHour];
                          if (
                            next &&
                            !expressZonesByHour[activeHour]?.length &&
                            periodicZonesByHour[activeHour]?.length
                          ) {
                            setExpressZonesByHour((z) => ({
                              ...z,
                              [activeHour]: [
                                ...(periodicZonesByHour[activeHour] || []),
                              ],
                            }));
                          }
                          return { ...prev, [activeHour]: next };
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          expressEnabled[activeHour] && styles.checkboxActive,
                        ]}
                      >
                        {expressEnabled[activeHour] && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.checkboxLabel,
                          expressEnabled[activeHour] && { color: "#10b981" },
                        ]}
                      >
                        Livraison express · {activeHour}
                      </Text>
                    </TouchableOpacity>

                    {expressEnabled[activeHour] && (
                      <>
                        {expressZonesByHour[activeHour]?.length > 0 && (
                          <View style={styles.chipsRow}>
                            {expressZonesByHour[activeHour].map((z, idx) => (
                              <TouchableOpacity
                                key={idx}
                                onPress={() => {
                                  setExpressDraft({
                                    lieu: z.lieu,
                                    prix: z.prix,
                                  });
                                  setExpressEditIdx(idx);
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Ionicons
                                    name="flash"
                                    size={12}
                                    color="#10b981"
                                  />
                                  <Text
                                    style={[
                                      styles.chipText,
                                      expressEditIdx === idx &&
                                        styles.chipTextActive,
                                    ]}
                                  >
                                    {z.lieu}
                                    {z.prix ? ` · ${z.prix}` : ""}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.input, { flex: 1.4, height: 42 }]}
                            value={expressDraft.lieu}
                            onChangeText={(t) =>
                              setExpressDraft({ ...expressDraft, lieu: t })
                            }
                            placeholder="Localisation"
                            placeholderTextColor="#cbd5e1"
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, height: 42 }]}
                            value={expressDraft.prix}
                            onChangeText={(t) =>
                              setExpressDraft({ ...expressDraft, prix: t })
                            }
                            keyboardType="numeric"
                            placeholder="Prix"
                            placeholderTextColor="#cbd5e1"
                          />
                          <TouchableOpacity
                            style={styles.smallBtn}
                            onPress={deleteExpress}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#dc3545"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.smallBtn,
                              { backgroundColor: "#ec4913" },
                            ]}
                            onPress={validateExpress}
                          >
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* Carte récupération à la boutique */}
            <View style={styles.pickupCard}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPickupAllowed(!pickupAllowed)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, pickupAllowed && styles.checkboxActive]}
                >
                  {pickupAllowed && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text
                  style={[
                    styles.checkboxLabel,
                    pickupAllowed && { color: "#10b981" },
                  ]}
                >
                  Le client peut passer à la boutique récupérer la commande
                </Text>
              </TouchableOpacity>
            </View>

            {/* Boutons navigation */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  { flex: 1, backgroundColor: "#64748b" },
                ]}
                onPress={() => setPage(1)}
              >
                <Ionicons name="arrow-back-outline" size={18} color="white" />
                <Text style={styles.createBtnText}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, { flex: 1 }]}
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
            </View>
          </ScrollView>
        )}
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

      {/* City Picker Modal */}
      {showCityPicker && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={90}
              tint="dark"
              style={styles.iosPickerContainer}
            >
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 8,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
                  >
                    Villes de livraison
                  </Text>
                  <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                    <Text style={{ color: "#ec4913", fontWeight: "bold" }}>
                      Terminer
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    height: 40,
                    color: "white",
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                  value={citySearch}
                  onChangeText={setCitySearch}
                  placeholder="Rechercher une ville…"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <ScrollView
                style={{ maxHeight: 320 }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingBottom: 16,
                }}
                keyboardShouldPersistTaps="handled"
              >
                {CAMEROON_CITIES.filter((city) =>
                  city.toLowerCase().includes(citySearch.toLowerCase()),
                ).map((city) => {
                  const isSelected = selectedCities.includes(city);
                  return (
                    <TouchableOpacity
                      key={city}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255,255,255,0.08)",
                      }}
                      onPress={() =>
                        setSelectedCities((prev) =>
                          prev.includes(city)
                            ? prev.filter((c) => c !== city)
                            : [...prev, city],
                        )
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxActive,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                      <Text style={{ color: "white", fontSize: 15 }}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </BlurView>
          </View>
        </Modal>
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

// Picker horaire en spinner
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
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {doneLabel}
          </Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  formRow: { flexDirection: "row" },
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
  timeInput: { justifyContent: "center" },
  timeText: { color: "#0f172a", fontSize: 13 },
  addHourRow: { flexDirection: "row", marginBottom: 12, gap: 6 },
  addButton: { justifyContent: "center", alignItems: "center" },
  deleteButton: { justifyContent: "center", alignItems: "center" },
  hourChip: {
    backgroundColor: "rgba(236,73,19,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hourChipActive: {
    backgroundColor: "#ec4913",
  },
  hourChipText: { color: "white", fontSize: 12, fontWeight: "bold" },
  emptyHoursText: {
    color: "#94a3b8",
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 2,
  },
  zoneBlock: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { borderColor: "#10b981", backgroundColor: "#10b981" },
  checkboxLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    flexShrink: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: { color: "#ec4913" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  smallBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  pickupCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  navRow: { flexDirection: "row", gap: 10, marginTop: 28 },
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
  createBtnText: { color: "white", fontSize: 15, fontWeight: "bold" },
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
  toastSuccess: { backgroundColor: Theme.colors.success || "#28a745" },
  toastError: { backgroundColor: Theme.colors.danger || "#dc3545" },
  toastText: { color: "white", fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
