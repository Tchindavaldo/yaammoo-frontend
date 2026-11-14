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

/** Départ déjà payé et pas encore parti (même découpage que `DeliveryProbe`). */
export interface PaidDeparture {
  zone: string;
  type: "time" | "express";
  date: string | null;
  time: string | null;
}

/** Départs déjà payés et pas encore partis de cette boutique. Erreur : []. */
export const fetchPaidDepartures = async (userId: string, fastFoodId: string): Promise<PaidDeparture[]> => {
  try {
    const { data } = await axios.get(`${Config.apiUrl}/order/delivery-group/${userId}`, { params: { fastFoodId } });
    return Array.isArray(data?.data?.departures) ? data.data.departures : [];
  } catch {
    return [];
  }
};

const norm = (v?: string | null) => String(v ?? "").trim().toLowerCase();

/** Ce départ (zone, type, date [, heure]) est-il déjà payé ? Même clé que le backend. */
export const isPaidDeparture = (list: PaidDeparture[], probe: DeliveryProbe | null): boolean =>
  !!probe &&
  list.some(
    d =>
      norm(d.zone) === norm(probe.zone) &&
      d.type === probe.type &&
      String(d.date ?? "") === String(probe.date ?? "") &&
      (probe.type !== "time" || String(d.time ?? "").trim() === String(probe.time ?? "").trim()),
  );
