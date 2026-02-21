import { useEffect } from 'react';
import { socketService } from './socket';
import { useAuth } from '../features/auth/context/AuthContext';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useOrders } from '../features/orders/hooks/useOrders';

export const useSocketEvents = () => {
    const { userData } = useAuth();
    const { refresh: refreshNotifications } = useNotifications();
    const { refresh: refreshOrders } = useOrders();
    const socket = socketService.getSocket();

    useEffect(() => {
        if (!userData || !socket) return;

        console.log('🔗 Initializing Socket Listeners...');

        const handleConnect = () => {
            console.log("🟢 Connected to socket with ID:", socket.id);
            if (userData.infos.uid) {
                socket.emit('join_user', userData.infos.uid);
                console.log(`📨 Joined user room: ${userData.infos.uid}`);
            }
        };

        if (socket.connected) {
            handleConnect();
        }

        socket.on('connect', handleConnect);
        socket.on('newUserOrder', (data) => {
            console.log('📥 New order received:', data);
            refreshOrders();
        });

        socket.on('userOrderUpdated', (data) => {
            console.log('🔄 Order updated:', data);
            refreshOrders();
        });

        // Fast Food Listeners
        socket.on('newFastfood', (data) => {
            console.log('🍔 New fastfood received:', data);
        });

        socket.on('updateFastFoods', (data) => {
            console.log('🍔 Fastfood updated:', data);
        });

        // Delivery Tracking
        socket.on('newPeriodKeyDelivering', (data) => {
            console.log('🚀 Delivery period started:', data.periodKey);
        });

        socket.on('removePeriodKeyDelivering', (data) => {
            console.log('✅ Delivery period completed:', data.periodKey);
        });

        // Notification Listeners
        socket.on('newNotification', (data) => {
            console.log('🔔 New notification received:', data);
            refreshNotifications();
        });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('newUserOrder');
            socket.off('userOrderUpdated');
            socket.off('newFastfood');
            socket.off('updateFastFoods');
            socket.off('newPeriodKeyDelivering');
            socket.off('removePeriodKeyDelivering');
            socket.off('newNotification');
        };
    }, [userData, socket]);
};
