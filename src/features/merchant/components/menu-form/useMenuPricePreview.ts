import { useEffect, useState } from "react";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";

/** Réponse de `GET /menu/price-preview/:fastFoodId?price=` (calcul 100 % serveur). */
export interface MenuPricePreview {
  price: number;
  displayedPrice: number;
  withdrawalFee: number;
  merchantReceives: number;
  accepted: boolean;
  message: string | null;
}

const DEBOUNCE_MS = 400;

/**
 * Aperçu d'un prix saisi : prix affiché au client, frais de retrait, montant
 * reçu et verdict du garde-fou. Rien n'est recalculé dans l'app (R23) : on
 * relaie la réponse du backend, avec un debounce pendant la frappe.
 */
export function useMenuPricePreview(rawPrice: string) {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;
  const price = Number(rawPrice);
  const valid = Number.isFinite(price) && price > 0;

  const [preview, setPreview] = useState<MenuPricePreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!valid || !fastFoodId) {
      setPreview(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      axios
        .get(`${Config.apiUrl}/menu/price-preview/${fastFoodId}`, { params: { price } })
        .then((res) => {
          if (!cancelled) setPreview(res.data?.data ?? null);
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [price, valid, fastFoodId]);

  return { preview: valid ? preview : null, loading: valid && loading };
}
