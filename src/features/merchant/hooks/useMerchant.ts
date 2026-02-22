import { useState, useEffect, useCallback } from 'react';
import { merchantService } from '../services/merchantService';
import { useAuth } from '../../auth/context/AuthContext';
import { Commande, Menu, Transaction } from '@/src/types';

export const useMerchant = () => {
    const { userData } = useAuth();
    const [orders, setOrders] = useState<Commande[]>([]);
    const [menus, setMenus] = useState<Menu[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fastFoodId = (userData as any)?.fastFoodId;
    const userId = userData?.infos?.uid;

    const fetchData = useCallback(async () => {
        if (!fastFoodId || !userId) return;

        setLoading(true);
        setError(null);
        try {
            const [orderData, menuData, transactionData] = await Promise.all([
                merchantService.getOrders(fastFoodId),
                merchantService.getMenus(fastFoodId),
                merchantService.getTransactions(userId)
            ]);
            setOrders(orderData);
            setMenus(menuData);
            setTransactions(transactionData);
        } catch (err) {
            setError('Erreur lors du chargement des données marchand');
        } finally {
            setLoading(false);
        }
    }, [fastFoodId, userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await merchantService.updateOrderStatus(orderId, status);
            setOrders(prev => prev.map(o => o.idCmd === orderId ? { ...o, staut: status } : o));
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const addMenu = async (menu: Menu) => {
        if (!fastFoodId) return;
        try {
            await merchantService.addMenu(fastFoodId, menu);
            await fetchData();
        } catch (err) {
            console.error('Failed to add menu:', err);
            throw err;
        }
    };

    return {
        orders,
        menus,
        transactions,
        loading,
        error,
        refresh: fetchData,
        updateStatus,
        addMenu,
        stats: {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.staut === 'pending').length,
            completedOrders: orders.filter(o => o.staut === 'completed').length,
            totalRevenue: orders
                .filter(o => o.staut === 'completed')
                .reduce((acc, o) => acc + o.prixTotal, 0),
        }
    };
};
