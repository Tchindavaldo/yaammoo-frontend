import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/src/services/firebase';
import { storage } from '@/src/utils/storage';
import { Users } from '@/src/types';
import { userFirestore } from '../services/userFirestore';

interface AuthContextType {
  user: User | null;
  userData: Users | null;
  loading: boolean;
  setUserData: (data: Users | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoading(true);
        try {
          // 1. Try fetching from API (freshest data)
          const apiData = await userFirestore.getUser(firebaseUser.uid);
          if (apiData) {
            setUserData(apiData);
            await storage.set('user_data', apiData);
          } else {
            // 2. Fallback to stored data if API fails or returns null
            const stored = await storage.get('user_data');
            if (stored) setUserData(stored);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          const stored = await storage.get('user_data');
          if (stored) setUserData(stored);
        }
      } else {
        setUserData(null);
        await storage.remove('user_data');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleUpdateUserData = async (data: Users | null) => {
    setUserData(data);
    if (data) {
      await storage.set('user_data', data);
    } else {
      await storage.remove('user_data');
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, setUserData: handleUpdateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
