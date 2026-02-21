import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
    async set(key: string, value: any, secure = false) {
        const stringValue = JSON.stringify(value);
        if (secure) {
            await SecureStore.setItemAsync(key, stringValue);
        } else {
            await AsyncStorage.setItem(key, stringValue);
        }
    },

    async get(key: string, secure = false) {
        const value = secure
            ? await SecureStore.getItemAsync(key)
            : await AsyncStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },

    async remove(key: string, secure = false) {
        if (secure) {
            await SecureStore.deleteItemAsync(key);
        } else {
            await AsyncStorage.removeItem(key);
        }
    },

    async clear() {
        await AsyncStorage.clear();
    }
};
