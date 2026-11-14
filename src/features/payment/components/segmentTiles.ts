// Tuiles d'informations de CartDeliverySegmentStep (extraites pour R4) :
// lieu / date, zone express ou creneau ou heure de retrait, contact.
import { Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { t as tr } from "@/src/i18n";
import { pickupDayLabel } from "@/src/features/checkout/utils/pickupHours";
import type { GroupedDeliveryType } from "./CartDeliveryTypeStep";

export type SegmentTile = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Libelle court de la tuile (place contrainte). */
  label: string;
  /** Libelle complet repris par le recap, qui a toute la largeur. */
  recapLabel: string;
  value: string;
  filled: boolean;
  onPress: () => void;
};

interface Args {
  delivery: Livraison;
  type: GroupedDeliveryType;
  hasExpressZones: boolean;
  onOpenLocation: () => void;
  onOpenContact: () => void;
  onOpenPeriod: () => void;
  onOpenExpress: () => void;
  onOpenPickupDate?: () => void;
  onOpenPickupHour?: () => void;
}

const noop = () => {};

export const buildSegmentTiles = (a: Args): SegmentTile[] => {
  const { delivery, type } = a;
  /** Heure du creneau, extraite du format "YYYY-MM-DD|HH:mm|lieu". */
  const parts = (delivery.hour || "").split("|");
  const heure = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]) ? parts[1] || "" : parts[0] || "";
  const tiles: SegmentTile[] = [];

  if (type !== "aucune") {
    tiles.push({
      key: "location",
      icon: "location-outline",
      label: tr("Lieu"),
      recapLabel: tr("Lieu de livraison"),
      value: delivery.address || tr("À remplir"),
      filled: !!(delivery.address || delivery.note),
      onPress: a.onOpenLocation,
    });
  } else {
    // "Sur place" : pas d'adresse, la tuile devient le JOUR du retrait.
    tiles.push({
      key: "pickupDate",
      icon: "calendar-outline",
      label: tr("Date"),
      recapLabel: tr("Jour du retrait"),
      value: pickupDayLabel(delivery.date) || tr("À remplir"),
      filled: !!delivery.date,
      onPress: a.onOpenPickupDate || noop,
    });
  }

  // Zone express : toujours affichee en mode express ; sans zones la card
  // reste cliquable sans action.
  if (type === "express") {
    tiles.push({
      key: "express",
      icon: "flash",
      label: tr("Zone express"),
      recapLabel: tr("Zone express"),
      value: delivery.expressLieu || tr("À remplir"),
      filled: !!delivery.expressLieu,
      onPress: a.hasExpressZones ? a.onOpenExpress : noop,
    });
  }

  if (type === "standard") {
    tiles.push({
      key: "period",
      icon: "time-outline",
      label: tr("Créneau"),
      recapLabel: tr("Créneau horaire"),
      value: heure || tr("À remplir"),
      filled: !!delivery.hour,
      onPress: a.onOpenPeriod,
    });
  }

  if (type === "aucune") {
    // Heure de passage, libre dans les horaires de la boutique.
    tiles.push({
      key: "pickupHour",
      icon: "time-outline",
      label: tr("Heure"),
      recapLabel: tr("Heure de retrait"),
      value: delivery.pickupTime || tr("À remplir"),
      filled: !!delivery.pickupTime,
      onPress: a.onOpenPickupHour || noop,
    });
  }

  tiles.push({
    key: "contact",
    icon: "call-outline",
    label: tr("Contact"),
    recapLabel: "Contact",
    value: delivery.phone || tr("À remplir"),
    filled: !!delivery.phone,
    onPress: a.onOpenContact,
  });
  return tiles;
};
