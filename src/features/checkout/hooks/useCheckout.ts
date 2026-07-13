import { useState, useCallback, useMemo, useEffect } from "react";
import { Menu, Commande, Embalage, Boisson, Livraison } from "../../../types";
import { useAuth } from "../../auth/context/AuthContext";
import axios from "axios";
import { Config } from "../../../api/config";
import { socketService } from "../../../services/socket";
import { REVIEW_DEFAULT_NETWORK, REVIEW_DEFAULT_PHONE } from "../../payment/constants/reviewPayment";

export const useCheckout = (menu: Menu | null, initialOrder?: any | null, onChange?: (order: any) => void) => {
  const { userData, user } = useAuth();
  const registerPaymentHandler = useCallback(
    (handler: (data: any) => void) => socketService.registerPaymentHandler(handler),
    [],
  );
  const unregisterPaymentHandler = useCallback(
    () => socketService.unregisterPaymentHandler(),
    [],
  );
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
  const [paymentPhone, setPaymentPhone] = useState('');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(!initialOrder);
  const [paymentNetwork, setPaymentNetwork] = useState<'orange' | 'mtn'>('orange');
  const [paymentState, setPaymentState] = useState<'network_select' | 'input' | 'waiting' | 'ussd_sent' | 'success' | 'success_created' | 'failed'>('network_select');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ussdMessage, setUssdMessage] = useState<string | null>(null);

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

  const resetCheckout = useCallback(() => {
    setQuantity(1);
    setSelectedPriceIndex(1);
    setSelectedPackaging([]);
    setSelectedDrinks([]);
    setDrinkQuantities({});
    setDelivery(new Livraison(false, 0));
    setPaymentPhone('');
    setPaymentState('network_select');
    setLastOrderId(null);
    setIsInitialized(!initialOrder);
  }, [initialOrder]);

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
        const hasDelivery = !!dData.status && dData.type && dData.type !== 'aucune';
        const d = new Livraison(!!dData.status, 0);
        if (hasDelivery) {
          if (dData.type === 'time') d.type = 'standard';
          else if (dData.type === 'express') d.type = 'express';
          if (dData.time || dData.hour) d.hour = dData.time || dData.hour;
          if (dData.location || dData.address) d.address = dData.location || dData.address;
          if (dData.phone) d.phone = dData.phone;
          if (dData.voiceNoteUri) d.voiceNoteUri = dData.voiceNoteUri;
          if (dData.note) d.note = dData.note;
          // Note : dData.prix est le prix TOTAL de livraison sauvegardé (pas le
          // prix période seul) → on ne le remet pas dans d.prix pour ne pas
          // fausser l'affichage. expressPrix/expressLieu sont eux spécifiques.
          if (dData.expressLieu) d.expressLieu = dData.expressLieu;
          if (dData.expressPrix != null) d.expressPrix = Number(dData.expressPrix) || 0;
        } else {
          d.type = 'aucune';
        }
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

    const hasDelivery = delivery.statut === true && delivery.type !== "aucune";

    let finalDeliveryType: string | undefined;
    if (hasDelivery) {
      finalDeliveryType = delivery.type === "standard" ? "time" : delivery.type;
    }

    let deliveryData: any = {
      status: hasDelivery,
      date: delivery.date || new Date().toISOString().split("T")[0],
    };

    if (hasDelivery && finalDeliveryType) {
      deliveryData.type = finalDeliveryType;
      deliveryData.prix = prices.deliveryPrice;
      if (delivery.address) deliveryData.location = delivery.address;
      if (delivery.phone) deliveryData.phone = delivery.phone;
      if (delivery.voiceNoteUri) deliveryData.voiceNoteUri = delivery.voiceNoteUri;
      if (delivery.note) deliveryData.note = delivery.note;

      if (finalDeliveryType === "time" && delivery.hour) {
        deliveryData.time = delivery.hour.replace('h', ':');
      }
      if (finalDeliveryType === "express") {
        if (delivery.expressLieu) deliveryData.expressLieu = delivery.expressLieu;
        if (delivery.expressPrix) deliveryData.expressPrix = delivery.expressPrix;
      }
    }

    const clientData = {
      firstName: userData?.infos?.prenom || user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Client",
      lastName: userData?.infos?.nom || user?.displayName?.split(" ").slice(1).join(" ") || "",
      email: userData?.infos?.email || user?.email || "inconnu@email.com",
      phoneNumber: Number(userData?.infos?.numero) || 0,
    };
    console.log("📦 [useCheckout] userData sources →", {
      "infos.prenom": userData?.infos?.prenom,
      "infos.nom": userData?.infos?.nom,
      "infos.email": userData?.infos?.email,
      "firebase.displayName": user?.displayName,
      "firebase.email": user?.email,
    });
    console.log("📦 [useCheckout] clientData envoyé →", clientData);

    const returnedOrder: any = {
      userId: userData?.uid || "unknown_user",
      fastFoodId: (menu as any).fastFoodId || (menu as any).idFastFood || "1",
      menu: mappedMenu,
      quantity,
      selectedPriceIndex,
      total: prices.total,
      userData: clientData,
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

  const validateStock = useCallback((): string | null => {
    if (!menu) return null;
    const menuStock = (menu as any).stock;
    if (typeof menuStock !== 'number') return null;
    if (menuStock < quantity) return `Stock insuffisant. Disponible : ${menuStock}`;
    return null;
  }, [menu, quantity]);

  const validateDelivery = useCallback((): string | null => {
    const type = delivery.type;
    if (!delivery.statut || type === 'aucune') return null;
    if (!delivery.address) return "Adresse de livraison requise";
    if (!delivery.phone) return "Numéro de contact requis";
    if (type === 'standard' && !delivery.hour) return "Période de livraison requise";
    // Express : exiger le choix d'une zone SI des zones express sont disponibles
    // (le prix vient exclusivement de la zone choisie, pas d'un défaut).
    if (type === 'express') {
      const hours = (menu as any)?.deliveryHours;
      const hasExpressZones =
        Array.isArray(hours) &&
        hours.some(
          (h: any) =>
            h && typeof h === 'object' && h.express && h.expressZones?.length > 0,
        );
      if (hasExpressZones && !delivery.expressLieu) {
        return "Zone de livraison express requise";
      }
    }
    return null;
  }, [delivery, menu]);

  const ussdCode = paymentNetwork === 'orange' ? '#150#' : '*126#';

  const handlePaymentConfirm = useCallback(async (phone: string) => {
    if (!userData || !phone) {
      setPaymentError('Numéro de paiement requis');
      return;
    }

    setPaymentError(null);
    setPaymentPhone(phone);
    // Source de vérité unique : on passe en "waiting" ici (et non en local dans
    // la capsule) pour que le resync vers "input" sur erreur fonctionne toujours.
    setPaymentState('waiting');

    // Commande complète à payer (le backend déduit le fastFoodId des items).
    const order = createOrder('pending');

    try {
      const response = await axios.post(`${Config.apiUrl}/transaction`, {
        payBy: 'mobilemoney',
        amount: prices.total,
        phone: phone.replace(/\s/g, ''),
        network: paymentNetwork === 'orange' ? 'Orangemoney' : 'MTN',
        email: userData?.infos?.email || user?.email || 'user@yaammoo.com',
        userId: userData.uid,
        items: order ? [order] : [],
      });

      console.log('Transaction response:', response.data);

      // Cas A — USSD envoyé : afficher le message du backend, écouter le socket
      if (response.data.status === 'ussd_sent' || response.data.success === true) {
        setUssdMessage(response.data.message);
        setPaymentState('ussd_sent');
        // Le socket commence à écouter directement dans cet état
      } else {
        // Cas C — validation backend échouée : message est un tableau [{ field, message }]
        const raw = response.data.message;
        const message = Array.isArray(raw)
          ? raw.map((e: any) => e?.message).filter(Boolean).join(' • ') || 'Erreur paiement'
          : raw || 'Erreur paiement';
        // Le délai d'attente est déjà inclus dans le message du backend.
        setPaymentError(message);
        setPaymentState('input');
      }
    } catch (error: any) {
      const data = error.response?.data;
      const raw = data?.message;
      let message = Array.isArray(raw)
        ? raw.map((e: any) => e?.message).filter(Boolean).join(' • ')
        : raw;
      message = message || data?.error || error.message || 'Erreur paiement';
      // Le délai d'attente est déjà inclus dans le message du backend.
      console.log('Payment error details:', data);
      // Erreur → afficher le Toast et revenir à l'input (overlays restent ouverts).
      setPaymentError(message);
      setPaymentState('input');
    }
  }, [userData, paymentNetwork, prices.total, createOrder]);

  // Mode review Apple : commande directe sans saisie USSD ET sans attente socket.
  // En review, le backend crée la commande de façon SYNCHRONE et répond
  // directement { success: true } (pas de status 'ussd_sent', pas de
  // payment.settled ensuite). On traite donc cette réponse comme un verdict
  // terminal : success → success_created (le parent ferme alors le sheet).
  const handleReviewOrder = useCallback(async () => {
    if (!userData) {
      setPaymentError('Utilisateur non connecté');
      return;
    }
    setPaymentError(null);
    setPaymentNetwork(REVIEW_DEFAULT_NETWORK);
    setPaymentPhone(REVIEW_DEFAULT_PHONE);
    setPaymentState('waiting');

    const order = createOrder('pending');

    try {
      const response = await axios.post(`${Config.apiUrl}/transaction`, {
        payBy: 'mobilemoney',
        amount: prices.total,
        phone: REVIEW_DEFAULT_PHONE,
        network: REVIEW_DEFAULT_NETWORK === 'orange' ? 'Orangemoney' : 'MTN',
        email: userData?.infos?.email || user?.email || 'user@yaammoo.com',
        userId: userData.uid,
        items: order ? [order] : [],
      });

      console.log('[ReviewOrder] response:', JSON.stringify(response.data));

      if (response.data?.success === true) {
        // Verdict terminal synchrone (review) : pas de socket, pas d'écran de
        // succès → on passe direct en success_created, le parent ferme aussitôt.
        setPaymentState('success_created');
      } else {
        const raw = response.data?.message;
        const message = Array.isArray(raw)
          ? raw.map((e: any) => e?.message).filter(Boolean).join(' • ') || 'Erreur commande'
          : raw || 'Erreur commande';
        setPaymentError(message);
        setPaymentState('input');
      }
    } catch (error: any) {
      const data = error.response?.data;
      const raw = data?.message;
      let message = Array.isArray(raw)
        ? raw.map((e: any) => e?.message).filter(Boolean).join(' • ')
        : raw;
      message = message || data?.error || error.message || 'Erreur commande';
      setPaymentError(message);
      setPaymentState('input');
    }
  }, [userData, prices.total, createOrder]);

  const handlePaymentVerdict = useCallback((data: any) => {
    if (data.status === 'successful') {
      // Paiement réussi → afficher "Création commande en cours" pendant 5s
      setPaymentState('success');
      setTimeout(() => {
        // Après 5s, afficher "Commande créée avec succès".
        // La fermeture des overlays + du checkout est gérée par le parent
        // (effet sur paymentState === 'success_created').
        setPaymentState('success_created');
      }, 5000);
    } else {
      // Échec : pas d'état "failed" dans l'overlay → retour direct à l'input.
      // Seul le toast top affiche l'erreur.
      setPaymentError('Paiement échoué');
      setPaymentState('input');
    }
  }, []);

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
    paymentPhone,
    setPaymentPhone,
    paymentNetwork,
    setPaymentNetwork,
    paymentState,
    setPaymentState,
    paymentError,
    setPaymentError,
    ussdCode,
    ussdMessage,
    setUssdMessage,
    handlePaymentConfirm,
    handleReviewOrder,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
    availablePackaging,
    availableDrinks,
    availableHours,
    total: prices.total,
    menuPrice: prices.menuPrice,
    extrasPrice: prices.extrasPrice,
    drinksPrice: prices.drinksPrice,
    deliveryPrice: prices.deliveryPrice,
    createOrder,
    resetCheckout,
    validateDelivery,
    validateStock,
  };
};
