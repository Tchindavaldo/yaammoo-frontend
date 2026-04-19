import { useState, useCallback, useMemo, useEffect } from "react";
import { Menu, Commande, Embalage, Boisson, Livraison } from "../../../types";
import { useAuth } from "../../auth/context/AuthContext";

export const useCheckout = (menu: Menu | null, initialOrder?: any | null, onChange?: (order: any) => void) => {
  const { userData } = useAuth();
  const [quantity, setQuantity] = useState(initialOrder?.quantity || 1);
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(initialOrder?.selectedPriceIndex || 1);
  const [selectedPackaging, setSelectedPackaging] = useState<Embalage[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<Boisson[]>([]);
  const [drinkQuantities, setDrinkQuantities] = useState<Record<string, number>>(() => {
    if (!initialOrder?.drink) return {};
    const qtys: Record<string, number> = {};
    initialOrder.drink.forEach((d: any) => {
      if (d.status === true && d.quantite > 1) qtys[d.name] = d.quantite;
    });
    return qtys;
  });
  const [delivery, setDelivery] = useState<Livraison>(new Livraison(false, 0));
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(!initialOrder);

  // Utiliser les extras/drinks du menu si disponibles
  const availablePackaging = useMemo(
    () => {
      if (menu && (menu as any).extra && Array.isArray((menu as any).extra)) {
        return (menu as any).extra
          .filter((e: any) => e.name && e.name !== 'Aucun')
          .map((e: any) => new Embalage(e.name, e.prix || 0));
      }
      return [new Embalage("Sac plastique", 100), new Embalage("Gamelle", 150)];
    },
    [menu],
  );

  const availableDrinks = useMemo(
    () => {
      if (menu && (menu as any).drink && Array.isArray((menu as any).drink)) {
        return (menu as any).drink
          .filter((d: any) => d.name && d.name !== 'Aucune')
          .map((d: any) => new Boisson(d.name, d.prix || 0));
      }
      return [
        new Boisson("Coca Cola", 600),
        new Boisson("Djino", 700),
        new Boisson("Top Pamplemousse", 500),
        new Boisson("Planete Cocktail", 600),
        new Boisson("Vinto", 700),
      ];
    },
    [menu],
  );

  // Heures par défaut si la boutique n'en a pas configuré
  const defaultHours = ["12:00", "13:00", "14:00", "18:00", "19:00", "20:00"];

  // Récupérer les heures de livraison depuis le menu/boutique si disponibles
  const availableHours = useMemo(() => {
    if (menu && (menu as any).deliveryHours && Array.isArray((menu as any).deliveryHours)) {
      return (menu as any).deliveryHours;
    }
    return defaultHours;
  }, [menu]);

  // Réinitialiser tous les états quand le menu change (nouveau menu cliqué)
  useEffect(() => {
    if (menu && !initialOrder) {
      setQuantity(1);
      setSelectedPriceIndex(1);
      setSelectedPackaging([]);
      setSelectedDrinks([]);
      setDrinkQuantities({});
      setDelivery(new Livraison(false, 0));
      setIsInitialized(true);
    }
  }, [menu, initialOrder]);

  useEffect(() => {
    const currentId = initialOrder?.id;
    if (currentId && currentId !== lastOrderId) {
      setQuantity(initialOrder.quantity || 1);
      if (initialOrder.selectedPriceIndex) {
        setSelectedPriceIndex(initialOrder.selectedPriceIndex);
      }
      if (initialOrder.drink) {
        const initialD = availableDrinks.filter(d => initialOrder.drink.some((idr: any) => idr.name === d.type && idr.status === true));
        setSelectedDrinks(initialD);
      }
      if (initialOrder.extra) {
        const initialP = availablePackaging.filter(p => initialOrder.extra.some((ex: any) => ex.name === p.type && ex.status === true));
        setSelectedPackaging(initialP);
      }
      if (initialOrder.delivery || initialOrder.livraison) {
        const dData = initialOrder.delivery || initialOrder.livraison;
        const d = new Livraison(dData.status, 0);
        d.type = dData.type;
        d.hour = dData.time || dData.hour;
        d.address = dData.location || dData.address;
        d.phone = dData.phone;
        d.voiceNoteUri = dData.voiceNoteUri;
        d.note = dData.note;
        setDelivery(d);
      }
      setLastOrderId(currentId);
      setIsInitialized(true);
    }
  }, [initialOrder, lastOrderId, availableDrinks, availablePackaging]);

  const prices = useMemo(() => {
    if (!menu) return { menuPrice: 0, extrasPrice: 0, drinksPrice: 0, deliveryPrice: 0, total: 0 };

    let basePrice = menu.prix1;
    if (selectedPriceIndex === 2 && menu.prix2 > 0) basePrice = menu.prix2;
    if (selectedPriceIndex === 3 && menu.prix3 > 0) basePrice = menu.prix3;

    const menuPrice = basePrice * quantity;
    const extrasPrice = selectedPackaging.reduce((acc, p) => acc + p.prix, 0);
    const drinksPrice = selectedDrinks.reduce((acc, d) => acc + d.prix * (drinkQuantities[d.type] || 1), 0);
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
      total: menuPrice + extrasPrice + drinksPrice + deliveryPrice,
    };
  }, [menu, quantity, selectedPriceIndex, selectedPackaging, selectedDrinks, drinkQuantities, delivery]);

  const createOrder = useCallback((status: string = "pendingToBuy"): any | null => {
    if (!menu || !userData) return null;

    // Sauvegarder TOUS les extras/drinks du menu avec leur statut
    // (true = sélectionné, false = non sélectionné) pour pouvoir les réafficher à l'édition
    const selectedExtraNames = new Set(selectedPackaging.map(p => p.type));
    const selectedDrinkNames = new Set(selectedDrinks.map(d => d.type));

    const extraData = availablePackaging.map((pkg) => ({
      name: pkg.type,
      status: selectedExtraNames.has(pkg.type),
      prix: pkg.prix,
    }));

    const drinkData = availableDrinks.map((drink) => ({
      name: drink.type,
      status: selectedDrinkNames.has(drink.type),
      prix: drink.prix,
      quantite: drinkQuantities[drink.type] || 1,
    }));
    if (drinkData.length === 0)
      drinkData.push({ name: "Aucune", status: false, prix: 0, quantite: 0 });

    // Calcul du prix sélectionné
    let selectedPrice = menu.prix1;
    if (selectedPriceIndex === 2 && menu.prix2 > 0) selectedPrice = menu.prix2;
    if (selectedPriceIndex === 3 && menu.prix3 > 0) selectedPrice = menu.prix3;

    let selectedDescription = menu.optionPrix1 || "Standard";
    if (selectedPriceIndex === 2) selectedDescription = menu.optionPrix2 || "Medium";
    if (selectedPriceIndex === 3) selectedDescription = menu.optionPrix3 || "Large";

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
      record: "",
    };

    if (finalDeliveryType === "time") {
      const formattedTime = (delivery.hour || "12:00").replace('h', ':');
      deliveryData.time = formattedTime;
    }

    const returnedOrder: any = {
      userId: userData?.uid || "unknown_user",
      fastFoodId: (menu as any).fastFoodId || (menu as any).idFastFood || "1",
      menu: mappedMenu,
      quantity,
      selectedPriceIndex,
      total: prices.total,
      userData: {
        firstName: userData?.infos?.prenom || "Inconnu",
        lastName: userData?.infos?.nom || "Inconnu",
        email: userData?.infos?.email || "inconnu@email.com",
        phoneNumber: Number(userData?.infos?.numero) || 0,
      },
      extra: extraData.length > 0 ? extraData : [{ name: "Aucun", status: false }],
      drink: drinkData,
      delivery: deliveryData,
      status,
    };

    if (initialOrder) {
      if (initialOrder.id) {
        returnedOrder.id = initialOrder.id;
      }
      if (initialOrder.createdAt) {
        returnedOrder.createdAt = initialOrder.createdAt;
      }
    }

    return returnedOrder;
  }, [menu, userData, selectedPackaging, selectedDrinks, drinkQuantities, delivery, quantity, selectedPriceIndex, initialOrder]);

  useEffect(() => {
    if (onChange && menu && userData && isInitialized) {
      const order = createOrder();
      if (order) onChange(order);
    }
  }, [createOrder, onChange, menu, userData, drinkQuantities, isInitialized]);

  return {
    quantity,
    setQuantity,
    selectedPriceIndex,
    setSelectedPriceIndex,
    selectedPackaging,
    setSelectedPackaging,
    selectedDrinks,
    setSelectedDrinks,
    drinkQuantities,
    setDrinkQuantity: (type: string, qty: number) => {
      setDrinkQuantities(prev => ({ ...prev, [type]: qty }));
    },
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
