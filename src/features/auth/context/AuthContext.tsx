import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/src/services/firebase';
import { storage } from '@/src/utils/storage';
import { Users } from '@/src/types';

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
        const stored = await storage.get('user_data');
        if (stored) setUserData(stored);
      } else {
        setUserData(null);
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
