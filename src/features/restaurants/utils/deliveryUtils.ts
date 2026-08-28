import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Extrait le string "HH:MM" depuis un item du nouveau format ou le retourne tel quel.
 */
const extractHour = (item: any): string => {
  if (typeof item === "string") return item;
  if (item && typeof item.hour === "string") return item.hour;
  return "";
};

/**
 * Récupère l'heure de livraison la plus proche.
 * Supporte les deux formats : string[] ou DeliveryHourPayload[].
 *
 * @param deliveryHours - Array d'heures (format "HH:MM") ou d'objets { hour, ... }
 * @param orderLeadTime - Délai avant de pouvoir commander (en minutes)
 * @returns L'heure la plus proche au format "HHh" (ex: "12h", "13h")
 */
export const getNextDeliveryTime = (
  deliveryHours?: any[],
  orderLeadTime: number = 0,
): string => {
  // Heures par défaut si aucune heure n'est fournie
  const defaultHours = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"];
  const raw =
    deliveryHours && deliveryHours.length > 0 ? deliveryHours : defaultHours;
  const hours = raw.map(extractHour).filter(Boolean);

  if (hours.length === 0) {
    const [h] = defaultHours[0].split(":");
    return `${h}h`;
  }

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Trouver la première heure valide (après orderLeadTime)
  let closestHour: string | null = null;

  for (const hour of hours) {
    const [hoursStr, minutesStr] = hour.split(":");
    const hourValue = parseInt(hoursStr, 10);
    const minuteValue = parseInt(minutesStr, 10);
    const hourTotalMinutes = hourValue * 60 + minuteValue;

    // L'heure est valide si : hourTime - orderLeadTime > currentTime
    const cutoffTime = hourTotalMinutes - orderLeadTime;

    if (currentTotalMinutes < cutoffTime) {
      closestHour = hour;
      break;
    }
  }

  // Si aucun créneau du jour n'est encore valide (tous passés),
  // on repart sur le PREMIER créneau — soit demain. Afficher la dernière
  // heure du jour (déjà passée) serait incohérent avec l'heure actuelle.
  if (!closestHour) {
    closestHour = hours[0];
  }

  // Convertir format "HH:MM" à "HHh" (ex: "12:00" → "12h")
  const [hoursStr] = closestHour.split(":");
  return `${hoursStr}h`;
};

/**
 * Temps restant AVANT la fermeture des commandes du prochain créneau, en
 * minutes. La limite est `heure du créneau - orderLeadTime` : passé ce point,
 * le créneau bascule sur le suivant.
 *
 * Renvoie `null` si aucun créneau du jour n'est encore ouvert (report à demain,
 * un décompte n'aurait plus de sens).
 */
export const getOrderCutoffMinutes = (
  deliveryHours?: any[],
  orderLeadTime: number = 0,
): number | null => {
  const defaultHours = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"];
  const raw =
    deliveryHours && deliveryHours.length > 0 ? deliveryHours : defaultHours;
  const hours = raw.map(extractHour).filter(Boolean);
  if (hours.length === 0) return null;

  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  for (const hour of hours) {
    const [hoursStr, minutesStr] = hour.split(":");
    const hourTotalMinutes =
      parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10);
    const cutoffTime = hourTotalMinutes - orderLeadTime;
    if (currentTotalMinutes < cutoffTime) return cutoffTime - currentTotalMinutes;
  }

  return null;
};

/** Met en forme un décompte de minutes : « 2h 15min », « 45min ». */
export const formatCountdown = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

/**
 * Décompte réactif du temps restant pour commander. Recalculé chaque minute et
 * au retour en foreground, comme `useNextDeliveryTime`.
 */
export const useOrderCountdown = (
  deliveryHours?: any[],
  orderLeadTime: number = 0,
): string | null => {
  const [left, setLeft] = useState(() =>
    getOrderCutoffMinutes(deliveryHours, orderLeadTime),
  );

  useEffect(() => {
    const recompute = () =>
      setLeft(getOrderCutoffMinutes(deliveryHours, orderLeadTime));

    recompute();
    const interval = setInterval(recompute, 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") recompute();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deliveryHours), orderLeadTime]);

  return left === null ? null : formatCountdown(left);
};

/**
 * Version réactive de getNextDeliveryTime : recalcule chaque minute et au
 * retour de l'app en foreground, pour que l'heure affichée ne prenne jamais
 * de retard sur l'heure réelle (bug de valeur figée au premier render).
 */
export const useNextDeliveryTime = (
  deliveryHours?: any[],
  orderLeadTime: number = 0,
): string => {
  const [time, setTime] = useState(() =>
    getNextDeliveryTime(deliveryHours, orderLeadTime),
  );

  useEffect(() => {
    const recompute = () =>
      setTime(getNextDeliveryTime(deliveryHours, orderLeadTime));

    recompute();
    const interval = setInterval(recompute, 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") recompute();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
    // deliveryHours est un array — on le sérialise pour une dépendance stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deliveryHours), orderLeadTime]);

  return time;
};
