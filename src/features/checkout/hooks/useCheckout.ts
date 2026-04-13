import { useState, useCallback, useMemo } from "react";
import { Menu, Commande, Embalage, Boisson, Livraison } from "../../../types";
import { useAuth } from "../../auth/context/AuthContext";

export const useCheckout = (menu: Menu | null) => {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(1); // 1, 2, or 3
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

  const prices = useMemo(() => {
    if (!menu) return { menuPrice: 0, extrasPrice: 0, drinksPrice: 0, deliveryPrice: 0, total: 0 };

    let basePrice = menu.prix1;
    if (selectedPriceIndex === 2 && menu.prix2 > 0) basePrice = menu.prix2;
    if (selectedPriceIndex === 3 && menu.prix3 > 0) basePrice = menu.prix3;

    const menuPrice = basePrice * quantity;
    const extrasPrice = selectedPackaging.reduce((acc, p) => acc + p.prix, 0) * quantity;
    const drinksPrice = selectedDrinks.reduce((acc, d) => acc + d.prix, 0); // Note: quantity for drinks? usually drinks are fixed count
    const deliveryPrice = delivery.statut
      ? delivery.type === "express"
        ? 1000
        : 500
      : 0;

    return {
      menuPrice,
      extrasPrice,
      drinksPrice,
      deliveryPrice,
      total: menuPrice + extrasPrice + drinksPrice + deliveryPrice
    };
  }, [menu, quantity, selectedPriceIndex, selectedPackaging, selectedDrinks, delivery]);

  const createOrder = (status: string = "pendingToBuy"): any | null => {
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

    const mappedMenu = {
      id: (menu as any).id || (menu as any)._id || "unknown",
      fastFoodId: (menu as any).fastFoodId || (menu as any).idFastFood || "1",
      name: menu.titre,
      coverImage: menu.image,
      coverImageHasBackground: true,
      images: menu.images || [menu.image],
      prices: [
        { price: menu.prix1, description: menu.optionPrix1 || "Standard" },
        menu.prix2 > 0 ? { price: menu.prix2, description: menu.optionPrix2 || "Medium" } : null,
        menu.prix3 > 0 ? { price: menu.prix3, description: menu.optionPrix3 || "Large" } : null,
      ].filter((p): p is { price: number; description: string } => p !== null),
      extra: [],
      drink: [],
      status: menu.disponibilite === "active" || menu.disponibilite === "Disponible" ? "available" : "unavailable",
    };

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
      location: delivery.address || (delivery.statut ? "Non spécifié" : "Sur place"),
      phone: delivery.phone || userData?.infos?.numero?.toString() || "",
      voiceNoteUri: delivery.voiceNoteUri || "",
      note: delivery.note || "",
      record: "", // Placeholder for additional record if needed
    };

    if (finalDeliveryType === "time") {
      // Backend expects HH:MM, frontend might have HHhMM from previous versions or HH:MM from our fix
      const formattedTime = (delivery.hour || "12:00").replace('h', ':');
      deliveryData.time = formattedTime;
    }

    return {
      userId: userData?.uid || "unknown_user",
      fastFoodId: (menu as any).fastFoodId || (menu as any).idFastFood || "1",
      menu: mappedMenu,
      quantity,
      total: prices.total,
      userData: {
        firstName: userData?.infos?.prenom || "Inconnu",
        lastName: userData?.infos?.nom || "Inconnu",
        email: userData?.infos?.email || "inconnu@email.com",
        phoneNumber: userData?.infos?.numero || 0,
      },
      extra: extraData.length > 0 ? extraData : [{ name: "Aucun", status: false }],
      drink: drinkData,
      delivery: deliveryData,
      status,
    };
  };

  return {
    quantity,
    setQuantity,
    selectedPriceIndex,
    setSelectedPriceIndex,
    selectedPackaging,
    setSelectedPackaging,
    selectedDrinks,
    setSelectedDrinks,
    delivery,
    setDelivery,
    availablePackaging,
    availableDrinks,
    availableHours,
    total: prices.total,
    menuPrice: prices.menuPrice,
    extrasPrice: prices.extrasPrice,
    drinksPrice: prices.drinksPrice,
    deliveryPrice: prices.deliveryPrice,
    createOrder,
  };
};
