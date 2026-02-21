import { useState, useCallback } from 'react';
import { Menu, Commande, Embalage, Boisson, Livraison } from '../../../types';
import { useAuth } from '../../auth/context/AuthContext';

export const useCheckout = (menu: Menu | null) => {
    const { userData } = useAuth();
    const [quantity, setQuantity] = useState(1);
    const [selectedPackaging, setSelectedPackaging] = useState<Embalage[]>([]);
    const [selectedDrink, setSelectedDrink] = useState<Boisson>(new Boisson('Aucune', 0));
    const [delivery, setDelivery] = useState<Livraison>(new Livraison(false, 0));

    const calculateTotal = useCallback(() => {
        if (!menu) return 0;
        const basePrice = menu.prix1 * quantity;
        const packagingPrice = selectedPackaging.reduce((acc, p) => acc + p.prix, 0);
        const drinkPrice = selectedDrink.prix;
        const deliveryPrice = delivery.prix;
        return basePrice + packagingPrice + drinkPrice + deliveryPrice;
    }, [menu, quantity, selectedPackaging, selectedDrink, delivery]);

    const createOrder = (): Partial<Commande> | null => {
        if (!menu || !userData) return null;

        return {
            uidUser: userData.infos.uid,
            idFastFood: '1', // Should come from restaurant context
            menu,
            quantite: quantity,
            embalage: selectedPackaging,
            boisson: selectedDrink,
            livraison: delivery,
            prixTotal: calculateTotal(),
            staut: 'pendingToBuy',
            isBuy: false,
            ispending: true,
        };
    };

    return {
        quantity,
        setQuantity,
        selectedPackaging,
        setSelectedPackaging,
        selectedDrink,
        setSelectedDrink,
        delivery,
        setDelivery,
        total: calculateTotal(),
        createOrder,
    };
};
