import axios from 'axios';
import { Config } from '@/src/api/config';

export const authService = {
    async getUserById(userId: string) {
        try {
            const response = await axios.get(`${Config.apiUrl}/user/${userId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = response.data.data;
            return data && data.infos ? data : null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }
};
