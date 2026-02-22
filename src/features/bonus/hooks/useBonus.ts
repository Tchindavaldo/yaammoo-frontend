import { useState, useEffect } from 'react';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { useOrders } from '@/src/features/orders/hooks/useOrders';

export interface Bonus {
    id: string;
    type: 'welcome_bonus' | 'order_count_bonus' | 'discount_bonus';
    isFastFoodBonus: boolean;
    data: {
        name: string;
        description: string;
        value: number;
    };
    order_count: number; // palier de commande pour l'éligibilité
}

export const useBonus = () => {
    const { userData } = useAuth();
    const { orders } = useOrders();
    const [bonuses, setBonuses] = useState<Bonus[]>([]);
    const [loading, setLoading] = useState(false);
    const [postingId, setPostingId] = useState<string | null>(null);

    const paidOrders = orders.filter(o =>
        ['processing', 'pending', 'finished', 'completed'].includes(o.staut)
    );

    const fetchBonuses = async () => {
        if (!userData) return;
        try {
            setLoading(true);
            const response = await axios.get(`${Config.apiUrl}/bonus`);
            setBonuses(response.data.data || []);
        } catch (error) {
            console.error('Erreur bonus:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBonusEligibility = (palier: number, type: string) => {
        const total = paidOrders.length;
        const restant = palier - (total % palier);
        const eligible = total % palier === 0 && total > 0;
        const totalBonus = Math.floor(total / palier);

        return {
            eligible: type === 'welcome_bonus' ? true : eligible,
            restant: eligible ? 0 : restant,
            totalBonus: type === 'welcome_bonus' ? 0 : totalBonus
        };
    };

    const claimBonus = async (bonusId: string, bonusType: string, totalBonus: number) => {
        if (!userData) return;
        try {
            setPostingId(bonusId);
            const total = bonusType === 'welcome_bonus' ? 0 : totalBonus;
            await axios.post(`${Config.apiUrl}/bonus-request`, {
                bonusId,
                bonusType,
                userId: userData?.infos?.uid,
                total,
            });
            return true;
        } catch (error: any) {
            console.error('Erreur claim bonus:', error);
            throw new Error(error.response?.data?.message || 'Erreur lors de la demande de bonus');
        } finally {
            setPostingId(null);
        }
    };

    useEffect(() => {
        fetchBonuses();
    }, [userData]);

    return {
        bonuses,
        loading,
        postingId,
        paidOrderCount: paidOrders.length,
        getBonusEligibility,
        claimBonus,
        refresh: fetchBonuses,
    };
};
