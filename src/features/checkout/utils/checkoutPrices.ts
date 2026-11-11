import { Boisson, Embalage, Livraison, Menu } from "@/src/types";
import { menuPriceAt } from "./menuPrices";

/**
 * Montants du checkout HOME (`useCheckout`) : plat (prix choisi parmi N),
 * extras, boissons, livraison, total. Fonction pure extraite du hook (R4).
 */
export const computeCheckoutPrices = ({
  menu,
  quantity,
  selectedPriceIndex,
  selectedPackaging,
  selectedDrinks,
  drinkQuantities,
  delivery,
}: {
  menu: Menu | null;
  quantity: number;
  selectedPriceIndex: number;
  selectedPackaging: Embalage[];
  selectedDrinks: Boisson[];
  drinkQuantities: Record<string, number>;
  delivery: Livraison;
}) => {
  if (!menu) return { menuPrice: 0, extrasPrice: 0, drinksPrice: 0, deliveryPrice: 0, total: 0, isDeliveryFree: false, displayDeliveryPrice: 0, displayTotal: 0 };

  const basePrice = menuPriceAt(menu, selectedPriceIndex)?.price || 0;

  const menuPrice = basePrice * quantity;
  const extrasPrice = selectedPackaging.reduce((acc, p) => acc + p.prix, 0);
  const drinksPrice = selectedDrinks.reduce((acc, d) => acc + d.prix * (drinkQuantities[d.type] || 1), 0);
  // Prix de livraison selon le type actif, indépendant entre express et période.
  // Le prix vient EXCLUSIVEMENT de la zone/période choisie : aucun fallback.
  // Tant que l'utilisateur n'a pas sélectionné de lieu/zone, deliveryPrice = 0.
  // - express  → prix de la zone express sélectionnée (delivery.expressPrix)
  // - standard → prix de la période/créneau sélectionné (delivery.prix)
  const periodPrice =
    delivery.prix != null && Number(delivery.prix) > 0
      ? Number(delivery.prix)
      : 0;
  const expressPrice =
    delivery.expressPrix != null && Number(delivery.expressPrix) > 0
      ? Number(delivery.expressPrix)
      : 0;
  let deliveryPrice = 0;
  if (delivery.statut) {
    if (delivery.type === "express") {
      deliveryPrice = expressPrice;
    } else if (delivery.type === "standard") {
      deliveryPrice = periodPrice;
    }
  }

  const total = menuPrice + extrasPrice + drinksPrice + deliveryPrice;

  // Livraison offerte : offre backend active OU code bonus appliqué.
  // Le VRAI prix de livraison reste envoyé dans `delivery.prix` (le livreur
  // doit être payé), mais le montant débité (`displayTotal`) l'exclut.
  const deliveryOffer = (menu as any)?.deliveryOffer;
  const isDeliveryFree =
    delivery.statut &&
    delivery.type !== "aucune" &&
    (!!deliveryOffer?.active || !!delivery.bonusCode);

  const displayDeliveryPrice = isDeliveryFree ? 0 : deliveryPrice;
  const displayTotal = isDeliveryFree ? total - deliveryPrice : total;

  return {
    menuPrice,
    extrasPrice,
    drinksPrice,
    deliveryPrice,
    total,
    isDeliveryFree,
    displayDeliveryPrice,
    displayTotal,
  };
};
