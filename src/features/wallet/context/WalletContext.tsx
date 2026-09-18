import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { walletService } from '../services/walletService';
import { useAuth } from '../../auth/context/AuthContext';
import { Transaction } from '@/src/types';
import { useResetOnUserChange } from '@/src/hooks/useResetOnUserChange';
import { useLazyFetch } from '@/src/hooks/useLazyFetch';

interface WalletContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: (showLoading?: boolean) => Promise<void>;
  /** Declenche le premier chargement. A appeler au montage de l'ecran. */
  ensureLoaded: () => void;
  /** `false` tant que la donnee n'a jamais ete chargee → afficher un squelette. */
  loaded: boolean;
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

  // Premier chargement DIFFERE : la page portefeuille appelle `ensureLoaded()`
  // a son montage. Fetcher ici partait sous le splash, pour un ecran que
  // beaucoup d'utilisateurs n'ouvrent jamais.
  const { ensureLoaded, loaded, reset } = useLazyFetch(fetchData, !!userId);

  // Changement de compte : le portefeuille du compte precedent est vide.
  useResetOnUserChange(userId, () => {
    setTransactions([]);
    setError(null);
    reset();
  });

  const upsertTransactionFromSocket = useCallback((transaction: any) => {
    if (!transaction?.id) return;
    // ⚠️ Rien n'a encore ete charge : inserer ici donnerait une liste d'UNE
    // transaction, que l'ecran afficherait comme si c'etait tout l'historique.
    // L'event est sans danger a ignorer — l'ouverture de l'ecran declenche
    // `ensureLoaded()`, qui ramene l'historique complet, celle-ci comprise.
    if (!loaded) return;
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.id === transaction.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...transaction };
        return next;
      }
      return [transaction, ...prev];
    });
  }, [loaded]);

  return (
    <WalletContext.Provider
      value={{
        transactions,
        loading,
        error,
        refresh: fetchData,
        ensureLoaded,
        loaded,
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
