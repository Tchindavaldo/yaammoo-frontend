import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
    getReactNativePersistence,
    Auth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Config } from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Initialize Firebase
const app: FirebaseApp = getApps().length === 0 ? initializeApp(Config.firebaseConfig) : getApp();

/**
 * Initialize Auth with persistence for React Native
 * We use a try-catch to avoid "auth/already-initialized" errors during Hot Reload
 */
const getFirebaseAuth = (firebaseApp: FirebaseApp): Auth => {
    if (Platform.OS === 'web') {
        return getAuth(firebaseApp);
    }

    try {
        // On React Native, try to initialize with persistence
        // If it fails because it's already initialized, getAuth will return the existing instance
        return initializeAuth(firebaseApp, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch (error: any) {
        if (error.code === 'auth/already-initialized') {
            return getAuth(firebaseApp);
        }
        // For other errors, fallback to default getAuth
        console.warn("Firebase Auth initialization warning:", error.message);
        return getAuth(firebaseApp);
    }
};

const auth = getFirebaseAuth(app);
const db = getFirestore(app);

export { auth, db };
