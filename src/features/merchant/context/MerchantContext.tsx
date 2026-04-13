import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { merchantService } from '../services/merchantService';
import { useAuth } from '../../auth/context/AuthContext';
import { Commande, Menu, Transaction } from '@/src/types';

interface MerchantContextType {
  orders: Commande[];
  menus: Menu[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: (showLoading?: boolean) => Promise<void>;
  updateStatus: (orderId: string, status: string) => Promise<void>;
  addMenu: (menu: Menu) => Promise<void>;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  };
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export const MerchantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Commande[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fastFoodId = userData?.fastFoodId;
  const userId = userData?.uid;

  const fetchData = useCallback(async (showLoading = true) => {
    if (!fastFoodId || !userId) return;

    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [orderData, menuData, transactionData] = await Promise.all([
        merchantService.getOrders(fastFoodId),
        merchantService.getMenus(fastFoodId),
        merchantService.getTransactions(userId),
      ]);
      setOrders(orderData);
      setMenus(menuData);
      setTransactions(transactionData);
    } catch (err) {
      console.error("Merchant fetch error:", err);
      setError("Erreur lors du chargement des données marchand");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [fastFoodId, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await merchantService.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o.idCmd === orderId || (o as any).id === orderId
            ? ({ ...o, staut: status, status: status } as any)
            : o,
        ),
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const addMenu = async (menuData: any) => {
    if (!fastFoodId) return;
    try {
      await merchantService.addMenu(fastFoodId, menuData);
      await fetchData();
    } catch (err) {
      console.error("Failed to add menu:", err);
      throw err;
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(
      (o) =>
        ((o as any).status || o.staut) === "pending" ||
        ((o as any).status || o.staut) === "pendingToBuy",
    ).length,
    completedOrders: orders.filter(
      (o) =>
        ((o as any).status || o.staut) === "completed" ||
        ((o as any).status || o.staut) === "finished",
    ).length,
    totalRevenue: orders
      .filter(
        (o) =>
          ((o as any).status || o.staut) === "completed" ||
          ((o as any).status || o.staut) === "finished",
      )
      .reduce((acc, o) => acc + ((o as any).total || o.prixTotal || 0), 0),
  };

  return (
    <MerchantContext.Provider
      value={{
        orders,
        menus,
        transactions,
        loading,
        error,
        refresh: fetchData,
        updateStatus,
        addMenu,
        stats,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
};

export const useMerchantContext = () => {
  const context = useContext(MerchantContext);
  if (context === undefined) {
    throw new Error('useMerchantContext must be used within a MerchantProvider');
  }
  return context;
};
