import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { driverService } from "../services/driverService";
import { useAuth } from "../../auth/context/AuthContext";
import { Commande } from "@/src/types";

/** Event socket sur une demande de livraison (création / décision / retrait). */
export type ApplicationEvent =
  // ── Côté candidat / livreur (destinataire = le user concerné) ──
  | { type: "created"; application: any }
  | { type: "decided"; application: any }
  // Le marchand a retiré le livreur de CETTE boutique (fastFoodId).
  | { type: "removed"; fastFoodId: string }
  // ── Échos vers le MARCHAND (sync multi-device de sa propre boutique) ──
  // Une demande a été décidée depuis un autre appareil marchand.
  | { type: "merchant_decided"; application: any }
  // Un livreur a été retiré depuis un autre appareil marchand.
  | { type: "merchant_driver_removed"; driverId: string };

type ApplicationHandler = (e: ApplicationEvent) => void;

interface DriverContextType {
  orders: Commande[];
  loading: boolean;
  error: string | null;
  refresh: (showLoading?: boolean) => Promise<void>;
  /** Transition de statut d'une commande déléguée (`delivering` | `finished`). */
  updateStatus: (orderId: string, status: string) => Promise<boolean>;
  /** Upsert socket d'une commande déléguée (assignation / mise à jour). */
  upsertOrderFromSocket: (order: any) => void;
  /** Upsert socket d'un lot de commandes. */
  upsertOrdersFromSocket: (orders: any[]) => void;
  // ── Bus d'events "demande de livraison" (temps réel) ──
  /** Appelé par useSocketEvents à réception d'un event demande. */
  notifyApplicationEvent: (e: ApplicationEvent) => void;
  /** Les modals s'abonnent tant qu'ils sont ouverts. */
  registerApplicationHandler: (h: ApplicationHandler) => void;
  unregisterApplicationHandler: (h: ApplicationHandler) => void;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driverId = userData?.driverId;

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (!driverId) return;
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const orderData = await driverService.getOrders(driverId);
        setOrders(orderData);
      } catch (err) {
        console.error("Driver fetch error:", err);
        setError("Erreur lors du chargement des commandes déléguées");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [driverId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (
    orderId: string,
    status: string,
  ): Promise<boolean> => {
    if (!driverId) return false;
    try {
      await driverService.updateOrderStatus(orderId, status, driverId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
      return true;
    } catch (err) {
      console.error("Driver failed to update status:", err);
      return false;
    }
  };

  // ── Injection socket : upsert sur le state local, sans requête ──
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

  // ── Bus d'events "demande de livraison" (temps réel) ──
  const appHandlersRef = useRef<Set<ApplicationHandler>>(new Set());
  const registerApplicationHandler = useCallback((h: ApplicationHandler) => {
    appHandlersRef.current.add(h);
  }, []);
  const unregisterApplicationHandler = useCallback((h: ApplicationHandler) => {
    appHandlersRef.current.delete(h);
  }, []);
  const notifyApplicationEvent = useCallback((e: ApplicationEvent) => {
    // Retrait d'une boutique : purge les commandes de ce fastFood du state
    // livreur (elles ne le concernent plus). Le reste est dispatché aux handlers.
    if (e.type === "removed") {
      setOrders((prev) => prev.filter((o) => o.fastFoodId !== e.fastFoodId));
    }
    appHandlersRef.current.forEach((h) => h(e));
  }, []);

  return (
    <DriverContext.Provider
      value={{
        orders,
        loading,
        error,
        refresh: fetchData,
        updateStatus,
        upsertOrderFromSocket,
        upsertOrdersFromSocket,
        notifyApplicationEvent,
        registerApplicationHandler,
        unregisterApplicationHandler,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};

export const useDriverContext = () => {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error("useDriverContext must be used within a DriverProvider");
  }
  return context;
};
