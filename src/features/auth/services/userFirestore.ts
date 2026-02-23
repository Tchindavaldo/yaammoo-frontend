import axios from 'axios';
import { Config } from '@/src/api/config';
import { Users } from '@/src/types';

export const userFirestore = {
    async getUser(uid: string): Promise<Users | null> {
        try {
            const response = await axios.get(`${Config.apiUrl}/user/${uid}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const data = response.data.data;
            return data && data.infos ? data : null;
        } catch (error) {
            console.error('Error fetching user via API:', error);
            return null;
        }
    },

    async saveUser(user: Users, uid: string): Promise<void> {
        try {
            await axios.put(`${Config.apiUrl}/user/${uid}`, user, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
        } catch (error) {
            console.error('Error saving user via API:', error);
            throw error;
        }
    },

    async findUserByPhoneAndUid(phone: number, uid: string): Promise<Users | null> {
        // Direct access via Backend
        const user = await this.getUser(uid);
        if (user && user.infos.numero === phone) {
            return user;
        }
        return null;
    }
};
