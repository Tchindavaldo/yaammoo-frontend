import { useState, useCallback, useMemo } from 'react';
import { Menu, Commande, Embalage, Boisson, Livraison } from '../../../types';
import { useAuth } from '../../auth/context/AuthContext';

export const useCheckout = (menu: Menu | null) => {
    const { userData } = useAuth();
    const [quantity, setQuantity] = useState(1);
    const [selectedPackaging, setSelectedPackaging] = useState<Embalage[]>([]);
    const [selectedDrinks, setSelectedDrinks] = useState<Boisson[]>([]);
    const [delivery, setDelivery] = useState<Livraison>(new Livraison(false, 0));

    // Prix par défaut pour les options (peuvent être dynamiques si API dispo)
    const availablePackaging = useMemo(() => [
        new Embalage('Sac plastique', 100),
        new Embalage('Gamelle', 150),
    ], []);

    const availableDrinks = useMemo(() => [
        new Boisson('Coca Cola', 600),
        new Boisson('Djino', 700),
        new Boisson('Top Pamplemousse', 500),
        new Boisson('Planete Cocktail', 600),
        new Boisson('Vinto', 700),
    ], []);

    const availableHours = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00'];

    const calculateTotal = useCallback(() => {
        if (!menu) return 0;
        const basePrice = menu.prix1 * quantity;
        const packagingPrice = selectedPackaging.reduce((acc, p) => acc + p.prix, 0) * quantity;
        const drinksPrice = selectedDrinks.reduce((acc, d) => acc + d.prix, 0);
        const deliveryPrice = delivery.statut ? (delivery.type === 'express' ? 1000 : 500) : 0;
        return basePrice + packagingPrice + drinksPrice + deliveryPrice;
    }, [menu, quantity, selectedPackaging, selectedDrinks, delivery]);

    const createOrder = (): Partial<Commande> | null => {
        if (!menu || !userData) return null;

        return {
            uidUser: userData?.infos?.uid,
            idFastFood: '1', // Devrait être dynamique
            menu,
            quantite: quantity,
            embalage: selectedPackaging,
            boisson: selectedDrinks[0] || new Boisson('Aucune', 0), // Type compatible avec Commande existante
            livraison: delivery,
            prixTotal: calculateTotal(),
            staut: 'pendingToBuy',
            isBuy: false,
            ispending: true,
        };
    };

    return {
        quantity, setQuantity,
        selectedPackaging, setSelectedPackaging,
        selectedDrinks, setSelectedDrinks,
        delivery, setDelivery,
        availablePackaging,
        availableDrinks,
        availableHours,
        total: calculateTotal(),
        createOrder,
    };
};
