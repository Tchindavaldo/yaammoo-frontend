import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import axios from "axios";
import { Config } from "../../../api/config";
import { useAuth } from "../../auth/context/AuthContext";
import { Commande } from "@/src/types";
import { sanitizeOrder } from "../utils/sanitizeOrder";

interface OrderContextType {
  orders: Commande[];
  loading: boolean;
  error: string | null;
  refresh: (quiet?: boolean) => Promise<void>;
  addOrder: (orderData: any) => Promise<{ success: boolean; message?: string }>;
  deleteOrder: (id: string) => Promise<boolean>;
  updateQuantity: (id: string, newQty: number) => Promise<boolean>;
  updateLocalOrder: (updatedOrder: any) => void;
  buyOrders: (ordersToBuy: Commande[]) => Promise<{ success: boolean; message?: string }>;
  pendingToBuy: Commande[];
  pending: Commande[];
  active: Commande[];
  finished: Commande[];
  delivered: Commande[];
  stats: {
    counts: { total: number; pending: number; processing: number; finished: number; delivered: number };
    amounts: { pending: number; processing: number; finished: number; delivered: number };
  };
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!userData) return;
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const response = await axios.get(
        `${Config.apiUrl}/order/user/all/${userData?.uid}`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );
      if (response.data && response.data.data) {
        setOrders(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      if (!quiet) setError("Erreur réseau");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (userData) {
      fetchOrders(true); // Quiet initial load
    }
  }, [userData, fetchOrders]);

  const addOrder = async (orderData: any): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${Config.apiUrl}/order`, orderData);
      if (response.data) {
        await fetchOrders();
        return { success: true };
      }
      return { success: false, message: "Erreur lors de la création." };
    } catch (err: any) {
      console.error("Add order error:", err);
      const backendMessage = err.response?.data?.message;
      return {
        success: false,
        message: Array.isArray(backendMessage) ? backendMessage.join('; ') : backendMessage || "Erreur réseau"
      };
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await axios.put(`${Config.apiUrl}/order`, { id, status: "cancelByUser" });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      return true;
    } catch (err) {
      console.error("Delete order error:", err);
      return false;
    }
  };

  const updateQuantity = async (id: string, newQty: number) => {
    try {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, quantity: newQty } : o))
      );
      await axios.put(`${Config.apiUrl}/order`, { id, quantity: newQty });
      return true;
    } catch (err) {
      console.error("Update quantity error:", err);
      fetchOrders(); // Rollback
      return false;
    }
  };

  const updateLocalOrder = useCallback((updatedOrder: any) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
      )
    );
  }, []);

  const buyOrders = async (ordersToBuy: Commande[]): Promise<{ success: boolean; message?: string }> => {
    if (!userData) return { success: false, message: "Utilisateur non connecté" };
    try {
      setLoading(true);
      const ordersWithUserId = ordersToBuy.map((o) => sanitizeOrder(o, userData?.uid));
      const response = await axios.put(
        `${Config.apiUrl}/order/tabs/${userData?.uid}`,
        ordersWithUserId
      );
      if (response.data) {
        await fetchOrders();
        return { success: true };
      }
      return { success: false, message: "Erreur lors de la validation des commandes" };
    } catch (err: any) {
      console.error("Buy orders error:", err);
      const backendMessage = err.response?.data?.message;
      return {
        success: false,
        message: Array.isArray(backendMessage) ? backendMessage.join('; ') : backendMessage || "Erreur réseau"
      };
    } finally {
      setLoading(false);
    }
  };

  const rankedStatuses = ["pending", "processing", "active", "in_progress", "accept"];

  const getFilteredByStatus = useCallback((statusList: string[]) => {
    const filtered = orders.filter((o) =>
      statusList.includes((o.status || "").toLowerCase())
    );
    const needsRankSort = statusList.some(s => rankedStatuses.includes(s));
    if (needsRankSort) {
      return [...filtered].sort((a, b) => {
        const ra = (a as any).rank ?? Infinity;
        const rb = (b as any).rank ?? Infinity;
        return ra - rb;
      });
    }
    return filtered;
  }, [orders]);

  const stats = useMemo(() => {
    const s = (list: string[]) => getFilteredByStatus(list);
    const total = (list: string[]) => s(list).reduce((a, b) => a + (b.total || 0), 0);

    return {
      counts: {
        total: orders.length,
        pending: s(["pending"]).length,
        processing: s(["processing", "active", "in_progress", "accept"]).length,
        finished: s(["finished", "delivering"]).length,
        delivered: s(["delivered"]).length,
      },
      amounts: {
        pending: total(["pending"]),
        processing: total(["processing", "active", "in_progress", "accept"]),
        finished: total(["finished", "delivering"]),
        delivered: total(["delivered"]),
      }
    };
  }, [orders, getFilteredByStatus]);

  const value = {
    orders,
    loading,
    error,
    refresh: fetchOrders,
    addOrder,
    deleteOrder,
    updateQuantity,
    updateLocalOrder,
    buyOrders,
    pendingToBuy: getFilteredByStatus(["pendingtobuy"]),
    pending: getFilteredByStatus(["pending"]),
    active: getFilteredByStatus(["processing", "active", "in_progress", "accept"]),
    finished: getFilteredByStatus(["finished", "delivering"]),
    delivered: getFilteredByStatus(["delivered"]),
    stats,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrdersContext = () => {
    const context = useContext(OrderContext);
    if (!context) throw new Error("useOrdersContext must be used within OrderProvider");
    return context;
};
