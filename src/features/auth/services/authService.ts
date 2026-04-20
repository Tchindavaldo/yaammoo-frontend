import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';

export const authService = {
    async getUserById(userId: string) {
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const response = await axios.get(`${Config.apiUrl}/user/${userId}`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Authorization': `Bearer ${idToken}`,
                }
            });
            const data = response.data.data;
            return data && data.infos ? data : null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }
};
