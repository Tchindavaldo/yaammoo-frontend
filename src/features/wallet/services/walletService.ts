import axios from 'axios';
import { Config } from '@/src/api/config';
import { Transaction } from '@/src/types';

export const walletService = {
    async getTransactions(userId: string): Promise<Transaction[]> {
        try {
            const response = await axios.get(`${Config.apiUrl}/transaction/${userId}`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error fetching wallet transactions:', error);
            throw error;
        }
    },
};
