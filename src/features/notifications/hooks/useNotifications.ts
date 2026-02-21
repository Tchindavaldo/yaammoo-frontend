import { useState, useEffect } from 'react';
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
}

export const useNotifications = () => {
    const { userData } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
        if (!userData) return;

        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${Config.apiUrl}/notifications/user/${userData.infos.uid}`);

            if (response.data && response.data.data) {
                setNotifications(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            setError('Erreur lors de la récupération des notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string, idGroup?: string) => {
        try {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            await axios.put(`${Config.apiUrl}/notifications/read/${id}`, { idGroup });
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, [userData]);

    return { notifications, loading, error, refresh: fetchNotifications, markAsRead };
};
