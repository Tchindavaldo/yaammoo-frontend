// Boutiques supprimees avec le compte, restaurables (GET /shop-restore). A
// l'ouverture de la creation : s'il y en a, la sheet propose de restaurer ou de
// continuer la creation d'une nouvelle boutique.
import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";
import { apiErrorMessage } from "@/src/api/apiError";

export interface RestorableShop {
  id: string;
  name: string;
  image?: string | null;
  deletedAt: string;
}

export function useRestorableShops() {
  const { userData, setUserData } = useAuth();
  const [shops, setShops] = useState<RestorableShop[]>([]);
  const [open, setOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${Config.apiUrl}/shop-restore`)
      .then(({ data }) => {
        const list: RestorableShop[] = data?.data || [];
        setShops(list);
        setOpen(list.length > 0);
      })
      .catch(e => console.warn("Boutiques restaurables non chargees:", e));
  }, []);

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      await axios.post(`${Config.apiUrl}/shop-restore/${id}`);
      setOpen(false);
      showToast(t("Votre boutique a été restaurée"), "success");
      // fastFoodId pose : la page de creation repart vers le home marchand.
      if (userData) setUserData({ ...userData, fastFoodId: id, isMarchand: true });
    } catch (e: any) {
      showToast(apiErrorMessage(e) || t("Restauration impossible"), "error");
    } finally {
      setRestoringId(null);
    }
  };

  return { shops, open, close: () => setOpen(false), restore, restoringId };
}
