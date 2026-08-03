import { useState, useEffect } from "react";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { Config } from "@/src/api/config";
import {
  uploadImageToServer,
  isLocalUri,
} from "@/src/features/merchant/services/uploadImage";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { buildDeliveryPayload } from "@/src/features/merchant/services/buildDeliveryPayload";
import { parseDeliveryHours, hourToDate } from "./parseBoutique";
import { useToast } from "./useToast";
import { useEntryAnimation } from "./useEntryAnimation";

export type { Zone } from "./parseBoutique";

/**
 * Etat + logique du panneau d'edition de boutique (chargement, zones de
 * livraison par heure, upload image, sauvegarde). Le rendu est fait par
 * EditBoutiquePanel et ses sous-composants.
 */
export const useEditBoutique = ({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const { userData } = useAuth();
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
  // true = vue "toutes les heures" : liste les zones de chaque heure avec heure/zone/prix
  const [viewAllHours, setViewAllHours] = useState(true);
  // true = formulaire d'ajout/édition visible (ouvert par "+" ou clic sur une ligne)
  const [showEditForm, setShowEditForm] = useState(false);
  // Cases cochées dans le bottom sheet (indépendantes de l'heure pour l'ajout)
  const [formPeriodic, setFormPeriodic] = useState(true);
  const [formExpress, setFormExpress] = useState(false);
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

  const { setIsEntering, resetAnims } = useEntryAnimation(visible);
  const { toastVisible, toastConfig, toastAnimY, showToast } = useToast();

  // Load boutique data when visible
  useEffect(() => {
    if (!visible || !userData?.fastFoodId) return;
    const loadBoutiqueData = async () => {
      setLoadingData(true);
      try {
        const response = await axios.get(
          `${Config.apiUrl}/fastfood/${userData.fastFoodId}`,
          { headers: { "ngrok-skip-browser-warning": "true" } },
        );
        const data = response.data?.data;
        if (!data) return;

        setName(data.name || "");
        setNumber(data.number || "");
        setMomoNumber(data.momoNumber || "");
        setWhatsappNumber(data.whatsappNumber || "");
        setSelectedCities(data.cities || []);
        setImage(data.image || "");
        setOrderLeadTime(
          data.orderLeadTime !== undefined ? String(data.orderLeadTime) : "",
        );
        setAdvanceDays(
          data.advanceDays !== undefined ? String(data.advanceDays) : "",
        );
        setPickupAllowed(data.pickupAllowed === true);

        const parsed = parseDeliveryHours(data.deliveryHours || []);
        setDeliveryHours(parsed.hours);
        setPeriodicEnabled(parsed.periodicEnabled);
        setExpressEnabled(parsed.expressEnabled);
        setPeriodicZonesByHour(parsed.periodicZones);
        setExpressZonesByHour(parsed.expressZones);
        if (parsed.firstHour) {
          setActiveHour(parsed.firstHour);
          setViewAllHours(false);
          setNewHour(parsed.firstHour);
          setTempDeliveryTime(hourToDate(parsed.firstHour));
          if (parsed.periodicDraft) setPeriodicDraft(parsed.periodicDraft);
          if (parsed.expressDraft) setExpressDraft(parsed.expressDraft);
        }

        if (data.openTime) setOpenTime(hourToDate(data.openTime));
        if (data.closeTime) setCloseTime(hourToDate(data.closeTime));
      } catch (error) {
        console.error("Error loading boutique data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    loadBoutiqueData();
  }, [visible, userData?.fastFoodId]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // ── Suppression de la zone periodique en cours d'edition ──
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

  // ── Suppression de la zone express en cours d'edition ──
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

  // Enregistre le lieu saisi dans les listes périodique et/ou express selon les cases cochées.
  // `hour` = l'heure cible (activeHour pour une édition, ou newHour pour un ajout).
  const saveZoneForm = (hour: string) => {
    if (!hour) return;
    const lieu = (periodicDraft.lieu || expressDraft.lieu).trim();
    if (!lieu) return;

    // Ajouter l'heure si elle n'existe pas encore (ajout depuis "+")
    if (!deliveryHours.includes(hour)) {
      setDeliveryHours((prev) => [...prev, hour].sort());
    }

    if (formPeriodic) {
      const item = { lieu, prix: periodicDraft.prix.trim() };
      setPeriodicZonesByHour((prev) => {
        const list = prev[hour] ? [...prev[hour]] : [];
        if (periodicEditIdx === null) list.push(item);
        else list[periodicEditIdx] = item;
        return { ...prev, [hour]: list };
      });
      setPeriodicEnabled((prev) => ({ ...prev, [hour]: true }));
    }
    if (formExpress) {
      const item = { lieu, prix: expressDraft.prix.trim() };
      setExpressZonesByHour((prev) => {
        const list = prev[hour] ? [...prev[hour]] : [];
        if (expressEditIdx === null) list.push(item);
        else list[expressEditIdx] = item;
        return { ...prev, [hour]: list };
      });
      setExpressEnabled((prev) => ({ ...prev, [hour]: true }));
    }

    setPeriodicDraft({ lieu: "", prix: "" });
    setExpressDraft({ lieu: "", prix: "" });
    setPeriodicEditIdx(null);
    setExpressEditIdx(null);
    setActiveHour(null);
    setNewHour("");
    setShowEditForm(false);
    setViewAllHours(true);
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

  return {
    // etat general
    loading,
    loadingData,
    headerHeight,
    setHeaderHeight,
    page,
    setPage,
    // infos boutique
    name,
    setName,
    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,
    number,
    setNumber,
    momoNumber,
    setMomoNumber,
    whatsappNumber,
    setWhatsappNumber,
    selectedCities,
    setSelectedCities,
    citySearch,
    setCitySearch,
    showCityPicker,
    setShowCityPicker,
    image,
    orderLeadTime,
    setOrderLeadTime,
    advanceDays,
    setAdvanceDays,
    pickupAllowed,
    setPickupAllowed,
    // livraison
    deliveryHours,
    newHour,
    setNewHour,
    activeHour,
    setActiveHour,
    viewAllHours,
    setViewAllHours,
    showEditForm,
    setShowEditForm,
    formPeriodic,
    setFormPeriodic,
    formExpress,
    setFormExpress,
    periodicZonesByHour,
    expressZonesByHour,
    periodicEnabled,
    expressEnabled,
    periodicDraft,
    setPeriodicDraft,
    expressDraft,
    setExpressDraft,
    setPeriodicEditIdx,
    setExpressEditIdx,
    tempDeliveryTime,
    setTempDeliveryTime,
    // pickers
    showOpenPicker,
    setShowOpenPicker,
    showClosePicker,
    setShowClosePicker,
    showTimePicker,
    setShowTimePicker,
    // toast
    toastVisible,
    toastConfig,
    toastAnimY,
    // actions
    formatTime,
    deletePeriodic,
    deleteExpress,
    saveZoneForm,
    pickImage,
    handleUpdate,
    closeModal,
  };
};
