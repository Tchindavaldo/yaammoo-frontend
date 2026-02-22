import { useEffect } from 'react';
import { socketService } from './socket';
import { useAuth } from '../features/auth/context/AuthContext';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import { useOrders } from '../features/orders/hooks/useOrders';
import { useMerchant } from '../features/merchant/hooks/useMerchant';

export const useSocketEvents = () => {
    const { userData } = useAuth();
    const { refresh: refreshNotifications } = useNotifications();
    const { refresh: refreshOrders } = useOrders();
    const { refresh: refreshMerchant } = useMerchant();
    const socket = socketService.getSocket();

    useEffect(() => {
        if (!userData || !socket) return;

        const handleConnect = () => {
            console.log("🟢 Connected to socket:", socket.id);
            // Ionic event: join_user
            socket.emit('join_user', userData?.infos?.uid);
            console.log(`📨 Joined user room: ${userData?.infos?.uid}`);
        };

        if (socket.connected) handleConnect();

        socket.on('connect', handleConnect);

        // User Order Events (Identical to UserOrderSocketService)
        socket.on('newUserOrder', (data) => {
            console.log('📥 newUserOrder:', data);
            refreshOrders();
        });
        socket.on('newUserOrders', (data) => {
            console.log('📦 newUserOrders:', data);
            refreshOrders();
        });
        socket.on('userOrderUpdated', (data) => {
            console.log('🔄 userOrderUpdated:', data);
            refreshOrders();
        });

        // Merchant Order Events (Identical to FastFoodOrderSocketService)
        socket.on('newFastFoodOrder', (data) => {
            console.log('🍔 newFastFoodOrder:', data);
            refreshMerchant();
        });
        socket.on('newFastFoodOrders', (data) => {
            console.log('🍔 newFastFoodOrders:', data);
            refreshMerchant();
        });
        socket.on('fastFoodOrderUpdated', (data) => {
            console.log('🍔 fastFoodOrderUpdated:', data);
            refreshMerchant();
        });

        // Transaction Events
        socket.on('newTransaction', (data) => {
            console.log('💰 newTransaction:', data);
            refreshMerchant(); // Updates Wallet
        });

        // Notification Events
        socket.on('isRead', (data) => {
            console.log('📧 Notification isRead:', data);
            refreshNotifications();
        });
        socket.on('newNotification', (data) => {
            console.log('🔔 newNotification:', data);
            refreshNotifications();
        });

        // Delivery Tracking
        socket.on('newPeriodKeyDelivering', (data) => {
            console.log('🚀 Delivery period started:', data.periodKey);
        });
        socket.on('removePeriodKeyDelivering', (data) => {
            console.log('✅ Delivery period completed:', data.periodKey);
        });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('newUserOrder');
            socket.off('newUserOrders');
            socket.off('userOrderUpdated');
            socket.off('newFastFoodOrder');
            socket.off('newFastFoodOrders');
            socket.off('fastFoodOrderUpdated');
            socket.off('newTransaction');
            socket.off('isRead');
            socket.off('newNotification');
            socket.off('newPeriodKeyDelivering');
            socket.off('removePeriodKeyDelivering');
        };
    }, [userData, socket]);
};
