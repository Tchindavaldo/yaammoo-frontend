import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import axios from "axios";
import { Config } from "../../../api/config";
import { useAuth } from "../../auth/context/AuthContext";
import { Commande } from "@/src/types";
import { sanitizeOrder } from "../utils/sanitizeOrder";
import { useResetOnUserChange } from "@/src/hooks/useResetOnUserChange";
import { useLazyFetch } from "@/src/hooks/useLazyFetch";

/** Cache des commandes, pour un badge panier juste des la premiere frame. */
const ORDERS_CACHE_KEY = "orders_cache";

interface OrderContextType {
  orders: Commande[];
  loading: boolean;
  /**
   * Un refetch des commandes est en cours (retour dans l'app, pull-to-refresh).
   * ⚠️ Distinct de `loading`, que levent AUSSI `addOrder` et `buyOrders` : s'y
   * fier pour masquer l'ecran le ferait clignoter pendant un ajout au panier.
   */
  refreshing: boolean;
  /** Declenche le premier chargement. Appele par le home. */
  ensureLoaded: () => void;
  error: string | null;
  /** Renvoie `false` en cas d'echec (voir `useLazyFetch`). */
  refresh: (quiet?: boolean) => Promise<void | boolean>;
  addOrder: (orderData: any) => Promise<{ success: boolean; message?: string }>;
  deleteOrder: (id: string) => Promise<boolean>;
  updateQuantity: (id: string, newQty: number) => Promise<boolean>;
  updateLocalOrder: (updatedOrder: any) => void;
  /** Insère ou met à jour une commande depuis un payload socket (newUserOrder / userOrderUpdated). */
  upsertOrderFromSocket: (order: any) => void;
  /** Insère ou met à jour un lot de commandes depuis un payload socket (userOrdersUpdated). */
  upsertOrdersFromSocket: (orders: any[]) => void;
  buyOrders: (ordersToBuy: Commande[]) => Promise<{ success: boolean; message?: string }>;
  /** Enregistre une commande du panier sans l'acheter (PUT /order). */
  saveOrder: (order: any) => Promise<{ success: boolean; message?: string }>;
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

  /**
   * Rafraichissement declenche par le RETOUR dans l'app, distinct de `loading`.
   *
   * ⚠️ `loading` est aussi leve par `addOrder` et `buyOrders` : s'en servir pour
   * afficher le skeleton plein ecran masquerait toute la page pendant un ajout
   * au panier ou un achat. Il faut donc un etat propre a ce cas.
   */
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Une donnee FRAICHE (serveur ou socket) est deja arrivee : l'hydratation
   * storage, asynchrone, ne doit plus ecraser le state — sinon la liste
   * s'affiche puis disparait, remplacee par un cache perime.
   */
  const hasFreshDataRef = useRef(false);

  /**
   * Hydratation depuis le cache au montage, pour un affichage instantane.
   *
   * ⚠️ Sans elle, le badge du panier affichait 0 au demarrage puis sautait a sa
   * vraie valeur a l'arrivee de la reponse. Le fetch ayant ete deplace du splash
   * vers le home, ce trou serait devenu visible a chaque lancement.
   */
  useEffect(() => {
    (async () => {
      const cached = await storage.get(ORDERS_CACHE_KEY);
      if (!hasFreshDataRef.current && Array.isArray(cached) && cached.length > 0) {
        setOrders(cached);
      }
    })();
  }, []);

  const persistCache = useCallback(async (list: Commande[]) => {
    try {
      await storage.set(ORDERS_CACHE_KEY, list);
    } catch {
      // Un cache non ecrit n'est pas une erreur a remonter : la prochaine
      // reponse serveur fait foi.
    }
  }, []);

  const fetchOrders = useCallback(async (quiet = false) => {
    // Rien n'a ete charge : `false` pour que la demande reste rearmee.
    if (!userData) return false;
    try {
      if (!quiet) {
        setLoading(true);
        // Signale un rafraichissement des commandes, par opposition a un
        // `addOrder` / `buyOrders` qui levent aussi `loading` : l'ecran peut
        // ainsi afficher son skeleton SANS le faire pendant un ajout au panier.
        setRefreshing(true);
      }
      setError(null);
      const response = await axios.get(
        `${Config.apiUrl}/order/user/all/${userData?.uid}`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
      );
      if (response.data && response.data.data) {
        hasFreshDataRef.current = true;
        setOrders(response.data.data);
        void persistCache(response.data.data);
      }
      return true;
    } catch (err: any) {
      console.error("Error fetching orders:", err);
      if (!quiet) setError("Erreur réseau");
      // `false` rearme `useLazyFetch` : le prochain passage sur une page de
      // commandes relancera le chargement au lieu de rester sur l'erreur.
      return false;
    } finally {
      if (!quiet) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userData, persistCache]);

  // Changement de compte / deconnexion : on vide AVANT tout refetch. Sinon les
  // commandes de l'ancien compte restent affichees, le fetch sortant tot tant
  // qu'il n'y a pas d'uid.
  //
  // ⚠️ Le cache n'est pas indexe par compte : sans purge, le compte suivant
  // s'hydraterait avec les commandes du precedent au montage.
  useResetOnUserChange(userData?.uid, () => {
    hasFreshDataRef.current = false;
    setOrders([]);
    setError(null);
    storage.remove(ORDERS_CACHE_KEY).catch(() => {});
  });

  // Premier chargement DIFFERE, declenche par le HOME : sous le splash, seules
  // `/fastFood/all` et `/settings/app-version` ont le droit de partir. Le badge
  // du panier tient sur le cache en attendant.
  const { ensureLoaded } = useLazyFetch(
    () => fetchOrders(true),
    !!userData,
  );

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

  /**
   * Enregistre les modifications d'une commande du panier SANS l'acheter :
   * `PUT /order` (mise à jour simple), contrairement à `buyOrders` qui passe par
   * `/order/tabs` et déclenche la transition `pendingToBuy → pending`.
   * Le `status` n'est jamais envoyé — la commande reste dans le panier.
   */
  const saveOrder = async (
    order: any,
  ): Promise<{ success: boolean; message?: string }> => {
    if (!userData) return { success: false, message: "Utilisateur non connecté" };
    if (!order?.id) return { success: false, message: "Commande introuvable" };
    try {
      const { status, ...payload } = sanitizeOrder(order, userData.uid) as any;
      await axios.put(`${Config.apiUrl}/order`, { ...payload, id: order.id });
      await fetchOrders();
      return { success: true };
    } catch (err: any) {
      console.error("Save order error:", err);
      const backendMessage = err.response?.data?.message;
      return {
        success: false,
        message: Array.isArray(backendMessage)
          ? backendMessage.join("; ")
          : backendMessage || "Erreur réseau",
      };
    }
  };

  const updateLocalOrder = useCallback((updatedOrder: any) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
      )
    );
  }, []);

  // Upsert : met à jour si la commande existe, sinon l'ajoute en tête.
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
    refreshing,
    error,
    refresh: fetchOrders,
    ensureLoaded,
    addOrder,
    deleteOrder,
    updateQuantity,
    updateLocalOrder,
    upsertOrderFromSocket,
    upsertOrdersFromSocket,
    buyOrders,
    saveOrder,
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
