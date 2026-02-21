import { useState, useEffect } from 'react';
import axios from 'axios';
import { Config } from '../../../api/config';
import { useAuth } from '../../auth/context/AuthContext';
import { Commande } from '@/src/types';

export const useOrders = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState<Commande[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = async () => {
        if (!userData) return;

        try {
            setLoading(true);
            setError(null);
            // Assuming userData has uid
            const response = await axios.get(`${Config.apiUrl}/orders/user/${userData.infos.uid}`);

            if (response.data && response.data.data) {
                setOrders(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError('Erreur lors de la récupération des commandes');
        } finally {
            setLoading(false);
        }
    };

    const getOrdersByStatus = (status: string) => {
        return orders.filter(o => o.staut === status);
    };

    useEffect(() => {
        fetchOrders();
    }, [userData]);

    return {
        orders,
        loading,
        error,
        refresh: fetchOrders,
        pending: getOrdersByStatus('pendingToBuy'),
        active: getOrdersByStatus('active'),
        completed: getOrdersByStatus('completed')
    };
};
