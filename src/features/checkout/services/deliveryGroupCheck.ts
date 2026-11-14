import axios from "axios";
import { Config } from "@/src/api/config";

/**
 * Groupage — `GET /order/delivery-group/:userId` : le client a-t-il déjà payé
 * une commande pour ce départ (boutique + zone + type + date [+ créneau]) pas
 * encore parti ? Oui => la course de la nouvelle commande est offerte.
 * Erreur réseau : `false` (course facturée, le backend tranche au paiement).
 */
export interface DeliveryProbe {
  fastFoodId: string;
  zone: string;
  type: "time" | "express";
  date: string;
  time?: string;
}

export const checkDeliveryGroup = async (userId: string, probe: DeliveryProbe): Promise<boolean> => {
  try {
    const { data } = await axios.get(`${Config.apiUrl}/order/delivery-group/${userId}`, { params: probe });
    return data?.data?.grouped === true;
  } catch {
    return false;
  }
};
