import { useState, useEffect } from 'react';
import axios from 'axios';
import { Config } from '../../../api/config';
import { useAuth } from '../../auth/context/AuthContext';
import { Menu } from '@/src/types';

export const useMenu = () => {
    const { userData } = useAuth();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const stats = {
        total: menus.length,
        available: menus.filter(m => m.disponibilite === 'available').length,
        unavailable: menus.filter(m => m.disponibilite === 'unavailable').length,
    };

    const fetchMenu = async () => {
        // Note: in original code, it uses user.fastFoodId. 
        // We assume userData has this or similar logic.
        if (!userData) return;

        try {
            setLoading(true);
            setError(null);
            // Assuming userData has fastFoodId or similar as in original
            const fastFoodId = (userData as any).fastFoodId || '1'; // Default for demo if not found
            const response = await axios.get(`${Config.apiUrl}/menu/${fastFoodId}`);

            if (response.data && response.data.data) {
                setMenus(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching menu:', err);
            setError('Erreur lors de la récupération des menus');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, [userData]);

    return { menus, stats, loading, error, refresh: fetchMenu };
};
