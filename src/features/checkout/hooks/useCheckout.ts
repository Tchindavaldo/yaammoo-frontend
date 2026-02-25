import { useState, useCallback, useMemo } from "react";
import { Menu, Commande, Embalage, Boisson, Livraison } from "../../../types";
import { useAuth } from "../../auth/context/AuthContext";

export const useCheckout = (menu: Menu | null) => {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedPackaging, setSelectedPackaging] = useState<Embalage[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<Boisson[]>([]);
  const [delivery, setDelivery] = useState<Livraison>(new Livraison(false, 0));

  // Prix par défaut pour les options (peuvent être dynamiques si API dispo)
  const availablePackaging = useMemo(
    () => [new Embalage("Sac plastique", 100), new Embalage("Gamelle", 150)],
    [],
  );

  const availableDrinks = useMemo(
    () => [
      new Boisson("Coca Cola", 600),
      new Boisson("Djino", 700),
      new Boisson("Top Pamplemousse", 500),
      new Boisson("Planete Cocktail", 600),
      new Boisson("Vinto", 700),
    ],
    [],
  );

  const availableHours = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"];

  const calculateTotal = useCallback(() => {
    if (!menu) return 0;
    const basePrice = menu.prix1 * quantity;
    const packagingPrice =
      selectedPackaging.reduce((acc, p) => acc + p.prix, 0) * quantity;
    const drinksPrice = selectedDrinks.reduce((acc, d) => acc + d.prix, 0);
    const deliveryPrice = delivery.statut
      ? delivery.type === "express"
        ? 1000
        : 500
      : 0;
    return basePrice + packagingPrice + drinksPrice + deliveryPrice;
  }, [menu, quantity, selectedPackaging, selectedDrinks, delivery]);

  const createOrder = (): any | null => {
    if (!menu || !userData) return null;

    const extraData = selectedPackaging.map((pkg) => ({
      name: pkg.type,
      status: true,
    }));

    const drinkData = selectedDrinks.map((drink) => ({
      name: drink.type,
      status: true,
    }));
    if (drinkData.length === 0)
      drinkData.push({ name: "Aucune", status: false });

    let finalDeliveryType =
      delivery.type === "standard"
        ? "time"
        : delivery.type === "aucune"
          ? "time"
          : delivery.type;
    let deliveryData: any = {
      status: delivery.statut,
      date: delivery.date || new Date().toISOString().split("T")[0],
      type: finalDeliveryType,
      location: delivery.address || (delivery.statut ? "Non spécifié" : ""),
    };

    if (finalDeliveryType === "time") {
      deliveryData.time = delivery.hour || "12:00";
    }

    return {
      userId: userData?.uid || "unknown_user",
      fastFoodId: (menu as any)?.fastFoodId || (menu as any)?.idFastFood || "1",
      menu,
      quantity,
      total: Number(calculateTotal()) || 0,
      userData: {
        firstName: userData?.infos?.prenom || "Inconnu",
        lastName: userData?.infos?.nom || "Inconnu",
        email: userData?.infos?.email || "inconnu@email.com",
        phoneNumber: userData?.infos?.numero || 0,
      },
      extra:
        extraData.length > 0 ? extraData : [{ name: "Aucun", status: false }],
      drink: drinkData,
      delivery: deliveryData,
    };
  };

  return {
    quantity,
    setQuantity,
    selectedPackaging,
    setSelectedPackaging,
    selectedDrinks,
    setSelectedDrinks,
    delivery,
    setDelivery,
    availablePackaging,
    availableDrinks,
    availableHours,
    total: calculateTotal(),
    createOrder,
  };
};
