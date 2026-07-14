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
  updateStatus: (orderId: string, status: string) => Promise<boolean>;
  /** Délègue une commande à un livreur (pose driverId, statut inchangé). */
  delegateOrder: (orderId: string, driverId: string) => Promise<boolean>;
  addMenu: (menu: Menu) => Promise<void>;
  // ── Injection directe depuis les payloads socket (pas de refetch) ──
  /** newFastFoodOrder / fastFoodOrderUpdated → upsert d'une commande. */
  upsertOrderFromSocket: (order: any) => void;
  /** newFastFoodOrders / fastFoodOrdersUpdated / ordersRankUpdated → upsert d'un lot. */
  upsertOrdersFromSocket: (orders: any[]) => void;
  /** newFastFoodMenu / newMenu / fastFoodMenuUpdated → upsert d'un menu. */
  upsertMenuFromSocket: (menu: any) => void;
  /** fastFoodMenuDeleted → retire un menu. */
  removeMenuFromSocket: (menuId: string) => void;
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

  const updateStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      await merchantService.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status } : o,
        ),
      );
      return true;
    } catch (err) {
      console.error("Failed to update status:", err);
      return false;
    }
  };

  const delegateOrder = async (orderId: string, driverId: string): Promise<boolean> => {
    try {
      await merchantService.delegateOrder(orderId, driverId);
      // Patch local : pose driverId sur la commande (statut inchangé → reste
      // "En attente" côté marchand, avec le badge "Délégué").
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, driverId } as any : o)),
      );
      return true;
    } catch (err) {
      console.error("Failed to delegate order:", err);
      return false;
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

  // ── Injection socket : upsert/remove sur le state local, sans requête ──
  const upsertOrderFromSocket = useCallback((order: any) => {
    if (!order?.id) return;
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...order };
        return next;
      }
      return [order, ...prev];
    });
  }, []);

  const upsertOrdersFromSocket = useCallback((incoming: any[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setOrders((prev) => {
      const byId = new Map(prev.map((o) => [o.id, o]));
      for (const order of incoming) {
        if (!order?.id) continue;
        const existing = byId.get(order.id);
        byId.set(order.id, existing ? { ...existing, ...order } : order);
      }
      return Array.from(byId.values());
    });
  }, []);

  const upsertMenuFromSocket = useCallback((menu: any) => {
    if (!menu?.id) return;
    setMenus((prev) => {
      const idx = prev.findIndex((m) => (m as any).id === menu.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...menu };
        return next;
      }
      return [menu, ...prev];
    });
  }, []);

  const removeMenuFromSocket = useCallback((menuId: string) => {
    if (!menuId) return;
    setMenus((prev) => prev.filter((m) => (m as any).id !== menuId));
  }, []);

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(
      (o) => o.status === "pending"
    ).length,
    completedOrders: orders.filter(
      (o) => o.status === "completed" || o.status === "finished",
    ).length,
    totalRevenue: orders
      .filter(
        (o) => o.status === "completed" || o.status === "finished",
      )
      .reduce((acc, o) => acc + (o.total || 0), 0),
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
        delegateOrder,
        addMenu,
        upsertOrderFromSocket,
        upsertOrdersFromSocket,
        upsertMenuFromSocket,
        removeMenuFromSocket,
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
