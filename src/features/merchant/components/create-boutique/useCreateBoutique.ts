import { useState } from "react";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { Config } from "@/src/api/config";
import {
  uploadImageToServer,
  isLocalUri,
} from "@/src/features/merchant/services/uploadImage";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { buildDeliveryPayload } from "@/src/features/merchant/services/buildDeliveryPayload";
import { useToast } from "./useToast";

export type { Zone } from "./parseBoutique";

/**
 * Etat + logique du panneau de CREATION de boutique (zones de livraison par
 * heure, upload image, POST /fastFood). Le rendu est fait par
 * CreateBoutiquePanel et ses sous-composants.
 *
 * Copie dediee de `useEditBoutique` (R16 : on duplique, on ne partage pas).
 * Deux differences de fond avec l'edition :
 *  - aucun chargement initial (rien a lire, la boutique n'existe pas encore) ;
 *  - `handleCreate` fait un POST /fastFood et arme `fastFoodId` / `isMarchand`
 *    sur le user, la ou l'edition PUT une boutique deja connue.
 */
export const useCreateBoutique = ({ onCancel }: { onCancel: () => void }) => {
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(70);

  // Infos boutique
  const [name, setName] = useState("");
  const [openTime, setOpenTime] = useState(new Date());
  const [closeTime, setCloseTime] = useState(new Date());
  const [number, setNumber] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [image, setImage] = useState<string>("");
  const [orderLeadTime, setOrderLeadTime] = useState("");
  const [advanceDays, setAdvanceDays] = useState("");
  const [pickupAllowed, setPickupAllowed] = useState(false);

  // Livraison
  const [deliveryHours, setDeliveryHours] = useState<string[]>([]);
  const [newHour, setNewHour] = useState("");
  /** Heure dont on edite les lieux/prix. null = aucune. */
  const [activeHour, setActiveHour] = useState<string | null>(null);
  /** true = vue « toutes les heures » dans le sheet de consultation. */
  const [viewAllHours, setViewAllHours] = useState(true);
  /** true = formulaire d'ajout/edition visible (ouvert par « + » ou par un clic). */
  const [showEditForm, setShowEditForm] = useState(false);
  const [formPeriodic, setFormPeriodic] = useState(true);
  const [formExpress, setFormExpress] = useState(false);
  const [periodicZonesByHour, setPeriodicZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  const [expressZonesByHour, setExpressZonesByHour] = useState<
    Record<string, { lieu: string; prix: string }[]>
  >({});
  const [periodicEnabled, setPeriodicEnabled] = useState<
    Record<string, boolean>
  >({});
  const [expressEnabled, setExpressEnabled] = useState<Record<string, boolean>>(
    {},
  );
  const [periodicDraft, setPeriodicDraft] = useState({ lieu: "", prix: "" });
  const [expressDraft, setExpressDraft] = useState({ lieu: "", prix: "" });
  const [periodicEditIdx, setPeriodicEditIdx] = useState<number | null>(null);
  const [expressEditIdx, setExpressEditIdx] = useState<number | null>(null);
  const [tempDeliveryTime, setTempDeliveryTime] = useState(new Date());

  // Pickers
  const [showOpenPicker, setShowOpenPicker] = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { toastVisible, toastConfig, toastAnimY, showToast } = useToast();

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const deletePeriodic = () => {
    if (!activeHour || periodicEditIdx === null) return;
    setPeriodicZonesByHour((prev) => ({
      ...prev,
      [activeHour]: (prev[activeHour] || []).filter(
        (_, i) => i !== periodicEditIdx,
      ),
    }));
    setPeriodicDraft({ lieu: "", prix: "" });
    setPeriodicEditIdx(null);
  };

  const deleteExpress = () => {
    if (!activeHour || expressEditIdx === null) return;
    setExpressZonesByHour((prev) => ({
      ...prev,
      [activeHour]: (prev[activeHour] || []).filter(
        (_, i) => i !== expressEditIdx,
      ),
    }));
    setExpressDraft({ lieu: "", prix: "" });
    setExpressEditIdx(null);
  };

  /**
   * Enregistre le lieu saisi dans les listes periodique et/ou express selon les
   * cases cochees. `hour` = heure cible (activeHour en edition, newHour en ajout).
   */
  const saveZoneForm = (hour: string) => {
    if (!hour) return;
    const lieu = (periodicDraft.lieu || expressDraft.lieu).trim();
    if (!lieu) return;

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

  const handleCreate = async () => {
    if (!name || !number) {
      showToast("Veuillez remplir les champs obligatoires", "error");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = "";
      if (image) {
        imageUrl = isLocalUri(image) ? await uploadImageToServer(image) : image;
      }

      const response = await axios.post(`${Config.apiUrl}/fastFood`, {
        name,
        openTime: formatTime(openTime),
        closeTime: formatTime(closeTime),
        userId: userData?.uid,
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

  return {
    // etat general
    loading,
    headerHeight,
    setHeaderHeight,
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
    handleCreate,
    closeModal: onCancel,
  };
};
