// Props de MerchantOrderCard (sorties pour tenir sous 500 lignes, R4).
import type { Commande } from "@/src/types";

export interface MerchantOrderCardProps {
  order: Commande;
  allOrders?: Commande[];
  /**
   * Commandes du groupe passées AU SEUL bottom sheet (nav multi-cmd), sans
   * basculer la carte sur le design groupé — la carte reste celle de `order`,
   * la commande la mieux classée du groupe.
   */
  sheetOrders?: Commande[];
  /**
   * Toutes les commandes de la boutique : sert à l'onglet Montant du sheet, qui
   * recompose le groupe ABSOLU (même client / date / créneau ou zone) sans le
   * filtre de statut appliqué à la liste.
   */
  groupPool?: Commande[];
  onUpdateStatus: (
    status:
      | "processing"
      | "finished"
      | "delivering"
      | "delivered"
      | "cancelByFastFood",
  ) => Promise<void> | void;
  /** Délègue le groupe à un livreur (pose driverId sur les commandes). */
  onDelegate?: (driverId: string) => Promise<void> | void;
  /**
   * Valide UNE commande précise (bouton dans l'onglet Commande du sheet).
   * Sans cette prop, on retombe sur `onUpdateStatus` (toute la ligne).
   */
  onValidateOne?: (
    orderId: string,
    status: "processing" | "finished",
  ) => Promise<void | boolean> | void;
  isForceLaunched?: boolean;
}
