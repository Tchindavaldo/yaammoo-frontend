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
import { buildDeliveryPayload } from "@/src/features/merchant/services/buildDeliveryPayload";

// Hauteur approximative de la tab bar (navbar du bas) à réserver sous le contenu.
const TAB_BAR_HEIGHT = 60;

const { width, height } = Dimensions.get("window");

// Liste des principales villes du Cameroun
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
  const [momoNumber, setMomoNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState<string[]>([]);
  const [newHour, setNewHour] = useState("");
  // Heure dont on édite les lieux/prix (chip heure actif). null = aucune.
  const [activeHour, setActiveHour] = useState<string | null>(null);
  // Zones périodiques par heure
  const [periodicZonesByHour, setPeriodicZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  // Zones express par heure, préremplies depuis periodic
  const [expressZonesByHour, setExpressZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  // Périodique et Express activés par heure
  const [periodicEnabled, setPeriodicEnabled] = useState<
    Record<string, boolean>
  >({});
  const [expressEnabled, setExpressEnabled] = useState<Record<string, boolean>>(
    {},
  );
  // Drafts d'édition pour les deux blocs
  const [periodicDraft, setPeriodicDraft] = useState({ lieu: "", prix: "" });
  const [expressDraft, setExpressDraft] = useState({ lieu: "", prix: "" });
  const [periodicEditIdx, setPeriodicEditIdx] = useState<number | null>(null);
  const [expressEditIdx, setExpressEditIdx] = useState<number | null>(null);
  const [image, setImage] = useState<string>("");
  const [orderLeadTime, setOrderLeadTime] = useState("");
  const [advanceDays, setAdvanceDays] = useState("");
  const [pickupAllowed, setPickupAllowed] = useState(false);
  const [page, setPage] = useState(1);
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
            },
          );
          if (response.data?.data) {
            const data = response.data.data;
            setName(data.name || "");
            setNumber(data.number || "");
            setMomoNumber(data.momoNumber || "");
            setWhatsappNumber(data.whatsappNumber || "");
            setSelectedCities(data.cities || []);

            // Charger deliveryHours au nouveau format ou rétrocompatibilité
            const rawHours = data.deliveryHours || [];
            if (
              Array.isArray(rawHours) &&
              rawHours.length > 0 &&
              typeof rawHours[0] === "object"
            ) {
              // Nouveau format : [{ hour, periodic, periodicZones, express, expressZones }]
              const hours = rawHours.map((h: any) => h.hour).sort();
              setDeliveryHours(hours);
              const pEnabled: Record<string, boolean> = {};
              const eEnabled: Record<string, boolean> = {};
              const pZones: Record<string, any[]> = {};
              const eZones: Record<string, any[]> = {};
              rawHours.forEach((h: any) => {
                pEnabled[h.hour] = h.periodic === true;
                eEnabled[h.hour] = h.express === true;
                pZones[h.hour] = h.periodicZones || [];
                eZones[h.hour] = h.expressZones || [];
              });
              setPeriodicEnabled(pEnabled);
              setExpressEnabled(eEnabled);
              setPeriodicZonesByHour(pZones);
              setExpressZonesByHour(eZones);
            } else {
              // Ancien format : simple string[]
              setDeliveryHours(rawHours);
            }

            setImage(data.image || "");
            setOrderLeadTime(
              data.orderLeadTime !== undefined
                ? String(data.orderLeadTime)
                : "",
            );
            setAdvanceDays(
              data.advanceDays !== undefined ? String(data.advanceDays) : "",
            );
            setPickupAllowed(data.pickupAllowed === true);

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
    if (newHour && activeHour && newHour !== activeHour) {
      // Remplacer l'heure active
      const transferData = (prev: Record<string, any>) => {
        const next = { ...prev };
        if (next[activeHour]) {
          next[newHour] = next[activeHour];
          delete next[activeHour];
        }
        return next;
      };
      setDeliveryHours((prev) =>
        prev
          .filter((h) => h !== activeHour)
          .concat(newHour)
          .sort(),
      );
      setPeriodicZonesByHour(transferData);
      setExpressZonesByHour(transferData);
      setExpressEnabled((prev) => {
        const next = { ...prev };
        if (next[activeHour] !== undefined) {
          next[newHour] = next[activeHour];
          delete next[activeHour];
        }
        return next;
      });
    } else if (newHour && !deliveryHours.includes(newHour)) {
      // Nouvelle heure
      setDeliveryHours((prev) => [...prev, newHour].sort());
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
    if (activeHour === hour) {
      setActiveHour(null);
    }
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

    // Préremplir l'express si activé pour la première fois
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

  // ── Validation périodique ──
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
    // Préremplir express si vide
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

  const editPeriodic = (idx: number) => {
    if (!activeHour) return;
    const item = periodicZonesByHour[activeHour]?.[idx];
    if (!item) return;
    setPeriodicDraft({ lieu: item.lieu, prix: item.prix });
    setPeriodicEditIdx(idx);
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

  // ── Validation express ──
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

  const editExpress = (idx: number) => {
    if (!activeHour) return;
    const item = expressZonesByHour[activeHour]?.[idx];
    if (!item) return;
    setExpressDraft({ lieu: item.lieu, prix: item.prix });
    setExpressEditIdx(idx);
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

  // Toggle express pour une heure
  const toggleExpress = (hour: string) => {
    setExpressEnabled((prev) => {
      const next = !prev[hour];
      if (
        next &&
        !expressZonesByHour[hour]?.length &&
        periodicZonesByHour[hour]?.length
      ) {
        // Activer et préremplir depuis périodique
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
        momoNumber,
        whatsappNumber,
        cities: selectedCities,
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
        updateData,
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
      <View
        style={[styles.contentBg, { top: headerHeight }]}
        pointerEvents="none"
      />

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
                    <ActivityIndicator
                      size="large"
                      color={Theme.colors.primary}
                    />
                    <Text style={styles.loaderText}>
                      Chargement de la boutique…
                    </Text>
                  </View>
                ) : page === 1 ? (
                  // ── PAGE 1 : Infos générales (scroll + bouton fixe en bas) ──
                  <View style={{ flex: 1 }}>
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: 16 }}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {/* Avatar + Name row */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 14,
                        }}
                      >
                        <TouchableOpacity
                          onPress={pickImage}
                          style={styles.avatarCircle}
                        >
                          {image ? (
                            <Image
                              source={{ uri: image }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Ionicons
                              name="image-outline"
                              size={28}
                              color="#cbd5e1"
                            />
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

                      {/* Heures ouverture/fermeture sur une ligne */}
                      <View style={[styles.formRow, { marginTop: 10, gap: 6 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.floatingLabel}>Ouverture</Text>
                          <TouchableOpacity
                            style={[
                              styles.glassInput,
                              styles.timeInput,
                              { borderRadius: 20 },
                            ]}
                            onPress={() => setShowOpenPicker(true)}
                          >
                            <Text style={styles.timeText}>
                              {formatTime(openTime)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.floatingLabel}>Fermeture</Text>
                          <TouchableOpacity
                            style={[
                              styles.glassInput,
                              styles.timeInput,
                              { borderRadius: 20 },
                            ]}
                            onPress={() => setShowClosePicker(true)}
                          >
                            <Text style={styles.timeText}>
                              {formatTime(closeTime)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Numéros de contact sur une ligne */}
                      <View style={[styles.formRow, { marginTop: 15, gap: 6 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.floatingLabel}>OM</Text>
                          <TextInput
                            style={[styles.glassInput, { borderRadius: 20 }]}
                            value={number}
                            onChangeText={setNumber}
                            keyboardType="numeric"
                            placeholder="Orange Money"
                            placeholderTextColor="#cbd5e1"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.floatingLabel}>MOMO</Text>
                          <TextInput
                            style={[styles.glassInput, { borderRadius: 20 }]}
                            value={momoNumber}
                            onChangeText={setMomoNumber}
                            keyboardType="numeric"
                            placeholder="MTN Mobile Money"
                            placeholderTextColor="#cbd5e1"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.floatingLabel}>WhatsApp</Text>
                          <TextInput
                            style={[styles.glassInput, { borderRadius: 20 }]}
                            value={whatsappNumber}
                            onChangeText={setWhatsappNumber}
                            keyboardType="numeric"
                            placeholder="WhatsApp"
                            placeholderTextColor="#cbd5e1"
                          />
                        </View>
                      </View>

                      {/* Localisation - Villes */}
                      <View style={[styles.inputGroup, { marginTop: 15 }]}>
                        <Text style={styles.floatingLabel}>
                          Localisation
                          {selectedCities.length > 0
                            ? ` (${selectedCities.length})`
                            : ""}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.glassInput,
                            {
                              borderRadius: 20,
                              minHeight: 46,
                              justifyContent: "center",
                              paddingVertical: 10,
                            },
                          ]}
                          onPress={() => setShowCityPicker(true)}
                        >
                          {selectedCities.length > 0 ? (
                            <Text
                              style={{ color: "#334155", fontSize: 14 }}
                              numberOfLines={2}
                            >
                              {selectedCities.join(", ")}
                            </Text>
                          ) : (
                            <Text style={{ color: "#cbd5e1", fontSize: 14 }}>
                              Sélectionner les villes de livraison
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Délai livraison */}
                      <View style={[styles.inputGroup, { marginTop: 15 }]}>
                        <Text style={styles.floatingLabel}>
                          Délai livraison (minutes)
                        </Text>
                        <Text style={styles.helperText}>
                          Les clients ne pourront plus commander X minutes avant
                          l'heure de livraison
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

                      {/* Jours en avance */}
                      <View style={[styles.inputGroup, { marginTop: 15 }]}>
                        <Text style={styles.floatingLabel}>
                          Jours en avance
                        </Text>
                        <Text style={styles.helperText}>
                          Nombre de jours à l'avance qu'un client peut commander
                          (ex: 3 = aujourd'hui, demain, après-demain)
                        </Text>
                        <TextInput
                          style={[styles.glassInput, { borderRadius: 20 }]}
                          value={advanceDays}
                          onChangeText={setAdvanceDays}
                          keyboardType="numeric"
                          placeholder="ex: 3"
                          placeholderTextColor="#cbd5e1"
                        />
                      </View>
                    </ScrollView>

                    {/* Bouton Suivant fixe en bas */}
                    <TouchableOpacity
                      style={[styles.updateBtn, { marginTop: 16 }]}
                      onPress={() => setPage(2)}
                    >
                      <Text style={styles.updateBtnText}>Suivant</Text>
                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color="white"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  // ── PAGE 2 : Livraison (heures + zones) ──
                  <>
                    {/* Delivery Section */}
                    <View style={[styles.inputGroup, { marginTop: 20 }]}>
                      {/* Ligne label "Livraison" + ×N + chips heures (scroll horizontal) */}
                      <View style={styles.chipHeaderRow}>
                        <Text
                          style={[styles.floatingLabel, { marginBottom: 0 }]}
                        >
                          Livraison
                        </Text>
                        {deliveryHours.length > 0 && (
                          <Text style={styles.itemCountText}>
                            ×{deliveryHours.length}
                          </Text>
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
                                {i > 0 && (
                                  <Text style={styles.chipSeparator}>·</Text>
                                )}
                                <TouchableOpacity
                                  onPress={() => selectHour(hour)}
                                >
                                  <Text
                                    style={[
                                      styles.itemChipText,
                                      activeHour === hour &&
                                        styles.itemChipTextActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {hour}
                                    {periodicZonesByHour[hour]?.length &&
                                    expressEnabled[hour]
                                      ? ` (${periodicZonesByHour[hour].length + (expressZonesByHour[hour]?.length || 0)})`
                                      : periodicZonesByHour[hour]?.length
                                        ? ` (${periodicZonesByHour[hour].length})`
                                        : ""}
                                  </Text>
                                </TouchableOpacity>
                              </React.Fragment>
                            ))}
                          </ScrollView>
                        )}
                      </View>

                      {/* Ligne d'édition heure : time picker + supprimer + valider */}
                      <View style={styles.editRow}>
                        <TouchableOpacity
                          style={[
                            styles.glassInput,
                            styles.timeInput,
                            styles.editInput,
                            { flex: 1 },
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
                            style={styles.actionBtn}
                            onPress={() => removeDeliveryHour(activeHour)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#dc3545"
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            styles.validateBtn,
                            {
                              opacity: newHour || activeHour ? 1 : 0.5,
                            },
                          ]}
                          onPress={addDeliveryHour}
                          disabled={!newHour && !activeHour}
                        >
                          <Ionicons name="checkmark" size={18} color="white" />
                        </TouchableOpacity>
                      </View>

                      {deliveryHours.length === 0 && (
                        <Text style={styles.emptyHoursText}>
                          Aucune heure configurée (optionnel)
                        </Text>
                      )}

                      {/* Blocs Lieux/Prix de l'heure active : périodique + express */}
                      {activeHour && (
                        <>
                          {/* ── Bloc Livraison périodique ── */}
                          <View
                            style={[
                              styles.zoneBlock,
                              {
                                opacity: periodicEnabled[activeHour] ? 1 : 0.5,
                              },
                            ]}
                          >
                            {/* Checkbox pour activer le périodique */}
                            <TouchableOpacity
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10,
                              }}
                              onPress={() =>
                                setPeriodicEnabled((prev) => ({
                                  ...prev,
                                  [activeHour]: !prev[activeHour],
                                }))
                              }
                              activeOpacity={0.7}
                            >
                              <View
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  borderWidth: 2,
                                  borderColor: periodicEnabled[activeHour]
                                    ? "#10b981"
                                    : "#cbd5e1",
                                  backgroundColor: periodicEnabled[activeHour]
                                    ? "#10b981"
                                    : "transparent",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {periodicEnabled[activeHour] && (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color="white"
                                  />
                                )}
                              </View>
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: periodicEnabled[activeHour]
                                    ? "#10b981"
                                    : "#64748b",
                                  fontWeight: "600",
                                }}
                              >
                                Livraison périodique · {activeHour}
                              </Text>
                            </TouchableOpacity>

                            {periodicEnabled[activeHour] && (
                              <View style={styles.chipHeaderRow}>
                                {periodicZonesByHour[activeHour]?.length ? (
                                  <Text style={styles.itemCountText}>
                                    ×{periodicZonesByHour[activeHour].length}
                                  </Text>
                                ) : null}
                                {periodicZonesByHour[activeHour]?.length ? (
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.chipScroll}
                                    contentContainerStyle={
                                      styles.chipScrollContent
                                    }
                                    keyboardShouldPersistTaps="handled"
                                  >
                                    {periodicZonesByHour[activeHour].map(
                                      (z, idx) => (
                                        <React.Fragment key={idx}>
                                          {idx > 0 && (
                                            <Text style={styles.chipSeparator}>
                                              ·
                                            </Text>
                                          )}
                                          <TouchableOpacity
                                            onPress={() => editPeriodic(idx)}
                                          >
                                            <Text
                                              style={[
                                                styles.itemChipText,
                                                periodicEditIdx === idx &&
                                                  styles.itemChipTextActive,
                                              ]}
                                              numberOfLines={1}
                                            >
                                              {z.lieu}
                                              {z.prix ? ` · ${z.prix}` : ""}
                                            </Text>
                                          </TouchableOpacity>
                                        </React.Fragment>
                                      ),
                                    )}
                                  </ScrollView>
                                ) : null}
                              </View>
                            )}

                            {periodicEnabled[activeHour] && (
                              <View style={styles.editRow}>
                                <TextInput
                                  style={[
                                    styles.glassInput,
                                    styles.editInput,
                                    { flex: 1.4 },
                                  ]}
                                  value={periodicDraft.lieu}
                                  onChangeText={(t) =>
                                    setPeriodicDraft({
                                      ...periodicDraft,
                                      lieu: t,
                                    })
                                  }
                                  placeholder="Localisation"
                                  placeholderTextColor="#cbd5e1"
                                />
                                <TextInput
                                  style={[
                                    styles.glassInput,
                                    styles.editInput,
                                    { flex: 1 },
                                  ]}
                                  value={periodicDraft.prix}
                                  onChangeText={(t) =>
                                    setPeriodicDraft({
                                      ...periodicDraft,
                                      prix: t,
                                    })
                                  }
                                  keyboardType="numeric"
                                  placeholder="Prix"
                                  placeholderTextColor="#cbd5e1"
                                />
                                <TouchableOpacity
                                  style={styles.actionBtn}
                                  onPress={deletePeriodic}
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={18}
                                    color="#dc3545"
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.actionBtn, styles.validateBtn]}
                                  onPress={validatePeriodic}
                                >
                                  <Ionicons
                                    name="checkmark"
                                    size={18}
                                    color="white"
                                  />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>

                          {/* ── Bloc Livraison express ── */}
                          <View
                            style={[
                              styles.zoneBlock,
                              { opacity: expressEnabled[activeHour] ? 1 : 0.5 },
                            ]}
                          >
                            {/* Checkbox pour activer l'express */}
                            <TouchableOpacity
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10,
                              }}
                              onPress={() => toggleExpress(activeHour)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  borderWidth: 2,
                                  borderColor: expressEnabled[activeHour]
                                    ? "#10b981"
                                    : "#cbd5e1",
                                  backgroundColor: expressEnabled[activeHour]
                                    ? "#10b981"
                                    : "transparent",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {expressEnabled[activeHour] && (
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color="white"
                                  />
                                )}
                              </View>
                              <Text
                                style={{
                                  fontSize: 13,
                                  color: expressEnabled[activeHour]
                                    ? "#10b981"
                                    : "#64748b",
                                  fontWeight: "600",
                                }}
                              >
                                Livraison express · {activeHour}
                              </Text>
                            </TouchableOpacity>

                            {expressEnabled[activeHour] && (
                              <>
                                <View style={styles.chipHeaderRow}>
                                  {expressZonesByHour[activeHour]?.length ? (
                                    <Text style={styles.itemCountText}>
                                      ×{expressZonesByHour[activeHour].length}
                                    </Text>
                                  ) : null}
                                  {expressZonesByHour[activeHour]?.length ? (
                                    <ScrollView
                                      horizontal
                                      showsHorizontalScrollIndicator={false}
                                      style={styles.chipScroll}
                                      contentContainerStyle={
                                        styles.chipScrollContent
                                      }
                                      keyboardShouldPersistTaps="handled"
                                    >
                                      {expressZonesByHour[activeHour].map(
                                        (z, idx) => (
                                          <React.Fragment key={idx}>
                                            {idx > 0 && (
                                              <Text
                                                style={styles.chipSeparator}
                                              >
                                                ·
                                              </Text>
                                            )}
                                            <TouchableOpacity
                                              onPress={() => editExpress(idx)}
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
                                                    styles.itemChipText,
                                                    expressEditIdx === idx &&
                                                      styles.itemChipTextActive,
                                                  ]}
                                                  numberOfLines={1}
                                                >
                                                  {z.lieu}
                                                  {z.prix ? ` · ${z.prix}` : ""}
                                                </Text>
                                              </View>
                                            </TouchableOpacity>
                                          </React.Fragment>
                                        ),
                                      )}
                                    </ScrollView>
                                  ) : null}
                                </View>

                                <View style={styles.editRow}>
                                  <TextInput
                                    style={[
                                      styles.glassInput,
                                      styles.editInput,
                                      { flex: 1.4 },
                                    ]}
                                    value={expressDraft.lieu}
                                    onChangeText={(t) =>
                                      setExpressDraft({
                                        ...expressDraft,
                                        lieu: t,
                                      })
                                    }
                                    placeholder="Localisation"
                                    placeholderTextColor="#cbd5e1"
                                  />
                                  <TextInput
                                    style={[
                                      styles.glassInput,
                                      styles.editInput,
                                      { flex: 1 },
                                    ]}
                                    value={expressDraft.prix}
                                    onChangeText={(t) =>
                                      setExpressDraft({
                                        ...expressDraft,
                                        prix: t,
                                      })
                                    }
                                    keyboardType="numeric"
                                    placeholder="Prix"
                                    placeholderTextColor="#cbd5e1"
                                  />
                                  <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={deleteExpress}
                                  >
                                    <Ionicons
                                      name="trash-outline"
                                      size={18}
                                      color="#dc3545"
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.actionBtn,
                                      styles.validateBtn,
                                    ]}
                                    onPress={validateExpress}
                                  >
                                    <Ionicons
                                      name="checkmark"
                                      size={18}
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
                    <View
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: 14,
                        padding: 14,
                        marginTop: 16,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                        onPress={() => setPickupAllowed(!pickupAllowed)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: pickupAllowed ? "#10b981" : "#cbd5e1",
                            backgroundColor: pickupAllowed
                              ? "#10b981"
                              : "transparent",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {pickupAllowed && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="white"
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 13,
                            color: pickupAllowed ? "#10b981" : "#475569",
                            fontWeight: "600",
                            flexShrink: 1,
                          }}
                        >
                          Le client peut passer à la boutique récupérer la
                          commande
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Boutons navigation */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 10,
                        marginTop: 28,
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.updateBtn,
                          {
                            flex: 1,
                            backgroundColor: "#64748b",
                          },
                        ]}
                        onPress={() => setPage(1)}
                      >
                        <Ionicons
                          name="arrow-back-outline"
                          size={18}
                          color="white"
                        />
                        <Text style={styles.updateBtnText}>Retour</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.updateBtn, { flex: 1 }]}
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
                            <Text style={styles.updateBtnText}>
                              Mettre à jour
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
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

      {/* City Picker Modal */}
      {showCityPicker && (
        <Modal transparent={true} visible={true} animationType="fade">
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
                      onPress={() => {
                        setSelectedCities((prev) =>
                          prev.includes(city)
                            ? prev.filter((c) => c !== city)
                            : [...prev, city],
                        );
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: isSelected ? "#10b981" : "#64748b",
                          backgroundColor: isSelected
                            ? "#10b981"
                            : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
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
