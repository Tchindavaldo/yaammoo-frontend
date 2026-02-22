import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Config } from '../../../api/config';
import { useAuth } from '../../auth/context/AuthContext';

export interface Notification {
    id: string;
    titre: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    idGroup?: string;
    type?: string;
}

export const useNotifications = () => {
    const { userData } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!userData) return;

        try {
            setLoading(true);
            setError(null);
            // Match Ionic endpoint: /notification/user?userId=...
            const endpoint = (userData as any).fastFoodId !== undefined
                ? `/notification/user?userId=${userData?.infos?.uid}&fastFoodId=${(userData as any).fastFoodId}`
                : `/notification/user?userId=${userData?.infos?.uid}`;

            const response = await axios.get(`${Config.apiUrl}${endpoint}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            if (response.data && response.data.data) {
                setNotifications(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            setError('Erreur lors de la récupération des notifications');
        } finally {
            setLoading(false);
        }
    }, [userData]);

    const markAsRead = async (id: string, idGroup?: string) => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            // Match Ionic service: markNotificationAsRead
            await axios.put(`${Config.apiUrl}/notification/read/${id}`, { idGroup });
        } catch (err) {
            console.error('Error marking as read:', err);
            // Rollback if needed (optional)
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
        notifications,
        loading,
        error,
        refresh: fetchNotifications,
        markAsRead,
        unreadCount
    };
};
