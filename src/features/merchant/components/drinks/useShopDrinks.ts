import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

/**
 * Boisson de la BOUTIQUE (backend `fastfoods.drinks`, migration 062).
 * `menuIds: null` = proposée avec TOUS les plats (défaut) ; sinon ces plats seulement.
 */
export interface ShopDrink {
  id?: string;
  name: string;
  prix: number;
  status: boolean;
  menuIds: string[] | null;
}

/**
 * Charge et enregistre les boissons de la boutique du marchand connecté.
 * Écriture = liste COMPLÈTE via `POST /fastfood/:id` (`drinks`).
 */
export const useShopDrinks = () => {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;
  const [drinks, setDrinks] = useState<ShopDrink[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!fastFoodId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${Config.apiUrl}/fastfood/${fastFoodId}`);
      setDrinks(res.data?.data?.drinks || []);
      setDirty(false);
    } catch (e: any) {
      console.error("[useShopDrinks] chargement:", e?.message);
      Alert.alert("Erreur", "Impossible de charger les boissons de la boutique");
    } finally {
      setLoading(false);
    }
  }, [fastFoodId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Modifie la liste locale (enregistrée au `save`). */
  const update = (next: ShopDrink[]) => {
    setDrinks(next);
    setDirty(true);
  };

  const save = async () => {
    if (!fastFoodId) return;
    setSaving(true);
    try {
      const res = await axios.post(`${Config.apiUrl}/fastfood/${fastFoodId}`, { drinks });
      setDrinks(res.data?.data?.drinks || drinks);
      setDirty(false);
      Alert.alert("Boissons", "Boissons enregistrées");
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message;
      console.error("[useShopDrinks] enregistrement:", message);
      Alert.alert("Erreur", message || "Impossible d'enregistrer les boissons");
    } finally {
      setSaving(false);
    }
  };

  return { drinks, loading, saving, dirty, update, save };
};
