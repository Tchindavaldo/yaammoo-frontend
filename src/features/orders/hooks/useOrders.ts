import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Config } from '../../../api/config';
import { useAuth } from '../../auth/context/AuthContext';
import { Commande } from '@/src/types';

export const useOrders = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState<Commande[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!userData) return;
        try {
            setLoading(true);
            setError(null);
            // Match Ionic endpoint: /order/user/all/${user.uid}
            const response = await axios.get(`${Config.apiUrl}/order/user/all/${userData?.infos?.uid}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.data && response.data.data) {
                setOrders(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    }, [userData]);

    const addOrder = async (orderData: Partial<Commande>) => {
        try {
            setLoading(true);
            const response = await axios.post(`${Config.apiUrl}/order/add`, orderData);
            if (response.data) {
                await fetchOrders();
                return true;
            }
        } catch (err) {
            console.error('Add order error:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteOrder = async (id: string) => {
        try {
            setOrders(prev => prev.filter(o => o.idCmd !== id));
            await axios.delete(`${Config.apiUrl}/order/delete/${id}`);
            return true;
        } catch (err) {
            console.error('Delete order error:', err);
            return false;
        }
    };

    const updateQuantity = async (id: string, newQty: number) => {
        try {
            setOrders(prev => prev.map(o => o.idCmd === id ? { ...o, quantite: newQty } : o));
            await axios.put(`${Config.apiUrl}/order/update/${id}`, { quantite: newQty });
            return true;
        } catch (err) {
            console.error('Update quantity error:', err);
            return false;
        }
    };

    // Ionic specific "Buy" transition (Buy individual items or group)
    const buyOrders = async (ordersToBuy: Commande[]) => {
        if (!userData) return false;
        try {
            setLoading(true);
            const ordersWithUserId = ordersToBuy.map(o => ({ ...o, userId: userData?.infos?.uid }));
            const response = await axios.put(`${Config.apiUrl}/order/tabs/${userData?.infos?.uid}`, ordersWithUserId);
            if (response.data) {
                await fetchOrders();
                return true;
            }
        } catch (err) {
            console.error('Buy orders error:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const getOrdersByStatus = (statusList: string[]) => {
        return orders.filter(o => statusList.includes(o.staut));
    };

    const orderStats = useMemo(() => {
        const counts = {
            total: orders.length,
            pending: getOrdersByStatus(['pending']).length,
            processing: getOrdersByStatus(['processing', 'active', 'in_progress']).length,
            finished: getOrdersByStatus(['finished', 'delivering']).length,
            delivered: getOrdersByStatus(['delivered']).length,
        };
        const amounts = {
            pending: getOrdersByStatus(['pending']).reduce((a, b) => a + b.prixTotal, 0),
            processing: getOrdersByStatus(['processing', 'active', 'in_progress']).reduce((a, b) => a + b.prixTotal, 0),
            finished: getOrdersByStatus(['finished', 'delivering']).reduce((a, b) => a + b.prixTotal, 0),
            delivered: getOrdersByStatus(['delivered']).reduce((a, b) => a + b.prixTotal, 0),
        };
        return { counts, amounts };
    }, [orders]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return {
        orders,
        loading,
        error,
        refresh: fetchOrders,
        addOrder,
        deleteOrder,
        updateQuantity,
        buyOrders,
        pendingToBuy: getOrdersByStatus(['pendingToBuy']),
        pending: getOrdersByStatus(['pending']),
        active: getOrdersByStatus(['processing', 'active', 'in_progress']),
        finished: getOrdersByStatus(['finished', 'delivering']),
        delivered: getOrdersByStatus(['delivered']),
        stats: orderStats
    };
};
