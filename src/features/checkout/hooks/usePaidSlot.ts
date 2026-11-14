import { useAuth } from "@/src/features/auth/context/AuthContext";
import { cachedPaidDepartures, DeliveryProbe, isPaidDeparture } from "../services/deliveryGroupCheck";

/**
 * Groupage dans les listes de zones / créneaux : ce départ (lu au toucher de la
 * carte qui a ouvert la liste) est-il déjà payé et pas encore parti ?
 */
export const usePaidSlot = (fastFoodId?: string | null) => {
  const { userData } = useAuth();
  const list = cachedPaidDepartures(userData?.uid, fastFoodId);
  return (probe: Omit<DeliveryProbe, "fastFoodId">) => !!fastFoodId && isPaidDeparture(list, { ...probe, fastFoodId });
};
