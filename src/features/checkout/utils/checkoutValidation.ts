import type { Livraison, Menu } from "../../../types";
import { hasExpressZones } from "./expressZones";
import { t } from "@/src/i18n";

/**
 * Controles du checkout home avant paiement (R13 : validateStock + validateDelivery).
 * Fonctions pures, sorties de `useCheckout` (plafond 500 lignes, R4).
 * @returns le message d'erreur, ou null si tout va bien.
 */
export function checkStock(menu: Menu | null | undefined, quantity: number): string | null {
  if (!menu) return null;
  const menuStock = (menu as any).stock;
  if (typeof menuStock !== "number") return null;
  if (menuStock < quantity) return t("Stock insuffisant. Disponible : {{a}}", { a: menuStock });
  return null;
}

export function checkDelivery(delivery: Livraison, menu: Menu | null | undefined): string | null {
  const type = delivery.type;
  if (!delivery.statut || type === "aucune") return null;
  if (!delivery.address && !delivery.note) return t("Adresse de livraison requise");
  if (!delivery.phone) return t("Numéro de contact requis");
  if (type === "standard" && !delivery.hour) return t("Période de livraison requise");
  // Express : exiger le choix d'une zone SI des zones express sont disponibles
  // (le prix vient exclusivement de la zone choisie, pas d'un defaut). Liste
  // `expressZones` de la boutique : un prix par lieu, sans heure.
  if (type === "express" && hasExpressZones((menu as any)?.expressZones) && !delivery.expressLieu) {
    return t("Zone de livraison express requise");
  }
  return null;
}
