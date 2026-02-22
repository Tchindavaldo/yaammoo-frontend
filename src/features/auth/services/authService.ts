import axios from 'axios';
import { Config } from '@/src/api/config';
import { jsonToUser } from '../utils/userMappers';

export const authService = {
    async getUserById(userId: string) {
        try {
            const response = await axios.get(`${Config.apiUrl}/user/${userId}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = response.data.data;
            return data && data.user ? jsonToUser(data.user) : null;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }
};
