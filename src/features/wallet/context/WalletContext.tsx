import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { walletService } from '../services/walletService';
import { useAuth } from '../../auth/context/AuthContext';
import { Transaction } from '@/src/types';

interface WalletContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: (showLoading?: boolean) => Promise<void>;
  /** newTransaction → upsert d'une transaction depuis le payload socket (pas de refetch). */
  upsertTransactionFromSocket: (transaction: any) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = userData?.uid;

  const fetchData = useCallback(async (showLoading = true) => {
    if (!userId) return;

    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await walletService.getTransactions(userId);
      setTransactions(data);
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setError('Erreur lors du chargement du portefeuille');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const upsertTransactionFromSocket = useCallback((transaction: any) => {
    if (!transaction?.id) return;
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === transaction.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...transaction };
        return next;
      }
      return [transaction, ...prev];
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        transactions,
        loading,
        error,
        refresh: fetchData,
        upsertTransactionFromSocket,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
