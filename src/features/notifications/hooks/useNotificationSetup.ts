import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { userFirestore } from '@/src/features/auth/services/userFirestore';
import { storage } from '@/src/utils/storage';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const useNotificationSetup = () => {
    const { userData, setUserData } = useAuth();
    const router = useRouter();

    const registerForPushNotificationsAsync = async () => {
        let token;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('FCM Token:', token);

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    };

    const setup = async () => {
        if (!userData) return;

        const token = await registerForPushNotificationsAsync();
        if (token) {
            try {
                const userId = await storage.get('user_idx');
                if (userId && (userData as any).fcmToken !== token) {
                    const updatedUser = { ...userData };
                    (updatedUser as any).fcmToken = token;
                    await userFirestore.saveUser(updatedUser, userId.toString());
                    setUserData(updatedUser);
                }
            } catch (error) {
                console.error('Error saving FCM token:', error);
            }
        }

        const responseListener = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
            console.log('Notification clicked:', response);
            router.push('/(tabs)/notifications');
        });

        return () => {
            responseListener.remove();
        };
    };

    return { setup };
};
