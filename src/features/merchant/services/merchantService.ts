import axios from 'axios';
import { Config } from '@/src/api/config';
import { Commande, Menu, Transaction } from '@/src/types';

export const merchantService = {
    async getTransactions(userId: string): Promise<Transaction[]> {
        try {
            const response = await axios.get(`${Config.apiUrl}/transaction/${userId}`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    },
    async getOrders(fastFoodId: string): Promise<Commande[]> {
        try {
            const response = await axios.get(`${Config.apiUrl}/order/all/${fastFoodId}`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error fetching merchant orders:', error);
            throw error;
        }
    },

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        try {
            await axios.put(`${Config.apiUrl}/order/status/${orderId}`, { status });
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        }
    },

    async getMenus(fastFoodId: string): Promise<Menu[]> {
        try {
            const response = await axios.get(`${Config.apiUrl}/menu/${fastFoodId}`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error fetching merchant menus:', error);
            throw error;
        }
    },

    async addMenu(fastFoodId: string, menu: Menu): Promise<void> {
        try {
            await axios.post(`${Config.apiUrl}/menu/add`, { ...menu, fastFoodId });
        } catch (error) {
            console.error('Error adding menu:', error);
            throw error;
        }
    }
};
